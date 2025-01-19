import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import '../common.css'
import { loadSearchIndex, NormalizedSearchIndex, search } from '../search'

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
    const queryRef = useRef('')

    const [focused, setFocused] = React.useState(0)

    const searchQuery = queryRef.current

    const fullIndex = useRef<Promise<NormalizedSearchIndex> | undefined>()

    const reset = (): void => {
        setQuery('')
        queryRef.current = ''
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
            if (queryRef.current !== searchQuery) {
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
                    queryRef.current = e.target.value
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
