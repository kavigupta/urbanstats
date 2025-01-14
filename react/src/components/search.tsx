import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'

import { loadProtobuf } from '../load_json'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'
import '../common.css'
import { bitap, bitapPerformance, bitCount, Haystack, toHaystack, toNeedle, toSignature } from '../utils/bitap'

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
            const result = search(full, searchQuery, { showHistoricalCDs })
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
        tokens: Haystack[]
        priority: number
        signature: bigint
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
function search(searchIndex: NormalizedSearchIndex, pattern: string, options: { showHistoricalCDs: boolean }): string[] {
    if (pattern === '') {
        return []
    }

    const patternTokens = tokenize(pattern).map(token => toNeedle(token))

    const maxResults = 10
    const results: SearchResult[] = []

    const maxErrors = 2

    const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(searchIndex.lengthOfLongestToken + 2))

    bitapPerformance.numRuns = 0
    bitapPerformance.numShortcuts = 0

    const patternSignature = toSignature(pattern)

    let skips = 0
    let total = 0

    entries: for (const [populationRank, { tokens, element, priority, signature }] of searchIndex.entries.entries()) {
        if (!options.showHistoricalCDs && isHistoricalCD(element)) {
            continue
        }

        total++
        // console.log({
        //     pattern: patternSignature.toString(2),
        //     entry: signature.toString(2),
        //     and: (patternSignature & signature).toString(2),
        //     diff: (patternSignature ^ (patternSignature & signature)).toString(2),
        //     bitCount: bitCount(patternSignature ^ (patternSignature & signature)),
        // })
        if (bitCount(patternSignature ^ (patternSignature & signature)) > maxErrors) {
            skips++
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
                if (searchResult < maxErrors + 1) {
                    tokenMatchScore = searchResult
                    tokenPositionScore = Math.abs(patternTokenIndex - entryTokenIndex)
                    if (tokenMatchScore === 0) {
                        break search // We're ignoring the possiblity that there's a better-positioned match somewhere else for simplicity and performance
                    }
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
    console.log({ total, skips })

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
    return { entries, lengthOfLongestToken }
}

const i = processRawSearchIndex({ elements: ['north america'], priorities: [0] })

console.log(search(i, 'lone pine', { showHistoricalCDs: false }))

// console.log(bitap('catarina', toNeedle('ca'), 0, [new Uint32Array(3)], true))
