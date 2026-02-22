import { gunzipSync } from 'zlib'

import data_links from './data/data_links'
import order_links from './data/order_links'
import statistic_path_list from './data/statistic_path_list'
import universes_ordered from './data/universes_ordered'
import { dataLink, indexLink, orderingDataLink, orderingLink } from './navigation/links'
import { debugPerformance } from './search'
import { Universe } from './universe'
import { assert } from './utils/defensive'
import {
    Article, ConsolidatedArticles, ConsolidatedShapes, CountsByArticleUniverseAndType, DataLists,
    Feature, IOrderList, OrderList,
    OrderLists,
    QuizFullData,
    QuizQuestionTronche,
    SearchIndex,
    ArticleOrderingList,
    Symlinks,
    PointSeries,
    ArticleUniverseList,
    DefaultUniverseTable,
} from './utils/protos'
import { NormalizeProto } from './utils/types'

// from https://stackoverflow.com/a/4117299/1549476

// Load JSON text from server hosted file and return JSON parsed object
export async function loadJSON(filePath: string): Promise<unknown> {
    const response = await fetch(filePath, { headers: { 'Content-Type': 'application/json' } })
    if (response.status < 200 || response.status > 299) {
        throw new Error(`Expected response status 2xx for ${filePath}, got ${response.status}: ${response.statusText}`)
    }
    return response.json()
}

// Load a protobuf file from the server
export async function loadProtobuf(filePath: string, name: 'Article', errorOnMissing: boolean): Promise<Article | undefined>
export async function loadProtobuf(filePath: string, name: 'Feature', errorOnMissing: boolean): Promise<Feature>
export async function loadProtobuf(filePath: string, name: 'ArticleOrderingList'): Promise<ArticleOrderingList>
export async function loadProtobuf(filePath: string, name: 'OrderLists'): Promise<OrderLists>
export async function loadProtobuf(filePath: string, name: 'DataLists'): Promise<DataLists>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedShapes'): Promise<ConsolidatedShapes>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedShapes', errorOnMissing: boolean): Promise<ConsolidatedShapes | undefined>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedArticles'): Promise<ConsolidatedArticles>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedArticles', errorOnMissing: boolean): Promise<ConsolidatedArticles | undefined>
export async function loadProtobuf(filePath: string, name: 'SearchIndex'): Promise<SearchIndex>
export async function loadProtobuf(filePath: string, name: 'QuizQuestionTronche'): Promise<QuizQuestionTronche>
export async function loadProtobuf(filePath: string, name: 'QuizFullData'): Promise<QuizFullData>
export async function loadProtobuf(filePath: string, name: 'CountsByArticleUniverseAndType'): Promise<CountsByArticleUniverseAndType>
export async function loadProtobuf(filePath: string, name: 'Symlinks'): Promise<Symlinks>
export async function loadProtobuf(filePath: string, name: 'PointSeries'): Promise<PointSeries>
export async function loadProtobuf(filePath: string, name: 'ArticleUniverseList'): Promise<ArticleUniverseList>
export async function loadProtobuf(filePath: string, name: 'DefaultUniverseTable'): Promise<DefaultUniverseTable>
export async function loadProtobuf(filePath: string, name: string, errorOnMissing: boolean = true): Promise<Article | Feature | ArticleOrderingList | OrderLists | DataLists | ConsolidatedShapes | ConsolidatedArticles | SearchIndex | QuizQuestionTronche | QuizFullData | CountsByArticleUniverseAndType | Symlinks | PointSeries | ArticleUniverseList | DefaultUniverseTable | undefined> {
    let perfCheckpoint = performance.now()

    const response = await fetch(filePath)
    if (response.status < 200 || response.status > 299) {
        if (!errorOnMissing) {
            return undefined
        }
        throw new Error(`Expected response status 2xx for ${filePath}, got ${response.status}: ${response.statusText}`)
    }

    const compressedBuffer = await response.arrayBuffer()

    if (name === 'SearchIndex') {
        debugPerformance(`Took ${performance.now() - perfCheckpoint}ms networking to load search index`)
    }
    perfCheckpoint = performance.now()

    const buffer = gunzipSync(Buffer.from(compressedBuffer))
    const arr = new Uint8Array(buffer)

    if (name === 'SearchIndex') {
        debugPerformance(`Took ${performance.now() - perfCheckpoint}ms to decompress search index`)
    }
    perfCheckpoint = performance.now()

    if (name === 'Article') {
        return Article.decode(arr)
    }
    else if (name === 'Feature') {
        return Feature.decode(arr)
    }
    else if (name === 'ArticleOrderingList') {
        return ArticleOrderingList.decode(arr)
    }
    else if (name === 'OrderLists') {
        return OrderLists.decode(arr)
    }
    else if (name === 'DataLists') {
        return DataLists.decode(arr)
    }
    else if (name === 'ConsolidatedShapes') {
        return ConsolidatedShapes.decode(arr)
    }
    else if (name === 'ConsolidatedArticles') {
        return ConsolidatedArticles.decode(arr)
    }
    else if (name === 'SearchIndex') {
        const result = SearchIndex.decode(arr)
        debugPerformance(`Took ${performance.now() - perfCheckpoint}ms to decode search index`)
        return result
    }
    else if (name === 'QuizQuestionTronche') {
        return QuizQuestionTronche.decode(arr)
    }
    else if (name === 'QuizFullData') {
        return QuizFullData.decode(arr)
    }
    else if (name === 'CountsByArticleUniverseAndType') {
        return CountsByArticleUniverseAndType.decode(arr)
    }
    else if (name === 'Symlinks') {
        return Symlinks.decode(arr)
    }
    else if (name === 'PointSeries') {
        return PointSeries.decode(arr)
    }
    else if (name === 'ArticleUniverseList') {
        return ArticleUniverseList.decode(arr)
    }
    else if (name === 'DefaultUniverseTable') {
        return DefaultUniverseTable.decode(arr)
    }
    else {
        throw new Error('protobuf type not recognized (see load_json.ts)')
    }
}

// Consolidated shard: one gzipped proto (ConsolidatedArticles or ConsolidatedShapes). Cache decoded shard by URL.
const shardCache = new Map<string, ConsolidatedArticles | ConsolidatedShapes>()

async function getConsolidatedArticlesShard(shardUrl: string): Promise<ConsolidatedArticles | undefined> {
    const cached = shardCache.get(shardUrl)
    if (cached && 'articles' in cached) return cached
    const shard = await loadProtobuf(shardUrl, 'ConsolidatedArticles', false)
    if (shard === undefined) return undefined
    shardCache.set(shardUrl, shard)
    return shard
}

async function getConsolidatedShapesShard(shardUrl: string): Promise<ConsolidatedShapes | undefined> {
    const cached = shardCache.get(shardUrl)
    if (cached && 'shapes' in cached) return cached
    const shard = await loadProtobuf(shardUrl, 'ConsolidatedShapes', false)
    if (shard === undefined) return undefined
    shardCache.set(shardUrl, shard)
    return shard
}

/** Load one article from a consolidated shard (fetch whole .gz via loadProtobuf, find by longname). Resolves symlinks to target. */
export async function loadArticleFromConsolidatedShard(shardUrl: string, longname: string): Promise<Article | undefined> {
    const shard = await getConsolidatedArticlesShard(shardUrl)
    if (!shard) return undefined
    const idx = shard.longnames.indexOf(longname)
    if (idx >= 0) return shard.articles[idx] as Article
    const symIdx = shard.symlinkLinkNames?.indexOf(longname) ?? -1
    if (symIdx >= 0 && shard.symlinkTargetNames) {
        const target = shard.symlinkTargetNames[symIdx]
        return loadArticleFromConsolidatedShard(dataLink(target), target)
    }
    return undefined
}

/** Load one shape from a consolidated shard (fetch whole .gz via loadProtobuf, find by longname). */
export async function loadFeatureFromConsolidatedShard(shardUrl: string, longname: string): Promise<Feature | undefined> {
    const shard = await getConsolidatedShapesShard(shardUrl)
    if (!shard) return undefined
    const idx = shard.longnames.indexOf(longname)
    return idx >= 0 ? (shard.shapes[idx] as Feature) : undefined
}

function pullKey(arr: number[], key: string): number {
    const idx = statistic_path_list.indexOf(key as ElementOf<typeof statistic_path_list>)
    if (idx === -1) {
        throw new Error(`statistic path not found: ${key}`)
    }
    let current = 0
    for (let i = 0; i < arr.length; i++) {
        current += arr[i]
        if (idx < current) {
            return i
        }
    }
    throw new Error('index not found')
}

export async function loadUniverses(type: string): Promise<ArticleUniverseList> {
    return loadProtobuf(`/universes/${type}.gz`, 'ArticleUniverseList')
}

async function loadOrderingProtobuf(universe: Universe, statpath: string, type: string): Promise<IOrderList> {
    const universeIdx = universes_ordered.indexOf(universe)
    const links = order_links
    const idx = type in links ? pullKey(links[type], statpath) : 0
    const orderLink = orderingLink(type, idx)
    const orderLists = await loadProtobuf(orderLink, 'OrderLists')
    const index = orderLists.statnames.indexOf(statpath)
    const res = orderLists.orderLists[index]
    const universes = await loadUniverses(type)
    const orderIndices = res.orderIdxs?.filter(i => universes.universes[i].universeIdxs?.includes(universeIdx))
    return { orderIdxs: orderIndices }
}

export async function loadOrderingDataProtobuf(universe: Universe, statpath: string, type: string): Promise<{
    value: number[]
    populationPercentile: number[]
}> {
    const links = data_links
    const idx = type in links ? pullKey(links[type], statpath) : 0
    const orderLink = orderingDataLink(type, idx)
    const dataLists = await loadProtobuf(orderLink, 'DataLists')
    const index = dataLists.statnames.indexOf(statpath)
    const res = dataLists.dataLists[index]
    const universeIdx = universes_ordered.indexOf(universe)
    const universes = await loadUniverses(type)
    return {
        value: res.value!.filter((_, i) => universes.universes[i].universeIdxs?.includes(universeIdx)),
        populationPercentile: res.populationPercentileByUniverse!.flatMap((_, i) => {
            const universeIndex = universes.universes[i].universeIdxs!.indexOf(universeIdx)
            if (universeIndex === -1) {
                return []
            }
            return [res.populationPercentileByUniverse![i].populationPercentile![universeIndex]]
        }),
    }
}

export async function loadDataInIndexOrder(
    universe: Universe, statpath: string, type: string,
): Promise<[number[], number[]]> {
    const dataPromise = await loadOrderingDataProtobuf(universe, statpath, type)
    return [dataPromise.value, dataPromise.populationPercentile]
}

export interface ArticleOrderingListInternal {
    longnames: string[]
    typeIndices: number[]
}

export async function loadOrdering(universe: Universe, statpath: string, type: string): Promise<ArticleOrderingListInternal> {
    const idxLink = indexLink('world', type)
    const dataPromise = loadProtobuf(idxLink, 'ArticleOrderingList')
    const orderingPromise = loadOrderingProtobuf(universe, statpath, type)
    const [data, ordering] = await Promise.all([dataPromise, orderingPromise])
    const namesInOrder = (ordering as OrderList).orderIdxs.map((i: number) => data.longnames[i])
    const typesInOrder = (ordering as OrderList).orderIdxs.map((i: number) => data.types[i])
    return { longnames: namesInOrder, typeIndices: typesInOrder }
}

/**
 * Returns an array `r` where r contains numbers 0..length-1, but such that
 * iff indices[i] < indices[j], then r[i] < r[j]
 *
 * I.e., it returns the argsort of the argsort of indices.
 */
function reindex(indices: number[]): number[] {
    const pairs = indices.map((value, index) => ({ value, index }))
    pairs.sort((a, b) => a.value - b.value)
    const result = new Array<number>(indices.length)
    for (let i = 0; i < pairs.length; i++) {
        result[pairs[i].index] = i
    }
    return result
}

export async function loadStatisticsPage(
    statUniverse: Universe, statpath: string, articleType: string,
): Promise<[NormalizeProto<{ value: number[], populationPercentile: number[] }>, string[]]> {
    const orderingOriginal = await loadOrderingProtobuf(statUniverse, statpath, articleType)
    const ordering = await loadOrdering(statUniverse, statpath, articleType)
    const orderingData = await loadOrderingDataProtobuf(statUniverse, statpath, articleType)
    assert(Array.isArray(orderingOriginal.orderIdxs), 'Ordering original must be an array')
    const reorder = reindex(orderingOriginal.orderIdxs)
    const articleNames = ordering.longnames
    return [
        {
            value: reorder.map(i => orderingData.value[i]),
            populationPercentile: reorder.map(i => orderingData.populationPercentile[i]),
        },
        articleNames,
    ]
}
