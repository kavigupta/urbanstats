import { urbanstatsFixture } from './test_utils'

async function getJSHeapSize(t: TestController): Promise<number> {
    await t.wait(1000) // Wait for page to load
    const cdpSession = await t.getCurrentCDPSession()
    await cdpSession.HeapProfiler.collectGarbage()
    await t.wait(1000) // Wait for garbage collect
    const bytesUsed = await t.eval(() => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize) as number
    console.warn(`Bytes used: ${bytesUsed}`)
    return bytesUsed
}

urbanstatsFixture('home page', '/')

test('under memory limit home page', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(35_000_000)
})

urbanstatsFixture('california', '/article.html?longname=California%2C+USA&s=GczH23sVhzZkQid')

test('under memory limit california', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(66_000_000)
})
