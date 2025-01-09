import { californiaArticleThreshold, compressedSearchIndexSize, getJSHeapSize, homePageThreshold } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('go to article and return to under memory limit', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold)
    await t.click('#searchbox')
    await t.expect(await getJSHeapSize(t)).gt(homePageThreshold)
    await t.typeText('#searchbox', 'California').pressKey('enter')
    await t.expect(await getJSHeapSize(t)).lt(californiaArticleThreshold + compressedSearchIndexSize)
})
