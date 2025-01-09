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

const homePageThreshold = 35_000_000
const compressedSearchIndexSize = 3_000_000
const californiaArticleThreshold = 66_000_000

urbanstatsFixture('home page', '/')

test('under memory limit home page', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold)
})

test('click away from search box and return to memory limit', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold)
    await t.click('#searchbox')
    await t.expect(await getJSHeapSize(t)).gt(homePageThreshold)
    await t.click('body')
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold + compressedSearchIndexSize)
})

test('go to article and return to under memory limit', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold)
    await t.click('#searchbox')
    await t.expect(await getJSHeapSize(t)).gt(homePageThreshold)
    await t.typeText('#searchbox', 'California').pressKey('enter')
    await t.expect(await getJSHeapSize(t)).lt(californiaArticleThreshold)
})

urbanstatsFixture('california', '/article.html?longname=California%2C+USA&s=GczH23sVhzZkQid')

test('under memory limit california', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(californiaArticleThreshold)
})
