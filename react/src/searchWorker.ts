import { createIndex, SearchParams } from './search'

const workQueue: SearchParams[] = []

const search = createIndex()

async function flushWorkQueue(): Promise<void> {
    while (workQueue.length > 0) {
        postMessage((await search)(workQueue.shift()!))
    }
}

onmessage = (message: MessageEvent<SearchParams>) => {
    workQueue.push(message.data)
    void flushWorkQueue()
}

void search.then(() => flushWorkQueue())
