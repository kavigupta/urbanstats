import React, { CSSProperties, ReactElement, ReactNode, useCallback, useMemo, useRef, useState } from 'react'

import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { searchIconLink, typesInOrder } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSettings } from '../page_template/settings'
import '../common.css'
import { SearchResult, SearchParams, debugPerformance, getIndexCacheKey, SearchIndexConfig } from '../search'
import type { SearchWorkerInputMessage, SearchWorkerOutputMessage, SearchWorkerStatus } from '../searchWorker'
import { Universe, useUniverse } from '../universe'
import { Property } from '../utils/Property'
import { TestUtils } from '../utils/TestUtils'

import { GenericSearchBox } from './search-generic'

const defaultWorkerStatusProperty = new Property<SearchWorkerStatus>({ status: 'ready' })

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

    const [workerStatusProperty, setWorkerStatusProperty] = useState(defaultWorkerStatusProperty)
    const workerStatus = workerStatusProperty.use()

    const createSearchWorkerIfNeeded = useCallback(() => {
        if (searchWorker.current === undefined || searchWorkerConfig.current?.cacheKeyPromise !== cacheKeyPromise || searchWorkerConfig.current.statsUniverse !== statsUniverse) {
            searchWorker.current = createSearchWorker({ cacheKeyPromise, statsUniverse })
            searchWorkerConfig.current = { cacheKeyPromise, statsUniverse }
            setWorkerStatusProperty(searchWorker.current.status)
        }
    }, [cacheKeyPromise, statsUniverse])

    const doSearch = useMemo(() => {
        return async (sq: string): Promise<SearchResult[]> => {
            if (sq === '') {
                return []
            }
            createSearchWorkerIfNeeded()
            TestUtils.shared.startLoading('doSearch')
            const result = await searchWorker.current!.executeSearch({
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
                setWorkerStatusProperty(defaultWorkerStatusProperty)
            }}
            onTextPresenceChange={props.onTextPresenceChange}
            autoFocus={props.autoFocus}
            placeholder={props.placeholder}
            style={props.style}
            renderMatch={renderMatch}
            loadingStatus={workerStatus.status !== 'ready' ? workerStatus.message : undefined}
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

interface SearchWorker {
    executeSearch: (params: SearchParams) => Promise<SearchResult[]>
    status: Property<SearchWorkerStatus>
}

type AsyncConfig = Omit<SearchIndexConfig, 'cacheKey'> & { cacheKeyPromise: Promise<string | undefined> }

function createSearchWorker(config: AsyncConfig): SearchWorker {
    const worker = new Worker(new URL('../searchWorker', import.meta.url))
    const { cacheKeyPromise, ...configWithoutPromise } = config
    const configured = cacheKeyPromise.then((cacheKey) => { worker.postMessage({ type: 'configure', config: { ...configWithoutPromise, cacheKey } } satisfies SearchWorkerInputMessage) })
    debugPerformance(`Requested new search worker at timestamp ${Date.now()}`)
    const messageQueue: ((results: SearchResult[]) => void)[] = []
    const statusProperty = new Property<SearchWorkerStatus>({ status: 'loading', message: 'Spawning worker...' })
    worker.addEventListener('message', (message: MessageEvent<SearchWorkerOutputMessage>) => {
        switch (message.data.type) {
            case 'result':
                messageQueue.shift()!(message.data.results)
                break
            case 'status':
                statusProperty.value = message.data.status
                break
        }
    })
    const result: SearchWorker = {
        executeSearch: async (params) => {
            await configured
            worker.postMessage({ type: 'search', params } satisfies SearchWorkerInputMessage)
            return new Promise((resolve) => {
                messageQueue.push(resolve)
            })
        },
        status: statusProperty,
    }
    workerTerminatorRegistry.register(result, worker)
    return result
}
