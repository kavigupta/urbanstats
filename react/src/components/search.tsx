import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { loadProtobuf } from '../load_json'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'
import '../common.css'
import { DefaultMap } from '../utils/DefaultMap'

export function SearchBox(props: {
    onChange?: (inp: string) => void
    link: (inp: string) => ReturnType<Navigator['link']>
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
}): ReactNode {
    const colors = useColors()
    const [showHistoricalCDs] = useSetting('show_historical_cds')

    const [matches, setMatches] = useState<string[]>([])

    // Keep these in sync
    const [query, setQuery] = useState('')
    const normalizedQuery = useRef('')

    const [focused, setFocused] = React.useState(0)

    const searchQuery = normalizedQuery.current

    const fullIndex = useMemo(async () => {
        const searchIndex = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
        let lengthOfLongestNormalizedElement = 0
        const entries = searchIndex.elements.map((element, index) => {
            const normalizedElement = normalize(element)
            if (normalizedElement.length > lengthOfLongestNormalizedElement) {
                lengthOfLongestNormalizedElement = normalizedElement.length
            }
            return {
                element,
                normalizedElement,
                priority: searchIndex.priorities[index],
            }
        })
        return { entries, lengthOfLongestNormalizedElement, tokenMatchScoreCache: new DefaultMap<string, (number | undefined)[]>(() => new Array<number | undefined>(searchIndex.elements.length)),
        }
    }, [])

    const reset = (): void => {
        setQuery('')
        normalizedQuery.current = ''
        setMatches([])
        setFocused(0)
    }

    const searchboxDropdownItemStyle = (idx: number): CSSProperties => {
        return {
            padding: '0.5em',
            cursor: 'pointer',
            backgroundColor: (focused === idx) ? colors.slightlyDifferentBackgroundFocused : undefined,
        }
    }

    const onFormSubmit = (event: React.FormEvent): boolean => {
        event.preventDefault()
        const terms = matches
        if (terms.length > 0) {
            void props.link(terms[focused]).onClick()
            props.onChange?.(terms[focused])
            reset()
        }
        return false
    }

    const onTextBoxKeyUp = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        // if down arrow, then go to the next one
        if (matches.length > 0) {
            if (event.key === 'ArrowDown') {
                setFocused((focused + 1) % matches.length)
            }
            if (event.key === 'ArrowUp') {
                setFocused((focused - 1) % matches.length)
            }
        }
    }

    // Do the search
    useEffect(() => {
        void (async () => {
            const full = await fullIndex
            // we can skip searching if the query has changed since we were waiting on the index
            if (normalizedQuery.current !== searchQuery) {
                return
            }
            const s2 = Date.now()

            const result = bitap(full, searchQuery)
            setMatches(result)
            setFocused(f => Math.min(f, result.length - 1))
            console.log(`Took ${Date.now() - s2}ms to do full search`)
        })()
    }, [searchQuery, showHistoricalCDs, fullIndex])

    return (
        <form
            autoComplete="off"
            style={{ marginBlockEnd: '0em', position: 'relative', width: '100%' }}
            onSubmit={onFormSubmit}
        >
            <input
                autoFocus={props.autoFocus}
                id="searchbox"
                type="text"
                className="serif"
                style={{
                    ...props.style }}
                placeholder={props.placeholder}
                onKeyUp={onTextBoxKeyUp}
                onChange={(e) => {
                    setQuery(e.target.value)
                    normalizedQuery.current = normalize(e.target.value)
                }}
                value={query}
            />

            <div
                style={
                    {
                        position: 'absolute',
                        width: '100%',
                        maxHeight: '20em',
                        overflowY: 'auto',
                        backgroundColor: colors.slightlyDifferentBackground,
                        borderRadius: '0.25em',
                        zIndex: '1',
                    }
                }
            >
                {
                    matches.map((location, idx) =>
                        (
                            <a
                                key={location}
                                {...props.link(matches[idx])}
                                style={{
                                    textDecoration: 'none',
                                    color: colors.textMain,
                                }}
                            >
                                <div
                                    className="serif searchbox-dropdown-item"
                                    style={searchboxDropdownItemStyle(idx)}
                                    onClick={() => {
                                        props.onChange?.(matches[idx])
                                        reset()
                                    }}
                                    onMouseOver={() => { setFocused(idx) }}
                                >
                                    {' '}
                                    {location}
                                    {' '}

                                </div>
                            </a>
                        ),
                    )
                }
            </div>
        </form>
    )
}

function normalize(a: string): string {
    return a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

interface NormalizedSearchIndex {
    entries: {
        element: string
        normalizedElement: string
        priority: number
        cache?: {
            // If the last token is a prefix of the current token (a common case when the user is typing out a search), and there were no matches, we can skip searching this entry again
            lastToken: string
            matches: boolean
        }
    }[]
    lengthOfLongestNormalizedElement: number
    tokenMatchScoreCache: DefaultMap<string, (number | undefined)[]>
}

interface SearchResult {
    element: string
    matchScore: number // Lower is better
    populationRank: number // Lower is higher population
}

function compareSearchResults(a: SearchResult, b: SearchResult): number {
    if (a.matchScore !== b.matchScore) {
        return a.matchScore - b.matchScore
    }
    return a.populationRank - b.populationRank
}

function tokenize(pattern: string): string[] {
    if (pattern === '') {
        return []
    }
    const [, currentPattern, nextPattern] = /^([^ ]{0,32}) ?(.*)$/.exec(pattern)!

    return [currentPattern, ...tokenize(nextPattern)]
}

function makeAlphabet(token: string): Uint32Array {
    const result = new Uint32Array(65535).fill(0)
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        result[char] = result[char] | (1 << (token.length - i - 1))
    }
    return result
}

class Perf {
    startTime: number | undefined

    start(): void {
        this.startTime = Date.now()
    }

    stop(): void {
        console.log(`Took ${Date.now() - this.startTime!}ms`)
        for (const [key, value] of this.totals.entries()) {
            console.log(`${key}=${value}ms`)
        }
    }

    totals = new DefaultMap<string, number>(() => 0)

    inflight = new Map<string, number>()

    enter(name: string): void {
        this.inflight.set(name, Date.now())
    }

    exit(name: string): void {
        const started = this.inflight.get(name)!
        this.totals.set(name, this.totals.get(name) + (Date.now() - started))
        this.inflight.delete(name)
    }
}

function bitap(searchIndex: NormalizedSearchIndex, pattern: string): string[] {
    if (pattern === '') {
        return []
    }

    const perf = new Perf()
    perf.start()

    perf.enter('prelude')

    const longestFinish = searchIndex.lengthOfLongestNormalizedElement + pattern.length

    // Doing these allocations here saves performance
    let rd = new Uint32Array(longestFinish + 2)
    let lastRd = new Uint32Array(longestFinish + 2)

    const tokens = tokenize(pattern).map(token => ({ token, alphabet: makeAlphabet(token) }))

    const maxResults = 10
    const results: SearchResult[] = []

    const maxErrors = 1

    perf.exit('prelude')

    perf.enter('body')

    entries: for (const [populationRank, entry] of searchIndex.entries.entries()) {
        const { normalizedElement, element } = entry
        let matchScore = 0

        for (const { token, alphabet } of tokens) {
            perf.enter('token cache')
            const cache = searchIndex.tokenMatchScoreCache.get(token)
            const cached = cache[populationRank]
            if (cached !== undefined) {
                matchScore += cached
                perf.exit('token cache')
                continue
            }
            perf.exit('token cache')

            const matchMask = 1 << (token.length - 1)
            const finish = normalizedElement.length + token.length

            let tokenScore = maxErrors + 1

            perf.enter('search core')
            if (entry.cache !== undefined && token.startsWith(entry.cache.lastToken) && !entry.cache.matches) {
                // Token score is no match
            }
            else {
                search: for (let errors = 0; errors <= maxErrors; errors++) {
                    rd.fill(0)
                    rd[finish + 1] = (1 << errors) - 1

                    for (let j = finish; j >= 1; j--) {
                        let charMatch: number
                        if (j - 1 < normalizedElement.length) {
                            charMatch = alphabet[normalizedElement.charCodeAt(j - 1)]
                        }
                        else {
                            charMatch = 0
                        }
                        if (errors === 0) {
                            rd[j] = ((rd[j + 1] << 1) | 1) & charMatch
                        }
                        else {
                            // Subsequent passes: fuzzy match.
                            rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) | (((lastRd[j + 1] | lastRd[j]) << 1) | 1) | lastRd[j + 1]
                        }
                        if ((rd[j] & matchMask) !== 0) {
                            tokenScore = errors
                            break search
                        }
                    }

                    [lastRd, rd] = [rd, lastRd]
                }
            }

            perf.exit('search core')

            matchScore += tokenScore

            perf.enter('token cache')
            cache[populationRank] = tokenScore
            entry.cache = { lastToken: token, matches: tokenScore < maxErrors + 1 }
            perf.exit('token cache')

            perf.enter('short circuit')
            // If our match score is so high that we would not make it into the results, we can move on to the next entry
            if (results.length === maxResults && compareSearchResults({ element, matchScore, populationRank }, results[results.length - 1]) > 0) {
                continue entries
            }
            perf.exit('short circuit')
        }

        if (matchScore === tokens.length * (maxErrors + 1)) {
            // No match
            continue
        }

        perf.enter('results')
        const result: SearchResult = {
            element,
            matchScore,
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
        perf.exit('results')
    }

    perf.exit('body')
    perf.stop()

    console.log(results)

    return results.map(result => result.element)
}

// function indexify(arr: string[]): NormalizedSearchIndex {
//     return arr.map(v => ({ element: v, normalizedElement: normalize(v), priority: 0 }))
// }

// console.log(bitap(indexify(['apple', 'orange', 'banana', 'lettuce', 'tomato', 'cucumber', 'melon', 'watermelon', 'cherry', 'radish', 'apricot', 'blueberry']), 'an'))
