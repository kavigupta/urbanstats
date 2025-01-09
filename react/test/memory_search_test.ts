import { compressedSearchIndexSize, getJSHeapSize, homePageThreshold } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('click away from search box and return to memory limit', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold)
    await t.click('#searchbox')
    await t.expect(await getJSHeapSize(t)).gt(homePageThreshold)
    await t.click('body')
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold + compressedSearchIndexSize)
})
