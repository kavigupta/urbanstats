import { loadProtobuf } from './load_json'
import { processRawSearchIndex } from './search'

const start = performance.now()
const rawIndex = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
const processedIndex = processRawSearchIndex(rawIndex)
console.log(`Took ${performance.now() - start}ms to load search index`)

postMessage(processedIndex)
