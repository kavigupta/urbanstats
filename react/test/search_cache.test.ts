import { debugLog, safeReload, searchField, target, urbanstatsFixture, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('search cache', `${target}/`)

// Queues the worker's conflicting transactions on the search cache until releaseSearchCache
async function holdSearchCache(t: TestController, mode: IDBTransactionMode): Promise<void> {
    await t.eval(() => new Promise<void>((resolve) => {
        const open = indexedDB.open('SearchCache', 1)
        open.onupgradeneeded = () => { open.result.createObjectStore('indexes') }
        open.onsuccess = () => {
            const store = open.result.transaction('indexes', mode).objectStore('indexes')
            const keepAlive = (): void => {
                if (!(window as unknown as { releaseSearchCache?: true }).releaseSearchCache) {
                    store.count().onsuccess = keepAlive
                }
            }
            keepAlive()
            resolve()
        }
    }), { dependencies: { mode } })
}

async function releaseSearchCache(t: TestController): Promise<void> {
    await t.eval(() => { (window as unknown as { releaseSearchCache?: true }).releaseSearchCache = true })
}

test('search index cache write survives the worker being dropped', async (t) => {
    // Lets the worker read the cache but not write it
    await holdSearchCache(t, 'readonly')

    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)

    await t.eval(() => { (document.activeElement as HTMLElement).blur() })
    await t.wait(500) // onBlur is delayed
    await (await t.getCurrentCDPSession()).HeapProfiler.collectGarbage()
    await t.wait(1000) // FinalizationRegistry callbacks run after GC
    await releaseSearchCache(t)

    const cacheResults = async (): Promise<{ tab: string, text: string }[]> => (await debugLog())
        .filter(({ text }) => text === 'Cache hit' || text === 'Cache miss' || text.includes('write index to cache'))
    let results = await cacheResults()
    for (let attempt = 0; attempt < 100 && !results.some(({ text }) => text.includes('write index to cache')); attempt++) {
        await t.wait(100)
        results = await cacheResults()
    }
    await t.expect(results[0].text).eql('Cache miss')
    await t.expect(results.some(({ text }) => /^Took .*ms to write index to cache$/.test(text))).ok()

    await safeReload(t)
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)

    const tabsBeforeReload = new Set(results.map(({ tab }) => tab))
    let afterReload: { tab: string, text: string } | undefined
    for (let attempt = 0; attempt < 100 && afterReload === undefined; attempt++) {
        await t.wait(100)
        afterReload = (await cacheResults()).find(({ tab }) => !tabsBeforeReload.has(tab))
    }
    await t.expect(afterReload?.text).eql('Cache hit')
})

test('refocusing reuses a search worker that is still building', async (t) => {
    // Stops the worker from reading the cache, so it can't finish building
    await holdSearchCache(t, 'readwrite')

    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await t.eval(() => { (document.activeElement as HTMLElement).blur() })
    await t.wait(500) // onBlur is delayed
    await t.click(searchField)
    await releaseSearchCache(t)
    await waitForSelectedSearchResult(t)

    const workerRequests = (await debugLog()).filter(({ text }) => text.startsWith('Requested new search worker'))
    await t.expect(workerRequests.filter(({ tab }) => tab === workerRequests.at(-1)!.tab).length).eql(1)
})
