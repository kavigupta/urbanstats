import { createIndex, SearchParams } from './search'

const searchIndex = createIndex()

onmessage = async (message: MessageEvent<SearchParams>) => {
    const search = await searchIndex // This maintains message ordering https://stackoverflow.com/questions/63427239/order-of-resolution-for-multiple-awaits-on-one-promise#comment138162017_63427370
    postMessage(search(message.data))
}
