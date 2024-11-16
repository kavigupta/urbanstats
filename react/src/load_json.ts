import { gunzipSync } from 'zlib'

import data_links from './data/data_links'
import order_links from './data/order_links'
import { index_link, ordering_data_link, ordering_link } from './navigation/links'
import {
    Article, ConsolidatedShapes, ConsolidatedStatistics, DataLists,
    Feature, IDataList, IOrderList, OrderList,
    OrderLists,
    SearchIndex,
    StringList,
} from './utils/protos'

// from https://stackoverflow.com/a/4117299/1549476

// Load JSON text from server hosted file and return JSON parsed object
export async function loadJSON(filePath: string): Promise<unknown> {
    const response = await fetch(filePath, { headers: { 'Content-Type': 'application/json' } })
    if (response.status !== 200) {
        throw new Error(`Expected response status 200, got ${response.status}: ${response.statusText}`)
    }
    return response.json()
}

// Load a protobuf file from the server
export async function loadProtobuf(filePath: string, name: 'Article'): Promise<Article>
export async function loadProtobuf(filePath: string, name: 'Feature'): Promise<Feature>
export async function loadProtobuf(filePath: string, name: 'StringList'): Promise<StringList>
export async function loadProtobuf(filePath: string, name: 'OrderLists'): Promise<OrderLists>
export async function loadProtobuf(filePath: string, name: 'DataLists'): Promise<DataLists>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedShapes'): Promise<ConsolidatedShapes>
export async function loadProtobuf(filePath: string, name: 'ConsolidatedStatistics'): Promise<ConsolidatedStatistics>
export async function loadProtobuf(filePath: string, name: 'SearchIndex'): Promise<SearchIndex>
export async function loadProtobuf(filePath: string, name: string): Promise<Article | Feature | StringList | OrderLists | DataLists | ConsolidatedShapes | ConsolidatedStatistics | SearchIndex> {
    const response = await fetch(filePath)
    const compressed_buffer = await response.arrayBuffer()
    const buffer = gunzipSync(Buffer.from(compressed_buffer))
    const arr = new Uint8Array(buffer)
    if (name === 'Article') {
        return Article.decode(arr)
    }
    else if (name === 'Feature') {
        return Feature.decode(arr)
    }
    else if (name === 'StringList') {
        return StringList.decode(arr)
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
    else {
        throw new Error('protobuf type not recognized (see load_json.ts)')
    }
}

export async function load_ordering_protobuf(universe: string, statpath: string, type: string, is_data: true): Promise<IDataList>
export async function load_ordering_protobuf(universe: string, statpath: string, type: string, is_data: boolean): Promise<IOrderList>
export async function load_ordering_protobuf(universe: string, statpath: string, type: string, is_data: boolean): Promise<IDataList | IOrderList> {
    const links = is_data ? data_links : order_links
    const key = `${universe}__${type}__${statpath}`
    const idx = key in links ? links[key] : 0
    const order_link = is_data ? ordering_data_link(universe, type, idx) : ordering_link(universe, type, idx)
    if (is_data) {
        const dataLists = await loadProtobuf(order_link, 'DataLists')
        const index = dataLists.statnames.indexOf(statpath)
        return dataLists.dataLists[index]
    }
    else {
        const orderLists = await loadProtobuf(order_link, 'OrderLists')
        const index = orderLists.statnames.indexOf(statpath)
        return orderLists.orderLists[index]
    }
}

export async function load_ordering(universe: string, statpath: string, type: string): Promise<string[]> {
    const idx_link = index_link(universe, type)
    const data_promise = loadProtobuf(idx_link, 'StringList')
    const ordering_promise = load_ordering_protobuf(universe, statpath, type, false)
    const [data, ordering] = await Promise.all([data_promise, ordering_promise])
    const names_in_order = (ordering as OrderList).orderIdxs.map((i: number) => data.elements[i])
    return names_in_order
}
