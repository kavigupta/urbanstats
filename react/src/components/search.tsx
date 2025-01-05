import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

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

    const fullIndex = useMemo(async () => {
        const searchIndex = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
        return searchIndex.elements.map((element, index) => ({
            element,
            normalizedElement: normalize(element),
            priority: searchIndex.priorities[index],
        }))
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

type NormalizedSearchIndex = { element: string, normalizedElement: string, priority: number }[]

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
    const [, currentPattern, nextPattern] = /^([^ ]{0,53}) ?(.*)$/.exec(pattern)!

    return [currentPattern, ...tokenize(nextPattern)]
}

function makeAlphabet(token: string): number[] {
    const result = new Array<number>(65535).fill(0)
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        result[char] = result[char] | (1 << (token.length - i - 1))
    }
    return result
}

function bitap(searchIndex: NormalizedSearchIndex, pattern: string): string[] {
    if (pattern === '') {
        return []
    }

    const tokens = tokenize(pattern).map(token => ({ token, alphabet: makeAlphabet(token) }))

    const maxResults = 10
    const results: SearchResult[] = []

    const maxErrors = 2

    for (const [populationRank, { element, normalizedElement }] of searchIndex.entries()) {
        let matchScore = 0

        for (const { token, alphabet } of tokens) {
            const matchMask = 1 << (token.length - 1)
            const finish = normalizedElement.length + token.length

            let rd = new Array<number>(finish + 2)
            let lastRd = new Array<number>(finish + 2)

            let tokenScore = maxErrors + 1

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

            matchScore += tokenScore
        }

        if (matchScore === tokens.length * (maxErrors + 1)) {
            // No match
            continue
        }

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
    }

    console.log(results)

    return results.map(result => result.element)
}

function indexify(arr: string[]): NormalizedSearchIndex {
    return arr.map(v => ({ element: v, normalizedElement: normalize(v), priority: 0 }))
}

console.log(bitap(indexify(['apple', 'orange', 'banana', 'lettuce', 'tomato', 'cucumber', 'melon', 'watermelon', 'cherry', 'radish', 'apricot', 'blueberry']), 'an'))
