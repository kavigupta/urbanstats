import { gunzipSync } from 'zlib'

import data_links from './data/data_links'
import order_links from './data/order_links'
import statistic_path_list from './data/statistic_path_list'
import universes_ordered from './data/universes_ordered'
import { indexLink, orderingDataLink, orderingLink } from './navigation/links'
import { debugPerformance } from './search'
import { Universe } from './universe'
import { assert } from './utils/defensive'
import {
    Article, ConsolidatedShapes, CountsByArticleUniverseAndType, DataLists,
    Feature, IDataList, IOrderList, OrderList,
    OrderLists,
    QuizFullData,
    QuizQuestionTronche,
    SearchIndex,
    ArticleOrderingList,
    Symlinks,
    PointSeries,
    ArticleUniverseList,
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
export async function loadProtobuf(filePath: string, name: 'SearchIndex'): Promise<SearchIndex>
export async function loadProtobuf(filePath: string, name: 'QuizQuestionTronche'): Promise<QuizQuestionTronche>
export async function loadProtobuf(filePath: string, name: 'QuizFullData'): Promise<QuizFullData>
export async function loadProtobuf(filePath: string, name: 'CountsByArticleUniverseAndType'): Promise<CountsByArticleUniverseAndType>
export async function loadProtobuf(filePath: string, name: 'Symlinks'): Promise<Symlinks>
export async function loadProtobuf(filePath: string, name: 'PointSeries'): Promise<PointSeries>
export async function loadProtobuf(filePath: string, name: 'ArticleUniverseList'): Promise<ArticleUniverseList>
export async function loadProtobuf(filePath: string, name: string, errorOnMissing: boolean = true): Promise<Article | Feature | ArticleOrderingList | OrderLists | DataLists | ConsolidatedShapes | SearchIndex | QuizQuestionTronche | QuizFullData | CountsByArticleUniverseAndType | Symlinks | PointSeries | ArticleUniverseList | undefined> {
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
    else {
        throw new Error('protobuf type not recognized (see load_json.ts)')
    }
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
    return loadProtobuf(`/index/universes_${type}.gz`, 'ArticleUniverseList')
}

async function loadOrderingProtobuf(universe: string, statpath: string, type: string): Promise<IOrderList> {
    const universeIdx = universes_ordered.indexOf(universe as Universe)
    const links = order_links
    const key = `world__${type}`
    const idx = key in links ? pullKey(links[key], statpath) : 0
    const orderLink = orderingLink('world', type, idx)
    const orderLists = await loadProtobuf(orderLink, 'OrderLists')
    const index = orderLists.statnames.indexOf(statpath)
    const res = orderLists.orderLists[index]
    const universes = await loadUniverses(type)
    const orderIndices = res.orderIdxs?.filter(i => universes.universes[i].universeIdxs?.includes(universeIdx))
    return { orderIdxs: orderIndices }
}

async function loadOrderingDataProtobuf(universe: string, statpath: string, type: string): Promise<IDataList> {
    const links = data_links
    const key = `${universe}__${type}`
    const idx = key in links ? pullKey(links[key], statpath) : 0
    const orderLink = orderingDataLink(universe, type, idx)
    const dataLists = await loadProtobuf(orderLink, 'DataLists')
    const index = dataLists.statnames.indexOf(statpath)
    return dataLists.dataLists[index]
}

export interface ArticleOrderingListInternal {
    longnames: string[]
    typeIndices: number[]
}

export async function loadOrdering(universe: string, statpath: string, type: string): Promise<ArticleOrderingListInternal> {
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

export async function loadDataInIndexOrder(
    universe: string, statpath: string, type: string,
): Promise<number[]> {
    const dataPromise = loadOrderingDataProtobuf(universe, statpath, type)
    const orderingPromise = loadOrderingProtobuf(universe, statpath, type)
    const [data, ordering] = await Promise.all([dataPromise, orderingPromise])
    const dataList = data.value
    assert(Array.isArray(dataList), 'Data list must be an array')
    assert(Array.isArray(ordering.orderIdxs), 'Order indices must be an array')
    const orderIdxs = reindex(ordering.orderIdxs)
    // unsort data list, according to order indices
    const unsortedData = new Array<number>(orderIdxs.length)
    for (let i = 0; i < orderIdxs.length; i++) {
        const idx = orderIdxs[i]
        unsortedData[idx] = dataList[i]
    }
    return unsortedData
}

export async function loadStatisticsPage(
    statUniverse: string, statpath: string, articleType: string,
): Promise<[NormalizeProto<IDataList>, string[]]> {
    const data = loadOrderingDataProtobuf(statUniverse, statpath, articleType).then(result => result as NormalizeProto<IDataList>)
    const articleNames = loadOrdering(statUniverse, statpath, articleType).then(result => result.longnames)
    return [await data, await articleNames]
}
