import React, { CSSProperties, ReactElement, ReactNode, useMemo, useRef } from 'react'

import statistic_name_list from '../data/statistic_name_list'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { searchIconLink } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSettings } from '../page_template/settings'
import '../common.css'
import { SearchResult, SearchParams, debugPerformance, getIndexCacheKey } from '../search'
import { Universe, useUniverse } from '../universe'
import { TestUtils } from '../utils/TestUtils'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT, getCountsByArticleType } from './countsByArticleType'
import { forTypeByIndex } from './load-article'
import { GenericSearchBox } from './search-generic'

import used_geographies from '../data/mapper/used_geographies'

export function SearchBox(props: {
    onChange?: (inp: string) => void
    articleLink: (inp: string) => ReturnType<Navigator['link']>
    autoFocus: boolean
    placeholder: string
    style: CSSProperties
    prioritizeArticleType?: string
    onTextPresenceChange?: (hasText: boolean) => void
    shouldIncludeStatisticPages?: boolean
}): ReactNode {
    const colors = useColors()
    const showSettings = useSettings(['show_historical_cds', 'show_person_circles'])
    const universe = useUniverse()
    const extraStringsPromise = useMemo<Promise<[string[], StatisticPage[]] | undefined>>(() => {
        return computeStatisticsPages(props.shouldIncludeStatisticPages ?? false, universe)
    }, [props.shouldIncludeStatisticPages, universe])

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

    const renderMatch = (currentMatch: (() => SearchResult), onMouseOver: () => void, onClick: () => void, style: React.CSSProperties, dataTestId: string | undefined): ReactElement => (
        <a
            key={currentMatch().longname}
            {...props.articleLink(currentMatch().longname)}
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
            link={result => props.articleLink(result.longname)}
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
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '80%' }}>{props.longname}</div>
            <div style={{ width: '20%', textAlign: 'right' }}><img height="25em" src={searchIconLink(props.typeIndex)} /></div>
        </div>
    )
}

const workerTerminatorRegistry = new FinalizationRegistry<Worker>((worker) => { worker.terminate() })

interface StatisticPage {
    statisticName: string
    articleType: string
    universe: Universe
}

async function computeStatisticsPages(shouldIncludeStatisticsPages: boolean, universe: Universe | undefined): Promise<[string[], StatisticPage[]] | undefined> {
    const counts = shouldIncludeStatisticsPages ? await getCountsByArticleType() : undefined
    if (counts === undefined) {
        return undefined
    }
    const time = Date.now()
    const res = generateStatisticStrings(counts, universe)
    debugPerformance(`Generated statistic strings for universe ${universe} in ${Date.now() - time} ms`)
    return res
}

function generateStatisticStrings(counts: CountsByUT, universe: Universe | undefined): [string[], StatisticPage[]] {
    // Generate strings like "Population by Judicial District" for the given universe. If universe is undefined, try all universes
    const universes: readonly Universe[] = universe !== undefined ? [universe] : universes_ordered
    const names: string[] = []
    const pages: StatisticPage[] = []
    for (let i = 0; i < statistic_name_list.length; i++) {
        for (const articleType of used_geographies) {
            const u = findUniverse(counts, i, articleType, universes)
            if (u === undefined) {
                continue
            }
            const name = `${statistic_name_list[i]} by ${articleType}`
            names.push(name)
            pages.push({
                statisticName: statistic_name_list[i],
                articleType,
                universe: u,
            })
        }
    }
    return [names, pages]
}

function findUniverse(counts: CountsByUT, statIdx: number, articleType: string, universes: readonly Universe[]): Universe | undefined {
    // find the last universe in the list that ties with the maximum count
    let bestUniverse = undefined
    let bestCount = 1
    for (const universe of universes) {
        const count = forTypeByIndex(counts, universe, statIdx, articleType)
        if (count >= bestCount) {
            bestCount = count
            bestUniverse = universe
        }
    }
    return bestUniverse
}

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
