import { createIndex, SearchParams } from './search'

const search = await createIndex()

onmessage = (message: MessageEvent<SearchParams>) => {
    postMessage(search(message.data))
}
