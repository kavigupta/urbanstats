import { createIndex, SearchIndexConfig, SearchParams } from './search'
import { debugPerformance } from './utils/search-performance'

debugPerformance(`Search worker starting at timestamp ${Date.now()}`)

let searchIndex: undefined | ReturnType<typeof createIndex>

onmessage = async (message: MessageEvent) => {
    if (searchIndex === undefined) {
        searchIndex = createIndex(message.data as SearchIndexConfig)
    }
    else {
        const search = await searchIndex // This maintains message ordering https://stackoverflow.com/questions/63427239/order-of-resolution-for-multiple-awaits-on-one-promise#comment138162017_63427370
        postMessage(search(message.data as SearchParams))
    }
}
