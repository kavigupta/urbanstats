import React, { CSSProperties, ReactElement, ReactNode, useCallback, useMemo, useRef } from 'react'

import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { searchIconLink, typesInOrder } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSettings } from '../page_template/settings'
import '../common.css'
import { SearchResult, SearchParams, debugPerformance, getIndexCacheKey, SearchIndexConfig } from '../search'
import { Universe, useUniverse } from '../universe'
import { TestUtils } from '../utils/TestUtils'

import { GenericSearchBox } from './search-generic'

export function SearchBox(props: {
    onChange?: (inp: string) => void
    articleLink: (inp: string) => ReturnType<Navigator['link']>
    statisticLink?: (statIdx: number, articleType: string, universe: Universe) => ReturnType<Navigator['link']>
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
    prioritizeArticleType?: string
    onTextPresenceChange?: (hasText: boolean) => void
}): ReactNode {
    const colors = useColors()
    const showSettings = useSettings(['show_historical_cds', 'show_person_circles'])
    const universe = useUniverse()
    const statsUniverse = props.statisticLink && (universe ?? 'allUniverses')

    // Keep these in sync
    const cacheKeyPromise = useMemo(() => getIndexCacheKey(), [])
    const searchWorker = useRef<SearchWorker | undefined>()
    const searchWorkerConfig = useRef<AsyncConfig | undefined>()

    const createSearchWorkerIfNeeded = useCallback(() => {
        if (searchWorker.current === undefined || searchWorkerConfig.current?.cacheKeyPromise !== cacheKeyPromise || searchWorkerConfig.current.statsUniverse !== statsUniverse) {
            searchWorker.current = createSearchWorker({ cacheKeyPromise, statsUniverse })
            searchWorkerConfig.current = { cacheKeyPromise, statsUniverse }
        }
    }, [cacheKeyPromise, statsUniverse])

    const doSearch = useMemo(() => {
        return async (sq: string): Promise<SearchResult[]> => {
            if (sq === '') {
                return []
            }
            createSearchWorkerIfNeeded()
            TestUtils.shared.startLoading('doSearch')
            const result = await searchWorker.current!({
                unnormalizedPattern: sq,
                maxResults: 10,
                showSettings,
                prioritizeTypeIndex: props.prioritizeArticleType !== undefined ? type_ordering_idx[props.prioritizeArticleType] : undefined,
            })
            void TestUtils.shared.finishLoading('doSearch')
            return result
        }
    }, [searchWorker, showSettings, props.prioritizeArticleType, createSearchWorkerIfNeeded])

    function link(sr: SearchResult): ReturnType<Navigator['link']> | undefined {
        switch (sr.type) {
            case 'article':
                return props.articleLink(sr.longname)
            case 'statistic':
                if (props.statisticLink === undefined) {
                    // This occurs when the props have changed but the results have not updated
                    return undefined
                }
                return props.statisticLink(sr.statisticIndex, typesInOrder[sr.typeIndex], universes_ordered[sr.universeIndex])
        }
    }

    const renderMatch = (currentMatch: (() => SearchResult), onMouseOver: () => void, onClick: () => void, style: React.CSSProperties, dataTestId: string | undefined): ReactElement => (
        <a
            key={currentMatch().longname}
            {...link(currentMatch())}
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
        <GenericSearchBox
            matches={[]}
            doSearch={doSearch}
            onChange={(result) => { props.onChange?.(result.longname) }}
            link={link}
            onFocus={(): void => {
                createSearchWorkerIfNeeded()
            }}
            onBlur={() => {
                searchWorker.current = undefined
            }}
            onTextPresenceChange={props.onTextPresenceChange}
            autoFocus={props.autoFocus}
            placeholder={props.placeholder}
            style={props.style}
            renderMatch={renderMatch}
        />
    )
}

function SingleSearchResult(props: SearchResult): ReactNode {
    const src = props.type === 'article' ? searchIconLink(props.typeIndex) : '/icons/search_icons/table.png'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <img height="25em" src={src} />
            <div>{props.longname}</div>
        </div>
    )
}

const workerTerminatorRegistry = new FinalizationRegistry<Worker>((worker) => { worker.terminate() })

type SearchWorker = (params: SearchParams) => Promise<SearchResult[]>

type AsyncConfig = Omit<SearchIndexConfig, 'cacheKey'> & { cacheKeyPromise: Promise<string | undefined> }

function createSearchWorker(config: AsyncConfig): SearchWorker {
    const worker = new Worker(new URL('../searchWorker', import.meta.url))
    const configured = config.cacheKeyPromise.then((cacheKey) => { worker.postMessage({ ...config, cacheKeyPromise: undefined, cacheKey }) })
    debugPerformance(`Requested new search worker at timestamp ${Date.now()}`)
    const messageQueue: ((results: SearchResult[]) => void)[] = []
    worker.addEventListener('message', (message: MessageEvent<SearchResult[]>) => {
        messageQueue.shift()!(message.data)
    })
    const result: SearchWorker = async (params) => {
        await configured
        worker.postMessage(params)
        return new Promise((resolve) => {
            messageQueue.push(resolve)
        })
    }
    workerTerminatorRegistry.register(result, worker)
    return result
}
