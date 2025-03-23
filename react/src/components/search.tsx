import React, { CSSProperties, ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { searchIconLink } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import '../common.css'
import { SearchResult, SearchParams, debugPerformance, getIndexCacheKey } from '../search'

export function SearchBox(props: {
    onChange?: (inp: string) => void
    link: (inp: string) => ReturnType<Navigator['link']>
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
}): ReactNode {
    const colors = useColors()
    const [showHistoricalCDs] = useSetting('show_historical_cds')

    const [matches, setMatches] = useState<SearchResult[]>([])

    // Keep these in sync
    const [query, setQuery] = useState('')
    const queryRef = useRef('')

    const [focused, setFocused] = React.useState(0)

    const cacheKey = useMemo(() => getIndexCacheKey(), [])

    const searchQuery = queryRef.current

    const searchWorker = useRef<Promise<SearchWorker> | undefined>()

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

    const doSearch = useMemo(() => {
        return async (sq: string): Promise<SearchResult[] | undefined> => {
            if (sq === '') {
                return []
            }
            if (searchWorker.current === undefined) {
                searchWorker.current = cacheKey.then(createSearchWorker)
            }
            const result = await (await searchWorker.current)({ unnormalizedPattern: sq, maxResults: 10, showHistoricalCDs })
            // we should throw away the result if the query has changed since we submitted the search
            if (queryRef.current !== sq) {
                return undefined
            }
            return result
        }
    }, [searchWorker, cacheKey, showHistoricalCDs])

    // Do the search
    useEffect(() => {
        void (async () => {
            if (searchQuery === '') {
                setMatches([])
                setFocused(0)
                return
            }

            const result = await doSearch(searchQuery)

            if (result === undefined) {
                return
            }

            setMatches(result)
            setFocused(f => Math.max(0, Math.min(f, result.length - 1)))
        })()
    }, [searchQuery, doSearch])

    const renderMatch = (currentMatch: (() => SearchResult), onMouseOver: () => void, style: React.CSSProperties, dataTestId: string | undefined): ReactElement => (
        <a
            key={currentMatch().longname}
            {...props.link(currentMatch().longname)}
            style={{
                textDecoration: 'none',
                color: colors.textMain,
            }}
            data-test-id={dataTestId}
        >
            <div
                className="serif searchbox-dropdown-item"
                style={style}
                onClick={() => {
                    props.onChange?.(currentMatch().longname)
                    reset()
                }}
                onMouseOver={onMouseOver}
            >
                <SingleSearchResult {...currentMatch()} />
            </div>
        </a>
    )

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
                        searchWorker.current = cacheKey.then(createSearchWorker)
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
                    matches.map((_, idx) =>
                        (
                            renderMatch(
                                () => matches[idx],
                                () => { setFocused(idx) },
                                searchboxDropdownItemStyle(idx),
                                idx === focused ? 'selected-search-result' : undefined,
                            )
                        ),
                    )
                }
            </div>
        </form>
    )
}

function SingleSearchResult(props: SearchResult): ReactNode {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '80%' }}>{props.longname}</div>
            <div style={{ width: '20%', textAlign: 'right' }}><img height="25em" src={searchIconLink(props.typeIndex)} /></div>
        </div>
    )
}

const workerTerminatorRegistry = new FinalizationRegistry<Worker>((worker) => { worker.terminate() })

type SearchWorker = (params: SearchParams) => Promise<SearchResult[]>

function createSearchWorker(cacheKey: string | undefined): SearchWorker {
    const worker = new Worker(new URL('../searchWorker', import.meta.url), { name: cacheKey })
    debugPerformance(`Requested new search worker at timestamp ${Date.now()}`)
    const messageQueue: ((results: SearchResult[]) => void)[] = []
    worker.addEventListener('message', (message: MessageEvent<SearchResult[]>) => {
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
