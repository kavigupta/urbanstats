import { debugLog, safeReload, searchField, target, urbanstatsFixture, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('search cache', `${target}/`)

test('search index cache write survives the worker being dropped', async (t) => {
    // A readonly transaction held open from the page queues the worker's cache write behind it
    await t.eval(() => new Promise<void>((resolve) => {
        const open = indexedDB.open('SearchCache', 1)
        open.onupgradeneeded = () => { open.result.createObjectStore('indexes') }
        open.onsuccess = () => {
            const store = open.result.transaction('indexes', 'readonly').objectStore('indexes')
            const keepAlive = (): void => {
                if (!(window as unknown as { releaseSearchCache?: true }).releaseSearchCache) {
                    store.count().onsuccess = keepAlive
                }
            }
            keepAlive()
            resolve()
        }
    }))

    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)

    // With text in the box, blurring searches again in a new worker, which would write the cache itself
    await t.selectText(searchField).pressKey('delete')
    await t.eval(() => { (document.activeElement as HTMLElement).blur() })
    await t.wait(500) // onBlur is delayed
    await (await t.getCurrentCDPSession()).HeapProfiler.collectGarbage()
    await t.wait(1000) // FinalizationRegistry callbacks run after GC
    await t.eval(() => { (window as unknown as { releaseSearchCache?: true }).releaseSearchCache = true })

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
    while (afterReload === undefined) {
        await t.wait(100)
        afterReload = (await cacheResults()).find(({ tab }) => !tabsBeforeReload.has(tab))
    }
    await t.expect(afterReload.text).eql('Cache hit')
})
