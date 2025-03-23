import React, { CSSProperties, ReactElement, ReactNode, useMemo, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { searchIconLink } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import '../common.css'
import { SearchResult, SearchParams, debugPerformance, getIndexCacheKey } from '../search'

import { GenericSearchResult } from './search-generic'

export function SearchBox(props: {
    onChange?: (inp: string) => void
    link: (inp: string) => ReturnType<Navigator['link']>
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
}): ReactNode {
    const colors = useColors()
    const [showHistoricalCDs] = useSetting('show_historical_cds')

    // Keep these in sync
    const cacheKey = useMemo(() => getIndexCacheKey(), [])

    const searchWorker = useRef<Promise<SearchWorker> | undefined>()

    const doSearch = useMemo(() => {
        return async (sq: string): Promise<SearchResult[]> => {
            if (sq === '') {
                return []
            }
            if (searchWorker.current === undefined) {
                searchWorker.current = cacheKey.then(createSearchWorker)
            }
            const result = await (await searchWorker.current)({ unnormalizedPattern: sq, maxResults: 10, showHistoricalCDs })
            return result
        }
    }, [searchWorker, cacheKey, showHistoricalCDs])

    const renderMatch = (currentMatch: (() => SearchResult), onMouseOver: () => void, onClick: () => void, style: React.CSSProperties, dataTestId: string | undefined): ReactElement => (
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
                onClick={onClick}
                onMouseOver={onMouseOver}
            >
                <SingleSearchResult {...currentMatch()} />
            </div>
        </a>
    )

    return (
        <GenericSearchResult
            matches={[]}
            doSearch={doSearch}
            onChange={props.onChange}
            link={props.link}
            onFocus={(): void => {
                if (searchWorker.current === undefined) {
                    searchWorker.current = cacheKey.then(createSearchWorker)
                }
            }}
            onBlur={() => {
                searchWorker.current = undefined
            }}
            autoFocus={props.autoFocus}
            placeholder={props.placeholder}
            style={props.style}
            renderMatch={renderMatch}
        />
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
