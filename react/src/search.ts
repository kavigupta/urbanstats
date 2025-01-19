import { loadProtobuf } from './load_json'
import { bitap, bitapPerformance, bitCount, Haystack, toHaystack, toNeedle, toSignature } from './utils/bitap'
import { isHistoricalCD } from './utils/is_historical'

function normalize(a: string): string {
    return a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f,\(\)]/g, '')
}

export interface NormalizedSearchIndex {
    entries: {
        element: string
        tokens: Haystack[]
        priority: number
        signature: number
    }[]
    lengthOfLongestToken: number
}

interface SearchResult {
    element: string
    matchScore: number // Lower is better
    populationRank: number // Lower is higher population (better)
    priority: number // Lower is better
    positionScore: number // The absolute difference in position where tokens were found. Lower is better
}

function compareSearchResults(a: SearchResult, b: SearchResult): number {
    // The order of these comparisons relates to various optimizations
    if (a.positionScore !== b.positionScore) {
        return a.positionScore - b.positionScore
    }
    if (a.matchScore !== b.matchScore) {
        return a.matchScore - b.matchScore
    }
    if (a.priority !== b.priority) {
        return a.priority - b.priority
    }
    return a.populationRank - b.populationRank
}

function tokenize(pattern: string): string[] {
    const matchNoOverflow = /^ *([^ ]{1,32})(.*)$/.exec(pattern)
    if (matchNoOverflow !== null) {
        const [, token, rest] = matchNoOverflow
        return [token, ...tokenize(rest)]
    }

    return []
}

// Expects `pattern` to be normalized
export function search(searchIndex: NormalizedSearchIndex, unnormalizedPattern: string, options: { showHistoricalCDs: boolean }): string[] {
    const pattern = normalize(unnormalizedPattern)

    if (pattern === '') {
        return []
    }

    const patternTokens = tokenize(pattern).map(token => toNeedle(token))

    const maxResults = 10
    const results: SearchResult[] = []

    const maxErrors = 2

    const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(searchIndex.lengthOfLongestToken + 2))

    bitapPerformance.numBitapSignatureChecks = 0
    bitapPerformance.numBitapSignatureSkips = 0

    const patternSignature = toSignature(pattern)

    let entriesPatternSkips = 0
    let entriesPatternChecks = 0

    entries: for (const [populationRank, { tokens, element, priority, signature }] of searchIndex.entries.entries()) {
        if (!options.showHistoricalCDs && isHistoricalCD(element)) {
            continue
        }

        entriesPatternChecks++
        // console.log({
        //     pattern: patternSignature.toString(2),
        //     entry: signature.toString(2),
        //     and: (patternSignature & signature).toString(2),
        //     diff: (patternSignature ^ (patternSignature & signature)).toString(2),
        //     bitCount: bitCount(patternSignature ^ (patternSignature & signature)),
        // })
        if (bitCount(patternSignature ^ (patternSignature & signature)) > maxErrors) {
            entriesPatternSkips++
            continue
        }

        // If this entry wouldn't make it into the results even with a perfect match because of priority or population, continue
        if (results.length === maxResults && compareSearchResults({ element, matchScore: 0, positionScore: 0, priority, populationRank }, results[results.length - 1]) > 0) {
            continue entries
        }

        let matchScore = 0
        let positionScore = 0

        for (const [patternTokenIndex, needle] of patternTokens.entries()) {
            let tokenMatchScore = maxErrors + 1
            let tokenPositionScore = 0

            search: for (const [entryTokenIndex, entryToken] of tokens.entries()) {
                const searchResult = bitap(entryToken, needle, maxErrors, bitapBuffers, patternTokenIndex === patternTokens.length - 1)
                const positionResult = Math.abs(patternTokenIndex - entryTokenIndex)
                if (searchResult < tokenMatchScore || (searchResult <= tokenMatchScore && positionResult < tokenPositionScore)) {
                    tokenMatchScore = searchResult
                    tokenPositionScore = positionResult
                }
            }

            matchScore += tokenMatchScore
            positionScore += tokenPositionScore

            // If our match score is so high that we would not make it into the results, we can move on to the next entry
            if (results.length === maxResults && compareSearchResults({ element, matchScore, positionScore, priority, populationRank }, results[results.length - 1]) > 0) {
                continue entries
            }
        }

        if (matchScore >= patternTokens.length * (maxErrors + 1)) {
            // No match
            continue
        }

        const result: SearchResult = {
            element,
            matchScore,
            positionScore,
            priority,
            populationRank,
        }

        let spliceIndex: number | undefined
        for (let resultsIndex = Math.min(results.length, maxResults); resultsIndex >= 0; resultsIndex--) {
            if (results.length <= resultsIndex || compareSearchResults(result, results[resultsIndex]) < 0) {
                spliceIndex = resultsIndex
            }
            else {
                break
            }
        }
        if (spliceIndex !== undefined) {
            results.splice(spliceIndex, 0, result)
        }
        if (results.length > maxResults) {
            results.pop()
        }
    }

    console.log(bitapPerformance)
    console.log({ total: entriesPatternChecks, skips: entriesPatternSkips })

    console.log(results)

    return results.map(result => result.element)
}

export async function loadSearchIndex(): Promise<NormalizedSearchIndex> {
    const searchIndex = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
    return processRawSearchIndex(searchIndex)
}

function processRawSearchIndex(searchIndex: { elements: string[], priorities: number[] }): NormalizedSearchIndex {
    const start = performance.now()
    let lengthOfLongestToken = 0
    const entries = searchIndex.elements.map((element, index) => {
        const normalizedElement = normalize(element)
        const tokens = tokenize(normalizedElement)
        const haystacks = tokens.map((token) => {
            if (token.length > lengthOfLongestToken) {
                lengthOfLongestToken = token.length
            }
            return toHaystack(token)
        })
        return {
            element,
            tokens: haystacks,
            priority: searchIndex.priorities[index],
            signature: toSignature(normalizedElement),
        }
    })
    console.log(`Took ${performance.now() - start}ms to process search index`)
    return { entries, lengthOfLongestToken }
}
