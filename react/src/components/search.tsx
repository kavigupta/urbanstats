import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import '../common.css'
import { SearchElement, SearchParams } from '../search'

export function SearchBox(props: {
    onChange?: (inp: string) => void
    link: (inp: string) => ReturnType<Navigator['link']>
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
}): ReactNode {
    const colors = useColors()
    const [showHistoricalCDs] = useSetting('show_historical_cds')

    const [matches, setMatches] = useState<SearchElement[]>([])

    // Keep these in sync
    const [query, setQuery] = useState('')
    const queryRef = useRef('')

    const [focused, setFocused] = React.useState(0)

    const searchQuery = queryRef.current

    const searchWorker = useRef<SearchWorker | undefined>()

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

    // Do the search
    useEffect(() => {
        void (async () => {
            if (searchQuery === '') {
                setMatches([])
                setFocused(0)
                return
            }
            if (searchWorker.current === undefined) {
                searchWorker.current = createSearchWorker()
            }
            const result = await searchWorker.current({ unnormalizedPattern: searchQuery, maxResults: 10, showHistoricalCDs })
            // we should throw away the result if the query has changed since we submitted the search
            if (queryRef.current !== searchQuery) {
                return
            }
            setMatches(result)
            setFocused(f => Math.max(0, Math.min(f, result.length - 1)))
        })()
    }, [searchQuery, showHistoricalCDs, searchWorker])

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
                    if (searchWorker.current === undefined) {
                        searchWorker.current = createSearchWorker()
                    }
                }}
                onBlur={() => {
                    searchWorker.current = undefined
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
                                key={location.longname}
                                {...props.link(matches[idx].longname)}
                                style={{
                                    textDecoration: 'none',
                                    color: colors.textMain,
                                }}
                                data-test-id={idx === focused ? 'selected-search-result' : undefined}
                            >
                                <div
                                    className="serif searchbox-dropdown-item"
                                    style={searchboxDropdownItemStyle(idx)}
                                    onClick={() => {
                                        props.onChange?.(matches[idx].longname)
                                        reset()
                                    }}
                                    onMouseOver={() => { setFocused(idx) }}
                                >
                                    {' '}
                                    {location.longname}
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

const workerTerminatorRegistry = new FinalizationRegistry<Worker>((worker) => { worker.terminate() })

type SearchWorker = (params: SearchParams) => Promise<SearchElement[]>

function createSearchWorker(): SearchWorker {
    const worker = new Worker(new URL('../searchWorker', import.meta.url))
    const messageQueue: ((results: SearchElement[]) => void)[] = []
    worker.addEventListener('message', (message: MessageEvent<SearchElement[]>) => {
        messageQueue.shift()!(message.data)
    })
    const result: SearchWorker = (params) => {
        worker.postMessage(params)
        return new Promise((resolve) => {
            messageQueue.push(resolve)
        })
    }
    workerTerminatorRegistry.register(result, worker)
    return result
}
