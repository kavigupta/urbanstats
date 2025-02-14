import type_to_priority from './data/type_to_priority'
import { loadProtobuf } from './load_json'
import { DefaultMap } from './utils/DefaultMap'
import { bitap, bitapPerformance, bitCount, Haystack, toHaystack, toNeedle, toSignature } from './utils/bitap'
import { isHistoricalCD } from './utils/is_historical'
import { ISearchIndexMetadata, SearchIndex } from './utils/protos'

const debugSearch: boolean = false

function debug(arg: unknown): void {
    if (debugSearch) {
        // eslint-disable-next-line no-console -- Debug logging
        console.log(arg)
    }
}

function normalize(a: string): string {
    return a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f,\(\)\[\]]/g, '').replaceAll('-', ' ')
}

interface NormalizedSearchIndex {
    entries: {
        element: string
        tokens: Haystack[]
        priority: number
        signature: number
    }[]
    lengthOfLongestToken: number
    maxPriority: number
    mostTokens: number
}

interface SearchResult {
    element: string
    normalizedMatchScore: number // Lower is better ([0,1], where 0 is perfect match, and 1 is no matches)
    normalizedPopulationRank: number // Lower is higher population (better) ([0,1], where 0 is highest population and 1 is lowest population)
    normalizedPriority: number // Lower is better ([0,1] where 1 is least prioritized)
    normalizedPositionScore: number // The absolute difference in position where tokens were found. Lower is better ([0, 1] where 0 is all tokens are in the right place, and 1 is all tokens are maximally distant in this result)
    normalizedTokensWithIncompleteMatch: number // The number of tokens in the query that do NOT match "completely" (are the same length) with their tokens in the haystack. These matches may still have errors. ([0, 1], lower is better, where 0 means all tokens in the query match completely, and 1 means no tokens in the query match completely)
    normalizedTokenSwapOrOverlap: number // The number of search tokens that are out-of-order or overlap with another token when they are matched against the haystack tokens ([0, 1], where 0 is no tokens are swapped or overlapped, and 1 is all tokens are swapped or overlapped)
}

// Should sum to 1
const weights = {
    match: 1 / 3,
    position: 1 / 3,
    priority: 1 / 15,
    population: 2 / 15,
    incompleteMatches: 1 / 15,
    swapOverlap: 1 / 15,
}

function combinedScore(result: SearchResult): number {
    return (result.normalizedMatchScore * weights.match)
        + (result.normalizedPositionScore * weights.position)
        + (result.normalizedPriority * weights.priority)
        + (result.normalizedPopulationRank * weights.population)
        + (result.normalizedTokensWithIncompleteMatch * weights.incompleteMatches)
        + (result.normalizedTokenSwapOrOverlap * weights.swapOverlap)
}

function compareSearchResults(a: SearchResult, b: SearchResult): number {
    return combinedScore(a) - combinedScore(b)
}

function tokenize(pattern: string): string[] {
    const matchNoOverflow = /^ *([^ ]{1,31})(.*)$/.exec(pattern)
    if (matchNoOverflow !== null) {
        const [, token, rest] = matchNoOverflow
        return [token, ...tokenize(rest)]
    }

    return []
}

export interface SearchParams {
    unnormalizedPattern: string
    maxResults: number
    showHistoricalCDs: boolean
}

function search(searchIndex: NormalizedSearchIndex, { unnormalizedPattern, maxResults, showHistoricalCDs }: SearchParams): string[] {
    const start = performance.now()

    const pattern = normalize(unnormalizedPattern)

    if (pattern === '') {
        return []
    }

    let longestPatternToken = 0
    const patternTokens = tokenize(pattern).map((token) => {
        longestPatternToken = Math.max(longestPatternToken, token.length)
        return toNeedle(token)
    })

    const results: SearchResult[] = []

    const maxErrors = 2
    const maxMatchScore = patternTokens.length * (maxErrors + 1)
    const maxPositionScore = patternTokens.length * Math.max(patternTokens.length, searchIndex.lengthOfLongestToken)

    const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(longestPatternToken + maxErrors + 1))

    bitapPerformance.numBitapSignatureChecks = 0
    bitapPerformance.numBitapSignatureSkips = 0

    const patternSignature = toSignature(pattern)

    let entriesPatternSkips = 0
    let entriesPatternChecks = 0

    entries: for (const [populationRank, { tokens, element, priority, signature }] of searchIndex.entries.entries()) {
        if (!showHistoricalCDs && isHistoricalCD(element)) {
            continue
        }

        entriesPatternChecks++
        if (bitCount(patternSignature ^ (patternSignature & signature)) > maxErrors) {
            // This element doesn't have the correct letters to match this pattern
            entriesPatternSkips++
            continue
        }

        const normalizedPopulationRank = (populationRank / searchIndex.entries.length)

        // If this entry wouldn't make it into the results even with a perfect match because of priority or population, continue
        if (results.length === maxResults && compareSearchResults({
            element,
            normalizedMatchScore: 0,
            normalizedPositionScore: 0,
            normalizedPriority: priority / searchIndex.maxPriority,
            normalizedPopulationRank,
            normalizedTokensWithIncompleteMatch: 0,
            normalizedTokenSwapOrOverlap: 0,
        }, results[results.length - 1]) > 0) {
            continue
        }

        let matchScore = 0
        let positionScore = 0
        let incompleteMatches = 0

        let prevEntryTokenIndex = -1
        let numSwapsOverlaps = 0

        for (const [patternTokenIndex, needle] of patternTokens.entries()) {
            let tokenMatchScore = maxErrors + 1
            let tokenPositionScore = Math.max(patternTokens.length, searchIndex.lengthOfLongestToken)
            let tokenIncompleteMatch = true
            let tokenEntryTokenIndex: undefined | number

            for (const [entryTokenIndex, entryToken] of tokens.entries()) {
                const searchResult = bitap(entryToken, needle, maxErrors, bitapBuffers)
                const positionResult = Math.abs(patternTokenIndex - entryTokenIndex)
                const incompleteMatchResult = Math.abs(entryToken.haystack.length - needle.length) - searchResult !== 0
                if (searchResult < tokenMatchScore || (searchResult <= tokenMatchScore && positionResult < tokenPositionScore) || (searchResult <= tokenMatchScore && positionResult <= tokenPositionScore && incompleteMatchResult < tokenIncompleteMatch)) {
                    tokenMatchScore = searchResult
                    tokenPositionScore = positionResult
                    tokenIncompleteMatch = incompleteMatchResult
                    tokenEntryTokenIndex = entryTokenIndex
                }
            }

            matchScore += tokenMatchScore
            positionScore += tokenPositionScore
            incompleteMatches += tokenIncompleteMatch ? 1 : 0
            if (tokenEntryTokenIndex !== undefined) {
                numSwapsOverlaps += prevEntryTokenIndex >= tokenEntryTokenIndex ? 1 : 0
                prevEntryTokenIndex = tokenEntryTokenIndex
            }

            // If our match score is so high that we would not make it into the results, we can move on to the next entry
            if (results.length === maxResults && compareSearchResults({
                element,
                normalizedMatchScore: matchScore / maxMatchScore,
                normalizedPositionScore: positionScore / maxPositionScore,
                normalizedPriority: priority / searchIndex.maxPriority,
                normalizedPopulationRank,
                normalizedTokensWithIncompleteMatch: incompleteMatches / patternTokens.length,
                normalizedTokenSwapOrOverlap: numSwapsOverlaps / patternTokens.length,
            }, results[results.length - 1]) > 0) {
                continue entries
            }
        }

        if (matchScore >= patternTokens.length * (maxErrors + 1)) {
            // No match
            continue
        }

        const result: SearchResult = {
            element,
            normalizedMatchScore: matchScore / maxMatchScore,
            normalizedPositionScore: positionScore / maxPositionScore,
            normalizedPriority: priority / searchIndex.maxPriority,
            normalizedPopulationRank,
            normalizedTokensWithIncompleteMatch: incompleteMatches / patternTokens.length,
            normalizedTokenSwapOrOverlap: numSwapsOverlaps / patternTokens.length,
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

    debug(bitapPerformance)
    debug({ total: entriesPatternChecks, skips: entriesPatternSkips })

    debug(results.map(result => ({
        ...result,
        combinedScore: combinedScore(result),
    })))

    debug(`Took ${performance.now() - start} ms to execute search`)

    return results.map(result => result.element)
}

export async function createIndex(): Promise<(params: SearchParams) => string[]> {
    const start = performance.now()
    let rawIndex: SearchIndex | undefined = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
    const index = processRawSearchIndex(rawIndex)
    debug(`Took ${performance.now() - start}ms to load search index`)
    rawIndex = undefined // so it doesn't stay in memory
    return params => search(index, params)
}

function processRawSearchIndex(searchIndex: { elements: string[], metadata: ISearchIndexMetadata[] }): NormalizedSearchIndex {
    const start = performance.now()
    let lengthOfLongestToken = 0
    let maxPriority = 0
    let mostTokens = 0
    const priorities = searchIndex.metadata.map(({ type }) => type_to_priority[type!])
    const haystackCache = new DefaultMap<string, Haystack>((token) => {
        if (token.length > lengthOfLongestToken) {
            lengthOfLongestToken = token.length
        }
        return toHaystack(token)
    })
    const entries = searchIndex.elements.map((element, index) => {
        const normalizedElement = normalize(element)
        const entryTokens = tokenize(normalizedElement)
        const tokens = entryTokens.map(token => haystackCache.get(token))
        if (priorities[index] > maxPriority) {
            maxPriority = priorities[index]
        }
        if (tokens.length > mostTokens) {
            mostTokens = tokens.length
        }
        return {
            element,
            tokens,
            priority: priorities[index],
            signature: toSignature(normalizedElement),
        }
    })
    debug(`Took ${performance.now() - start}ms to process search index`)
    return { entries, lengthOfLongestToken, maxPriority, mostTokens }
}
