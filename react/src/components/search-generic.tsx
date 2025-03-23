import React, { CSSProperties, ReactElement, useState, useRef, useEffect } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { SearchResult } from '../search'

export function GenericSearchResult(
    props: {
        matches: SearchResult[]
        doSearch: (sq: string) => Promise<SearchResult[]>
        onChange?: (inp: string) => void
        link: (inp: string) => ReturnType<Navigator['link']>
        onFocus: () => void
        onBlur: () => void
        autoFocus: boolean
        placeholder: string
        style: CSSProperties
        renderMatch: (currentMatch: () => SearchResult, onMouseOver: () => void, onClick: () => void, style: CSSProperties, dataTestId: string | undefined) => ReactElement
    }): ReactElement {
    const colors = useColors()

    const [query, setQuery] = useState('')
    const queryRef = useRef('')

    const [focused, setFocused] = React.useState(0)
    const [matches, setMatches] = useState<SearchResult[]>([])

    const searchQuery = queryRef.current

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
            void props.link(terms[focused].longname).onClick()
            props.onChange?.(terms[focused].longname)
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

    const doSearch = props.doSearch

    // Do the search
    useEffect(() => {
        void (async () => {
            if (searchQuery === '') {
                setMatches([])
                setFocused(0)
                return
            }

            const result = await doSearch(searchQuery)

            // we should throw away the result if the query has changed since we submitted the search
            if (queryRef.current !== searchQuery) {
                return
            }

            setMatches(result)
            setFocused(f => Math.max(0, Math.min(f, result.length - 1)))
        })()
    }, [searchQuery, doSearch])

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
                onFocus={props.onFocus}
                onBlur={props.onBlur}
            />

            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    maxHeight: '20em',
                    overflowY: 'auto',
                    backgroundColor: colors.slightlyDifferentBackground,
                    borderRadius: '0.25em',
                    zIndex: '1',
                }}
            >
                {matches.map((_, idx) => (
                    props.renderMatch(
                        () => matches[idx],
                        () => { setFocused(idx) },
                        () => {
                            props.onChange?.(matches[idx].longname)
                            reset()
                        },
                        searchboxDropdownItemStyle(idx),
                        idx === focused ? 'selected-search-result' : undefined,
                    )
                ),
                )}
            </div>
        </form>
    )
}
