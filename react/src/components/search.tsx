import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { loadProtobuf } from '../load_json'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { is_historical_cd } from '../utils/is_historical'
import '../common.css'

export const SearchBox = (props: {
    on_change: (inp: string) => void
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
}): ReactNode => {
    const colors = useColors()
    const [show_historical_cds] = useSetting('show_historical_cds')

    const [matches, setMatches] = useState<string[]>([])

    // Keep these in sync
    const [query, setQuery] = useState('')
    const queryRef = useRef('')

    const [focused, setFocused] = React.useState(0)

    const firstCharacter = query.length === 0 ? undefined : query[0]

    const indexCache = useMemo(() => firstCharacter === undefined ? undefined : loadProtobuf(`/index/pages_${firstCharacter}.gz`, 'SearchIndex'), [firstCharacter])

    const reset = (): void => {
        setQuery('')
        queryRef.current = ''
        setMatches([])
        setFocused(0)
    }

    const searchbox_dropdown_item_style = (idx: number): CSSProperties => {
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
            props.on_change(terms[focused])
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
            if (queryRef.current !== query) {
                return
            }

            let matches_new = []
            for (let i = 0; i < elements.length; i++) {
                const match_count = is_a_match(query, normalize(elements[i]))
                if (match_count === 0) {
                    continue
                }
                if (!show_historical_cds) {
                    if (is_historical_cd(elements[i])) {
                        continue
                    }
                }
                matches_new.push([match_count, i, match_count - priorities[i] / 10])
            }
            matches_new = top_10(matches_new)
            matches_new = matches_new.map(idx => elements[idx])
            setMatches(matches_new)
        })
    }, [query, indexCache, show_historical_cds])

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
                    const newQuery = normalize(e.target.value)
                    setQuery(newQuery)
                    queryRef.current = newQuery
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
                                style={searchbox_dropdown_item_style(idx)}
                                onClick={() => {
                                    props.on_change(matches[idx])
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

function top_10(matches: number[][]): number[] {
    const num_prioritized = 3
    const sort_key = (idx: number) => {
        return (a: number[], b: number[]) => {
            if (a[idx] !== b[idx]) {
                return b[idx] - a[idx]
            }
            return a[1] - b[1]
        }
    }
    matches.sort(sort_key(2))
    const overall_matches = []
    for (let i = 0; i < Math.min(num_prioritized, matches.length); i++) {
        overall_matches.push(matches[i][1])
        matches[i][0] = -100
    }
    matches.sort(sort_key(0))
    for (let i = 0; i < Math.min(10 - num_prioritized, matches.length); i++) {
        if (matches[i][0] === -100) {
            break
        }
        overall_matches.push(matches[i][1])
    }
    return overall_matches
}

/*
    Check whether a is a substring of b (does not have to be contiguous)

*/
function is_a_match(a: string, b: string): number {
    let i = 0
    let match_count = 0
    let prev_match = true
    // eslint-disable-next-line @typescript-eslint/prefer-for-of -- b is a string
    for (let j = 0; j < b.length; j++) {
        if (a[i] === b[j]) {
            i++
            if (prev_match) {
                match_count++
            }
            prev_match = true
        }
        else {
            prev_match = false
        }
        if (i === a.length) {
            return match_count + 1
        }
    }
    return 0
}

function normalize(a: string): string {
    return a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
