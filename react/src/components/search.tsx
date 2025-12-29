import React, { CSSProperties, ReactElement, ReactNode, useMemo, useRef } from 'react'

import type_ordering_idx from '../data/type_ordering_idx'
import { Navigator } from '../navigation/Navigator'
import { searchIconLink } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSettings } from '../page_template/settings'
import '../common.css'
import { SearchResult, SearchParams, debugPerformance, getIndexCacheKey } from '../search'
import { Universe, useUniverse } from '../universe'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { GenericSearchBox } from './search-generic'
import { computeStatisticsPages, StatisticPage } from './search-statistic'

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
    const extraStringsPromise = useMemo<Promise<[string[], StatisticPage[]] | undefined>>(() => {
        return computeStatisticsPages(props.statisticLink !== undefined, universe)
    }, [props.statisticLink, universe])

    const extraStrings = useOrderedResolve<[string[], StatisticPage[]] | undefined>(extraStringsPromise).result

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
            TestUtils.shared.startLoading()
            const result = await (await searchWorker.current)({
                unnormalizedPattern: sq,
                maxResults: 10,
                showSettings,
                prioritizeTypeIndex: props.prioritizeArticleType !== undefined ? type_ordering_idx[props.prioritizeArticleType] : undefined,
                extraStrings: extraStrings === undefined ? undefined : extraStrings[0],
            })
            void TestUtils.shared.finishLoading()
            return result
        }
    }, [searchWorker, cacheKey, showSettings, props.prioritizeArticleType, extraStrings])

    function link(sr: SearchResult): ReturnType<Navigator['link']> {
        if (sr.type === 'article') {
            return props.articleLink(sr.longname)
        }
        assert(extraStrings !== undefined && props.statisticLink !== undefined, 'this should never happen!')
        const res = extraStrings[1][sr.index]
        return props.statisticLink(res.statisticIndex, res.articleType, res.universe)
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
                if (searchWorker.current === undefined) {
                    searchWorker.current = cacheKey.then(createSearchWorker)
                }
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
