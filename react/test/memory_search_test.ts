import { homePageSize, searchSize, memoryUsage } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('click away from search box and return to memory limit', async (t) => {
    await t.expect(await memoryUsage(t)).lt(homePageSize)
    await t.click('#searchbox')
    await t.expect(await memoryUsage(t)).gt(homePageSize)
    await t.expect(await memoryUsage(t)).lt(homePageSize + searchSize)
    await t.click('body')
    await t.expect(await memoryUsage(t)).lt(homePageSize)
})
