import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { loadProtobuf } from '../load_json'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'
import '../common.css'
import { SearchIndex } from '../utils/protos'

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

    const fullIndex = useMemo(() => loadProtobuf('/index/pages.gz', 'SearchIndex'), [])

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
        if (searchQuery === '') {
            // Occurs when query is empty
            setMatches([])
            setFocused(0)
            return
        }

        const doSearch = (index: SearchIndex): void => {
            // we can skip searching if the query has changed since we were waiting on the indexCache
            if (normalizedQuery.current !== searchQuery) {
                return
            }

            setMatches(bitap(index.elements, searchQuery))
        }

        void (async () => {
            const full = await fullIndex
            const s2 = Date.now()
            doSearch(full)
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

interface BitapMatch {
    element: string
    errors: number
    indexInElement: number
    whitespaceAfterPattern: boolean
    distanceFromPatternLength: number
}

function compareBitapMatches(a: BitapMatch, b: BitapMatch): number {
    if (a.errors !== b.errors) {
        return a.errors - b.errors
    }
    if (a.indexInElement !== b.indexInElement) {
        return a.indexInElement - b.indexInElement
    }
    if (a.whitespaceAfterPattern !== b.whitespaceAfterPattern) {
        // Note swapped order
        return Number(b.whitespaceAfterPattern) - Number(a.whitespaceAfterPattern)
    }
    if (a.distanceFromPatternLength !== b.distanceFromPatternLength) {
        return a.distanceFromPatternLength - b.distanceFromPatternLength
    }
    return 0
}

function bitap(elements: string[], pattern: string): string[] {
    if (pattern.length > 53) {
        throw new Error('pattern too large')
    }

    const maxErrors = Math.min(2, pattern.length)

    const alphabet = new Array<number>(65535).fill(0)
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern.charCodeAt(i)
        alphabet[char] = alphabet[char] | (1 << (pattern.length - i - 1))
    }

    const matchMask = 1 << (pattern.length - 1)

    const matches: BitapMatch[] = []
    const numMatches = 10
    function addToMatches(newMatch: BitapMatch): void {
        const indexOfExistingMatchOnElement = matches.findIndex(match => match.element === newMatch.element)

        // if (pattern.toLocaleLowerCase().startsWith('santa') && newMatch.element.toLowerCase().startsWith('santa') && matches.some(match => match.element.toLowerCase().startsWith('santa'))) {
        //     console.log({ newMatch, matches })
        // }

        if (indexOfExistingMatchOnElement !== -1) {
            if (compareBitapMatches(newMatch, matches[indexOfExistingMatchOnElement]) < 0) {
                matches.splice(indexOfExistingMatchOnElement, 1)
            }
            else {
                return
            }
        }

        for (let i = 0; i < numMatches; i++) {
            if (i >= matches.length || compareBitapMatches(newMatch, matches[i]) < 0) {
                matches.splice(i, 0, newMatch)
                break
            }
        }

        if (matches.length > numMatches) {
            matches.pop()
        }
    }

    const lengthOfLongestElement = elements.reduce((length, element) => Math.max(length, element.length), 0)

    const longestFinish = lengthOfLongestElement + pattern.length

    let rd = new Array<number>(longestFinish + 2)
    let lastRd = new Array<number>(longestFinish + 2)

    for (const element of elements) {
        const normalizedElement = normalize(element)
        const finish = normalizedElement.length + pattern.length

        for (let errors = 0; errors <= maxErrors; errors++) {
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
                    const indexInElement = j - 1
                    const indexAfterMatch = indexInElement + pattern.length
                    addToMatches({
                        element,
                        errors,
                        indexInElement,
                        whitespaceAfterPattern: indexAfterMatch >= normalizedElement.length || normalizedElement.charAt(indexAfterMatch) === ' ',
                        distanceFromPatternLength: Math.abs(pattern.length - normalizedElement.length),
                    })
                }
            }

            [lastRd, rd] = [rd, lastRd]
        }
    }

    console.log(matches)

    return matches.map(match => match.element)
}
