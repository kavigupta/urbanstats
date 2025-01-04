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
        const searchIndex = await loadProtobuf('/index/pages.gz', 'SearchIndex')
        return searchIndex.elements.map(element => ({
            element,
            normalizedElement: normalize(element),
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

type NormalizedSearchIndex = { element: string, normalizedElement: string }[]

interface BitapMatch {
    patternIteration: number
    element: string
    normalizedElement: string
    errors: number
    indexInElement: number
    whitespaceAroundPattern: number
    distanceFromPatternLength: number
    patternLength: number
    combinationOf: BitapMatch[] // For debugging
}

function combineMatches(a: BitapMatch, b: BitapMatch): BitapMatch {
    if (a.element !== b.element) {
        throw new Error('may only combine matches on the same element')
    }
    if (a.patternIteration === b.patternIteration) {
        throw new Error('may not combine matches from the same pattern iteration')
    }
    return {
        element: a.element,
        normalizedElement: a.normalizedElement,
        errors: a.errors + b.errors,
        indexInElement: Math.min(a.indexInElement, b.indexInElement),
        whitespaceAroundPattern: a.whitespaceAroundPattern + b.whitespaceAroundPattern,
        distanceFromPatternLength: Math.abs((a.patternLength + b.patternLength) - a.normalizedElement.length),
        patternLength: a.patternLength + b.patternLength,
        patternIteration: Math.max(a.patternIteration, b.patternIteration),
        combinationOf: [a, b],
    }
}

function compareBitapMatches(a: BitapMatch, b: BitapMatch): number {
    if (a.errors !== b.errors) {
        return a.errors - b.errors
    }
    if (a.indexInElement !== b.indexInElement) {
        return a.indexInElement - b.indexInElement
    }
    if (a.whitespaceAroundPattern !== b.whitespaceAroundPattern) {
        // Note swapped order
        return b.whitespaceAroundPattern - a.whitespaceAroundPattern
    }
    if (a.distanceFromPatternLength !== b.distanceFromPatternLength) {
        return a.distanceFromPatternLength - b.distanceFromPatternLength
    }
    return 0
}

function bitap(searchIndex: NormalizedSearchIndex, pattern: string): string[] {
    const matches: BitapMatch[] = []
    const numMatches = 10
    function addToMatches(newMatch: BitapMatch): void {
        // Maybe the new match is better when combined with previous matches
        const bestMatch = [newMatch, ...matches.filter(match => match.element === newMatch.element && match.patternIteration < newMatch.patternIteration).flatMap(oldMatch => [oldMatch, combineMatches(oldMatch, newMatch)])].sort(compareBitapMatches)[0]

        // To be maybe readded after
        const indexOfExistingMatchOnElement = matches.findIndex(match => match.element === newMatch.element)
        if (indexOfExistingMatchOnElement !== -1) {
            matches.splice(indexOfExistingMatchOnElement, 1)
        }

        for (let i = 0; i < numMatches; i++) {
            if (i >= matches.length || compareBitapMatches(bestMatch, matches[i]) < 0) {
                matches.splice(i, 0, bestMatch)
                break
            }
        }

        if (matches.length > numMatches) {
            matches.pop()
        }
    }

    const lengthOfLongestElement = searchIndex.reduce((length, element) => Math.max(length, element.normalizedElement.length), 0)

    const longestFinish = lengthOfLongestElement + pattern.length

    let rd = new Array<number>(longestFinish + 2)
    let lastRd = new Array<number>(longestFinish + 2)

    let currentPattern: string
    let nextPattern: string = pattern
    let patternIteration = 0
    while (true) {
        [, currentPattern, nextPattern] = /^([^ ]{0,53}) ?(.*)$/.exec(nextPattern)!
        console.log({ currentPattern, nextPattern })
        patternIteration += 1

        if (currentPattern === '') {
            break
        }

        const matchMask = 1 << (currentPattern.length - 1)

        const alphabet = new Array<number>(65535).fill(0)
        for (let i = 0; i < currentPattern.length; i++) {
            const char = currentPattern.charCodeAt(i)
            alphabet[char] = alphabet[char] | (1 << (currentPattern.length - i - 1))
        }

        for (const { element, normalizedElement } of searchIndex) {
            const finish = normalizedElement.length + currentPattern.length

            for (let errors = 0; errors <= Math.min(currentPattern.length, 1); errors++) {
            // If matches is full and everything has a lesser error level than this, we won't add any matches because they're sorted by error level
                if (matches.length === numMatches && matches.every(match => match.errors < errors)) {
                    break
                }

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
                        const whitespaceBefore = ['', ' '].includes(normalizedElement.charAt(indexInElement - 1)) ? 1 : 0
                        const whitespaceAfter = ['', ' '].includes(normalizedElement.charAt(indexInElement + currentPattern.length)) ? 1 : 0
                        addToMatches({
                            element,
                            normalizedElement,
                            errors,
                            indexInElement,
                            whitespaceAroundPattern: whitespaceBefore + whitespaceAfter,
                            distanceFromPatternLength: Math.abs(currentPattern.length - normalizedElement.length),
                            patternLength: currentPattern.length,
                            patternIteration,
                            combinationOf: [],
                        })
                    }
                }

                [lastRd, rd] = [rd, lastRd]
            }
        }
    }

    console.log(matches)

    // While there are more words or more than 53 characters in the search term, build a new index from the found elements, subtracting the found portion, then run a new search on that index

    return matches.map(match => match.element)
}
