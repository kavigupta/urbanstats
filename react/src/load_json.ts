import { gunzipSync } from 'zlib'

import data_links from './data/data_links'
import order_links from './data/order_links'
import statistic_path_list from './data/statistic_path_list'
import { indexLink, orderingDataLink, orderingLink } from './navigation/links'
import {
    Article, ConsolidatedShapes, ConsolidatedStatistics, CountsByArticleUniverseAndType, DataLists,
    Feature, IDataList, IOrderList, OrderList,
    OrderLists,
    QuizFullData,
    QuizQuestionTronche,
    SearchIndex,
    ArticleOrderingList,
    Symlinks,
} from './utils/protos'

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
export async function loadProtobuf(filePath: string, name: 'Feature'): Promise<Feature>
export async function loadProtobuf(filePath: string, name: 'ArticleOrderingList'): Promise<ArticleOrderingList>
export async function loadProtobuf(filePath: string, name: 'OrderLists'): Promise<OrderLists>
export async function loadProtobuf(filePath: string, name: 'DataLists'): Promise<DataLists>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedShapes'): Promise<ConsolidatedShapes>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedStatistics'): Promise<ConsolidatedStatistics>
export async function loadProtobuf(filePath: string, name: 'SearchIndex'): Promise<SearchIndex>
export async function loadProtobuf(filePath: string, name: 'QuizQuestionTronche'): Promise<QuizQuestionTronche>
export async function loadProtobuf(filePath: string, name: 'QuizFullData'): Promise<QuizFullData>
export async function loadProtobuf(filePath: string, name: 'CountsByArticleUniverseAndType'): Promise<CountsByArticleUniverseAndType>
export async function loadProtobuf(filePath: string, name: 'Symlinks', errorOnMissing: boolean): Promise<Symlinks | undefined>
export async function loadProtobuf(filePath: string, name: string, errorOnMissing: boolean = true): Promise<Article | Feature | ArticleOrderingList | OrderLists | DataLists | ConsolidatedShapes | ConsolidatedStatistics | SearchIndex | QuizQuestionTronche | QuizFullData | CountsByArticleUniverseAndType | Symlinks | undefined> {
    const response = await fetch(filePath)
    if (response.status < 200 || response.status > 299) {
        if (!errorOnMissing) {
            return undefined
        }
        throw new Error(`Expected response status 2xx for ${filePath}, got ${response.status}: ${response.statusText}`)
    }
    const compressedBuffer = await response.arrayBuffer()
    const buffer = gunzipSync(Buffer.from(compressedBuffer))
    const arr = new Uint8Array(buffer)
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
    else if (name === 'ConsolidatedStatistics') {
        return ConsolidatedStatistics.decode(arr)
    }
    else if (name === 'SearchIndex') {
        return SearchIndex.decode(arr)
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

export async function loadOrderingProtobuf(universe: string, statpath: string, type: string, isData: true): Promise<IDataList>
export async function loadOrderingProtobuf(universe: string, statpath: string, type: string, isData: boolean): Promise<IOrderList>
export async function loadOrderingProtobuf(universe: string, statpath: string, type: string, isData: boolean): Promise<IDataList | IOrderList> {
    const links = isData ? data_links : order_links
    const key = `${universe}__${type}`
    const idx = key in links ? pullKey(links[key], statpath) : 0
    const orderLink = isData ? orderingDataLink(universe, type, idx) : orderingLink(universe, type, idx)
    if (isData) {
        const dataLists = await loadProtobuf(orderLink, 'DataLists')
        const index = dataLists.statnames.indexOf(statpath)
        return dataLists.dataLists[index]
    }
    else {
        const orderLists = await loadProtobuf(orderLink, 'OrderLists')
        const index = orderLists.statnames.indexOf(statpath)
        return orderLists.orderLists[index]
    }
}

export interface ArticleOrderingListInternal {
    longnames: string[]
    typeIndices: number[]
}

export async function loadOrdering(universe: string, statpath: string, type: string): Promise<ArticleOrderingListInternal> {
    const idxLink = indexLink(universe, type)
    const dataPromise = loadProtobuf(idxLink, 'ArticleOrderingList')
    const orderingPromise = loadOrderingProtobuf(universe, statpath, type, false)
    const [data, ordering] = await Promise.all([dataPromise, orderingPromise])
    const namesInOrder = (ordering as OrderList).orderIdxs.map((i: number) => data.longnames[i])
    const typesInOrder = (ordering as OrderList).orderIdxs.map((i: number) => data.types[i])
    return { longnames: namesInOrder, typeIndices: typesInOrder }
}
