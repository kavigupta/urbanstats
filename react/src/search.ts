import * as idb from 'idb'

import type_to_priority from './data/type_to_priority'
import { loadProtobuf } from './load_json'
import { DefaultMap } from './utils/DefaultMap'
import { bitap, bitapPerformance, bitCount, Haystack, toHaystack, toNeedle, toSignature } from './utils/bitap'
import { isHistoricalCD } from './utils/is_historical'
import { ISearchIndexMetadata } from './utils/protos'

export interface SearchResult {
    longname: string
    typeIndex: number
}

const debugSearch: boolean = false

function debug(arg: unknown): void {
    if (debugSearch) {
        // eslint-disable-next-line no-console -- Debug logging
        console.log(arg)
    }
}

const debugSearchPerformance: boolean = false

export function debugPerformance(arg: unknown): void {
    if (debugSearchPerformance) {
        // eslint-disable-next-line no-console -- Debug logging
        console.log(arg)
    }
}

export function normalize(a: string, handlePunctuation = true): string {
    a = a.toLowerCase()
    a = a.normalize('NFD')
    a = a.replace(/[\u0300-\u036f]/g, '')
    if (handlePunctuation) {
        a = a.replace(/[,\(\)\[\]]/g, '')
        a = a.replaceAll('-', ' ')
    }
    return a
}

interface NormalizedSearchIndex {
    entries: {
        longname: string
        tokens: Haystack[]
        priority: number
        signature: number
        typeIndex: number
    }[]
    lengthOfLongestToken: number
    maxPriority: number
    mostTokens: number
}

interface Result {
    entry: NormalizedSearchIndex['entries'][number]
    normalizedMatchScore: number // Lower is better ([0,1], where 0 is perfect match, and 1 is no matches)
    normalizedPopulationRank: number // Lower is higher population (better) ([0,1], where 0 is highest population and 1 is lowest population)
    normalizedPriority: number // Lower is better ([0,1] where 1 is least prioritized)
    normalizedPositionScore: number // The absolute difference in position where tokens were found. Lower is better ([0, 1] where 0 is all tokens are in the right place, and 1 is all tokens are maximally distant in this result)
    normalizedTokensWithIncompleteMatch: number // The number of tokens in the query that do NOT match "completely" (are the same length) with their tokens in the haystack. These matches may still have errors. ([0, 1], lower is better, where 0 means all tokens in the query match completely, and 1 means no tokens in the query match completely)
    normalizedTokenSwapOrOverlap: number // The number of search tokens that are out-of-order or overlap with another token when they are matched against the haystack tokens ([0, 1], where 0 is no tokens are swapped or overlapped, and 1 is all tokens are swapped or overlapped)
    normalizedPriorityType: 1 | 0 // Is this a priority type? 0 if true
}

const weights = {
    match: 5,
    position: 5,
    priority: 1.6,
    population: 2,
    incompleteMatches: 1,
    swapOverlap: 1,
    priorityType: 0.4,
}

const sumOfWeights = Object.values(weights).reduce((total, value) => total + value, 0)
const normalizedWeights = Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / sumOfWeights]))

function combinedScore(result: Result): number {
    return (result.normalizedMatchScore * normalizedWeights.match)
        + (result.normalizedPositionScore * normalizedWeights.position)
        + (result.normalizedPriority * normalizedWeights.priority)
        + (result.normalizedPopulationRank * normalizedWeights.population)
        + (result.normalizedTokensWithIncompleteMatch * normalizedWeights.incompleteMatches)
        + (result.normalizedTokenSwapOrOverlap * normalizedWeights.swapOverlap)
        + (result.normalizedPriorityType * normalizedWeights.priorityType)
}

function compareSearchResults(a: Result, b: Result): number {
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
    prioritizeTypeIndex?: number
}

function search(searchIndex: NormalizedSearchIndex, { unnormalizedPattern, maxResults, showHistoricalCDs, prioritizeTypeIndex }: SearchParams): SearchResult[] {
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

    const results: Result[] = []

    const maxErrors = 2
    const maxMatchScore = patternTokens.length * (maxErrors + 1)
    const maxPositionScore = patternTokens.length * Math.max(patternTokens.length, searchIndex.lengthOfLongestToken)

    const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(longestPatternToken + maxErrors + 1))

    bitapPerformance.numBitapSignatureChecks = 0
    bitapPerformance.numBitapSignatureSkips = 0

    const patternSignature = toSignature(pattern)

    let entriesPatternSkips = 0
    let entriesPatternChecks = 0

    entries: for (const [populationRank, entry] of searchIndex.entries.entries()) {
        if (!showHistoricalCDs && isHistoricalCD(entry.typeIndex)) {
            continue
        }

        entriesPatternChecks++
        if (bitCount(patternSignature ^ (patternSignature & entry.signature)) > maxErrors) {
            // This element doesn't have the correct letters to match this pattern
            entriesPatternSkips++
            continue
        }

        const normalizedPopulationRank = (populationRank / searchIndex.entries.length)

        // If this entry wouldn't make it into the results even with a perfect match because of priority or population, continue
        if (results.length === maxResults && compareSearchResults({
            entry,
            normalizedMatchScore: 0,
            normalizedPositionScore: 0,
            normalizedPriority: entry.priority / searchIndex.maxPriority,
            normalizedPopulationRank,
            normalizedTokensWithIncompleteMatch: 0,
            normalizedTokenSwapOrOverlap: 0,
            normalizedPriorityType: entry.typeIndex === prioritizeTypeIndex ? 0 : 1,
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

            for (const [entryTokenIndex, entryToken] of entry.tokens.entries()) {
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
                entry,
                normalizedMatchScore: matchScore / maxMatchScore,
                normalizedPositionScore: positionScore / maxPositionScore,
                normalizedPriority: entry.priority / searchIndex.maxPriority,
                normalizedPopulationRank,
                normalizedTokensWithIncompleteMatch: incompleteMatches / patternTokens.length,
                normalizedTokenSwapOrOverlap: numSwapsOverlaps / patternTokens.length,
                normalizedPriorityType: entry.typeIndex === prioritizeTypeIndex ? 0 : 1,
            }, results[results.length - 1]) > 0) {
                continue entries
            }
        }

        if (matchScore >= patternTokens.length * (maxErrors + 1)) {
            // No match
            continue
        }

        const result: Result = {
            entry,
            normalizedMatchScore: matchScore / maxMatchScore,
            normalizedPositionScore: positionScore / maxPositionScore,
            normalizedPriority: entry.priority / searchIndex.maxPriority,
            normalizedPopulationRank,
            normalizedTokensWithIncompleteMatch: incompleteMatches / patternTokens.length,
            normalizedTokenSwapOrOverlap: numSwapsOverlaps / patternTokens.length,
            normalizedPriorityType: entry.typeIndex === prioritizeTypeIndex ? 0 : 1,
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

    debugPerformance(`Took ${performance.now() - start} ms to execute search`)

    return results.map(result => result.entry)
}

// Potentially cached
export async function createIndex(cacheKey: string | undefined): Promise<(params: SearchParams) => SearchResult[]> {
    let index: NormalizedSearchIndex | undefined
    try {
        if (cacheKey === undefined) {
            throw new Error('No cache key specified')
        }

        let checkpoint = performance.now()

        const db = await idb.openDB('SearchCache', 1, {
            upgrade(database) {
                database.createObjectStore('indexes')
            },
        })

        const store = db.transaction('indexes', 'readonly').objectStore('indexes')

        debugPerformance(`Took ${performance.now() - checkpoint}ms to open database`)
        checkpoint = performance.now()

        index = (await store.get(cacheKey)) as NormalizedSearchIndex | undefined

        debugPerformance(`Took ${performance.now() - checkpoint}ms to get index from cache`)
        checkpoint = performance.now()

        if (index === undefined) {
            debugPerformance('Cache miss')
            index = await createIndexNoCache()

            void (async () => {
                const writeStore = db.transaction('indexes', 'readwrite').objectStore('indexes')
                const keys = await writeStore.getAllKeys()
                await Promise.all(keys.map(k => writeStore.delete(k)))
                await writeStore.put(index, cacheKey)
            })()
        }
        else {
            debugPerformance('Cache hit')
        }
    }
    catch (error) {
        // This is going to fail during unit testing since we don't mock stuff
        console.warn('Getting cached search index failed', error)
        index = await createIndexNoCache()
    }
    return params => search(index, params)
}

async function createIndexNoCache(): Promise<NormalizedSearchIndex> {
    const rawIndex = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
    return processRawSearchIndex(rawIndex)
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
    const entries = searchIndex.elements.map((longname, index) => {
        const normalizedLongname = normalize(longname)
        const entryTokens = tokenize(normalizedLongname)
        const tokens = entryTokens.map(token => haystackCache.get(token))
        if (priorities[index] > maxPriority) {
            maxPriority = priorities[index]
        }
        if (tokens.length > mostTokens) {
            mostTokens = tokens.length
        }
        return {
            longname,
            tokens,
            priority: priorities[index],
            signature: toSignature(normalizedLongname),
            typeIndex: searchIndex.metadata[index].type!,
        }
    })
    debugPerformance(`Took ${performance.now() - start}ms to process search index`)
    return { entries, lengthOfLongestToken, maxPriority, mostTokens }
}

export async function getIndexCacheKey(): Promise<string | undefined> {
    try {
        const start = performance.now()
        // location is sometimes a worker
        const resources = ['/scripts/index.js', '/index/pages_all.gz', location.href]
        const etags = await Promise.all(resources.map(async (resource) => {
            const response = await fetch(resource, { method: 'HEAD' })
            if (!response.ok) {
                throw new Error(`${resource} is not OK`)
            }
            const etag = response.headers.get('etag')
            if (etag === null) {
                throw new Error(`${resource} does not have etag`)
            }
            return etag
        }))

        debugPerformance(`Took ${performance.now() - start} to get search cache key`)
        return etags.join(',')
    }
    catch (error) {
        console.warn('Getting search cache key failed', error)
        return undefined
    }
}
