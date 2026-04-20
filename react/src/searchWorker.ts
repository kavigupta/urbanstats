import { createIndex, SearchIndexConfig, SearchParams, SearchResult } from './search'
import { assert } from './utils/defensive'
import { debugPerformance } from './utils/search-performance'

export type SearchWorkerInputMessage = { type: 'configure', config: SearchIndexConfig } | { type: 'search', params: SearchParams }
export type SearchWorkerOutputMessage = { type: 'result', results: SearchResult[] } | { type: 'status', status: SearchWorkerStatus }
export type SearchWorkerStatus = { status: 'ready' } | { status: 'loading', message: string }

debugPerformance(`Search worker starting at timestamp ${Date.now()}`)

let searchIndex: undefined | ReturnType<typeof createIndex>

onmessage = async (message: MessageEvent) => {
    const contents = message.data as SearchWorkerInputMessage
    if (searchIndex === undefined) {
        assert(contents.type === 'configure', 'First message must be a configuration message')
        searchIndex = createIndex(contents.config)
    }
    else {
        assert(contents.type === 'search', 'Subsequent messages must be search requests')
        const search = await searchIndex // This maintains message ordering https://stackoverflow.com/questions/63427239/order-of-resolution-for-multiple-awaits-on-one-promise#comment138162017_63427370
        postMessage({ type: 'result', results: search(contents.params) } satisfies SearchWorkerOutputMessage)
    }
}
