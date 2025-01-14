import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'

import { loadProtobuf } from '../load_json'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'
import '../common.css'

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

    const fullIndex = useRef<Promise<NormalizedSearchIndex> | undefined>()

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
            if (searchQuery === '') {
                setMatches([])
                setFocused(0)
                return
            }
            if (fullIndex.current === undefined) {
                fullIndex.current = loadSearchIndex()
            }
            const full = await fullIndex.current
            // we can skip searching if the query has changed since we were waiting on the index
            if (normalizedQuery.current !== searchQuery) {
                return
            }
            const start = performance.now()
            const result = bitap(full, searchQuery, { showHistoricalCDs })
            console.log(`Took ${performance.now() - start} ms to execute search`)
            setMatches(result)
            setFocused(f => Math.min(f, result.length - 1))
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
                    ...props.style,
                }}
                placeholder={props.placeholder}
                onKeyUp={onTextBoxKeyUp}
                onChange={(e) => {
                    setQuery(e.target.value)
                    normalizedQuery.current = normalize(e.target.value)
                }}
                value={query}
                onFocus={() => {
                    if (fullIndex.current === undefined) {
                        fullIndex.current = loadSearchIndex()
                    }
                }}
                onBlur={() => {
                    fullIndex.current = undefined
                }}
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
    return a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f,\(\)]/g, '')
}

interface NormalizedSearchIndex {
    entries: {
        element: string
        tokens: string[]
        priority: number
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
    if (a.matchScore !== b.matchScore) {
        return a.matchScore - b.matchScore
    }
    if (a.priority !== b.priority) {
        return a.priority - b.priority
    }
    if (a.positionScore !== b.positionScore) {
        return a.positionScore - b.positionScore
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

function makeAlphabet(token: string): Uint32Array {
    const result = new Uint32Array(65535).fill(0)
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        result[char] = result[char] | (1 << (token.length - i - 1))
    }
    return result
}

// Expects `pattern` to be normalized
function bitap(searchIndex: NormalizedSearchIndex, pattern: string, options: { showHistoricalCDs: boolean }): string[] {
    if (pattern === '  ') {
        return []
    }

    const longestFinish = searchIndex.lengthOfLongestToken + pattern.length

    // Doing these allocations here saves performance
    const rd = new Uint32Array(longestFinish + 2)
    const lastRd = new Uint32Array(longestFinish + 2)

    const patternTokens = tokenize(pattern).map(token => ({ token, alphabet: makeAlphabet(token) }))

    const maxResults = 10
    const results: SearchResult[] = []

    const maxErrors = 1

    const bitapBuffer = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(longestFinish + 2))

    entries: for (const [populationRank, { tokens, element, priority }] of searchIndex.entries.entries()) {
        if (!options.showHistoricalCDs && isHistoricalCD(element)) {
            continue
        }

        let matchScore = 0
        let positionScore = 0

        for (const [patternTokenIndex, { token, alphabet }] of patternTokens.entries()) {
            let tokenMatchScore = maxErrors + 1
            let tokenPositionScore = 0

            search: for (const [entryTokenIndex, entryToken] of tokens.entries()) {
                const resultIndex = entryToken.indexOf(token)
                if (resultIndex !== -1) {
                    tokenMatchScore = resultIndex
                    tokenPositionScore = Math.abs(patternTokenIndex - entryTokenIndex)
                    break search
                }

                bitapBuffer.
                // for (let errors = 0; errors <= maxErrors; errors++) {
                //     const matchMask = 1 << (token.length - 1)
                //     const finish = entryToken.length + token.length

                //     rd.fill(0)
                //     rd[finish + 1] = (1 << errors) - 1

                //     for (let j = finish; j >= 1; j--) {
                //         let charMatch: number
                //         if (j - 1 < entryToken.length) {
                //             charMatch = alphabet[entryToken.charCodeAt(j - 1)]
                //         }
                //         else {
                //             charMatch = 0
                //         }
                //         if (errors === 0) {
                //             rd[j] = ((rd[j + 1] << 1) | 1) & charMatch
                //         }
                //         else {
                //         // Subsequent passes: fuzzy match.
                //             rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) | (((lastRd[j + 1] | lastRd[j]) << 1) | 1) | lastRd[j + 1]
                //         }
                //         if ((rd[j] & matchMask) !== 0) {
                //             tokenMatchScore = errors
                //             tokenPositionScore = Math.abs(patternTokenIndex - entryTokenIndex)
                //             break search
                //         }
                //     }

                //     [lastRd, rd] = [rd, lastRd]
                // }
            }

            matchScore += tokenMatchScore
            positionScore += tokenPositionScore

            // If our match score is so high that we would not make it into the results, we can move on to the next entry
            if (results.length === maxResults && compareSearchResults({ element, matchScore, positionScore, priority, populationRank }, results[results.length - 1]) > 0) {
                continue entries
            }
        }

        if (matchScore === tokens.length * (maxErrors + 1)) {
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

    console.log(results)

    return results.map(result => result.element)
}

async function loadSearchIndex(): Promise<NormalizedSearchIndex> {
    const searchIndex = await loadProtobuf('/index/pages_all.gz', 'SearchIndex', { cacheCompressedBufferInRam: true })
    return processRawSearchIndex(searchIndex)
}

function processRawSearchIndex(searchIndex: { elements: string[], priorities: number[] }): NormalizedSearchIndex {
    let lengthOfLongestToken = 0
    const entries = searchIndex.elements.map((element, index) => {
        const normalizedElement = normalize(element)
        const tokens = tokenize(normalizedElement)
        tokens.forEach((token) => {
            if (token.length > lengthOfLongestToken) {
                lengthOfLongestToken = token.length
            }
        })
        return {
            element,
            tokens,
            priority: searchIndex.priorities[index],
        }
    })
    return { entries, lengthOfLongestToken }
}

const i = processRawSearchIndex({ elements: ['long urban center', 's urban center'], priorities: [0, 0] })

console.log(bitap(i, 'urban center', { showHistoricalCDs: false }))
