import { californiaArticleSize, homePageSize, memoryUsage, searchSize } from './memory_test_utils'
import { urbanstatsFixture, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('home page', '/')

test('go to article and return to under memory limit', async (t) => {
    await t.expect(await memoryUsage(t)).lt(homePageSize)
    await t.click('#searchbox')
    const searchUsage = await memoryUsage(t)
    await t.expect(searchUsage).gt(homePageSize)
    await t.expect(searchUsage).lt(homePageSize + searchSize)
    await t.typeText('#searchbox', 'California')
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
    await t.expect(await memoryUsage(t)).lt(californiaArticleSize)
})
