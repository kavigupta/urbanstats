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

interface BitapMatch {
    patternIteration: number
    element: string
    normalizedElement: string
    errors: number
    numMatches: number
    indexInElement: number
    whitespaceAroundPattern: number
    distanceFromPatternLength: number
    patternLength: number
    priority: number
    // For debugging
    combinationOf: BitapMatch[]
    pattern: string
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
        numMatches: a.numMatches + b.numMatches,
        indexInElement: (a.indexInElement + b.indexInElement) / 2,
        whitespaceAroundPattern: a.whitespaceAroundPattern + b.whitespaceAroundPattern,
        distanceFromPatternLength: a.distanceFromPatternLength,
        patternLength: a.patternLength + b.patternLength,
        patternIteration: Math.max(a.patternIteration, b.patternIteration),
        priority: a.priority,
        combinationOf: [a, b],
        pattern: `${a.pattern}|${b.pattern}`,
    }
}

function compareBitapMatches(a: BitapMatch, b: BitapMatch): number {
    if (a.numMatches !== b.numMatches) {
        return b.numMatches - a.numMatches
    }
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
    if (a.priority !== b.priority) {
        return b.priority - a.priority
    }
    return 0
}

// New strat... find and cache token results... then, focus on putting the token results together
// Given that this token is a good match, how likely is it that this other token will be a good match

function bitap(searchIndex: NormalizedSearchIndex, pattern: string): string[] {
    const matches: BitapMatch[] = []
    const numMatches = 10
    function addToMatches(newMatch: BitapMatch): void {
        // Maybe the new match is better when combined with previous matches
        const orderedMatches = [
            newMatch,
            ...matches.filter(match => match.element === newMatch.element).flatMap(oldMatch => [
                oldMatch,
                ...(oldMatch.patternIteration < newMatch.patternIteration ? [combineMatches(oldMatch, newMatch)] : []),
                ...(oldMatch.patternIteration === newMatch.patternIteration && oldMatch.combinationOf.length > 0 ? [combineMatches(oldMatch.combinationOf[0], newMatch)] : []),
            ]),
        ].sort(compareBitapMatches)
        const bestMatch = orderedMatches[0]

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
        patternIteration += 1

        console.log({ currentPattern, nextPattern })

        if (currentPattern === '') {
            break
        }

        const matchMask = 1 << (currentPattern.length - 1)

        const alphabet = new Array<number>(65535).fill(0)
        for (let i = 0; i < currentPattern.length; i++) {
            const char = currentPattern.charCodeAt(i)
            alphabet[char] = alphabet[char] | (1 << (currentPattern.length - i - 1))
        }

        let totalMatches = 0

        for (const { element, normalizedElement, priority } of searchIndex) {
            const finish = normalizedElement.length + currentPattern.length

            for (let errors = 0; errors <= Math.min(currentPattern.length, 1); errors++) {
                // If matches is full and everything has more matches and a lesser error level than this, we won't add any matches because they're sorted by error level
                if (matches.length === numMatches && matches.every(match => match.numMatches >= patternIteration && match.errors < errors)) {
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
                            numMatches: 1,
                            indexInElement,
                            whitespaceAroundPattern: whitespaceBefore + whitespaceAfter,
                            distanceFromPatternLength: Math.abs(pattern.length - normalizedElement.length),
                            patternLength: currentPattern.length,
                            patternIteration,
                            combinationOf: [],
                            pattern: currentPattern,
                            priority,
                        })
                        totalMatches++
                    }
                }

                [lastRd, rd] = [rd, lastRd]
            }
        }

        console.log({ currentPattern, totalMatches })

        // searchIndex = matches
    }

    console.log(matches)

    // While there are more words or more than 53 characters in the search term, build a new index from the found elements, subtracting the found portion, then run a new search on that index

    return matches.map(match => match.element)
}

function indexify(arr: string[]): NormalizedSearchIndex {
    return arr.map(v => ({ element: v, normalizedElement: normalize(v), priority: 0 }))
}

console.log(bitap(indexify(['new york new york']), 'new york'))

/**
 * New Plan:
 *
 * Tokenize the query
 *
 * For each entry in the search index
 *  For each token # Cacheable
 *   For each error level
 *    Find the token in the search entry, record the best token match for that entry, if any (this data structure will contain 0 or 1 matches per token)
 *    If we find the token, we don't need to go to the next error level
 *    When we find a token, we know if this is one of the best search entries so far. If it is, add it to the list of search entries (can start from the bottom to make this faster)
 *
 * score(search entry) {
 *  how well tokens match, if at all
 *  positions of token matches
 *  how high up is the entry (its relative population)
 *  priority of the entry
 * }
 */
