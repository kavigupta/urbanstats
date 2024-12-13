import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { loadProtobuf } from '../load_json'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'
import '../common.css'

export function SearchBox(props: {
    onChange: (inp: string) => void
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
    const firstCharacter = searchQuery.length === 0 ? undefined : searchQuery[0]

    const indexCache = useMemo(() => firstCharacter === undefined ? undefined : loadProtobuf(`/index/pages_${firstCharacter}.gz`, 'SearchIndex'), [firstCharacter])

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
            props.onChange(terms[focused])
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
        if (indexCache === undefined) {
            // Occurs when query is empty
            setMatches([])
            setFocused(0)
            return
        }
        void indexCache.then(({ elements, priorities }) => {
            // we can skip searching if the query has changed since we were waiting on the indexCache
            if (normalizedQuery.current !== searchQuery) {
                return
            }

            let matchesNew = []
            for (let i = 0; i < elements.length; i++) {
                const matchCount = isAMatch(searchQuery, normalize(elements[i]))
                if (matchCount === 0) {
                    continue
                }
                if (!showHistoricalCDs) {
                    if (isHistoricalCD(elements[i])) {
                        continue
                    }
                }
                matchesNew.push([matchCount, i, matchCount - priorities[i] / 10])
            }
            matchesNew = top10(matchesNew)
            matchesNew = matchesNew.map(idx => elements[idx])
            setMatches(matchesNew)
        })
    }, [searchQuery, indexCache, showHistoricalCDs])

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
                            <div
                                key={location}
                                className="serif searchbox-dropdown-item"
                                style={searchboxDropdownItemStyle(idx)}
                                onClick={() => {
                                    props.onChange(matches[idx])
                                    reset()
                                }}
                                onMouseOver={() => { setFocused(idx) }}
                            >
                                {' '}
                                {location}
                                {' '}

                            </div>
                        ),
                    )
                }
            </div>
        </form>
    )
}

function top10(matches: number[][]): number[] {
    const numPrioritized = 3
    const sortKey = (idx: number) => {
        return (a: number[], b: number[]) => {
            if (a[idx] !== b[idx]) {
                return b[idx] - a[idx]
            }
            return a[1] - b[1]
        }
    }
    matches.sort(sortKey(2))
    const overallMatches = []
    for (let i = 0; i < Math.min(numPrioritized, matches.length); i++) {
        overallMatches.push(matches[i][1])
        matches[i][0] = -100
    }
    matches.sort(sortKey(0))
    for (let i = 0; i < Math.min(10 - numPrioritized, matches.length); i++) {
        if (matches[i][0] === -100) {
            break
        }
        overallMatches.push(matches[i][1])
    }
    return overallMatches
}

/*
    Check whether a is a substring of b (does not have to be contiguous)

*/
function isAMatch(a: string, b: string): number {
    let i = 0
    let matchCount = 0
    let prevMatch = true
    // eslint-disable-next-line @typescript-eslint/prefer-for-of -- b is a string
    for (let j = 0; j < b.length; j++) {
        if (a[i] === b[j]) {
            i++
            if (prevMatch) {
                matchCount++
            }
            prevMatch = true
        }
        else {
            prevMatch = false
        }
        if (i === a.length) {
            return matchCount + 1
        }
    }
    return 0
}

function normalize(a: string): string {
    return a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
