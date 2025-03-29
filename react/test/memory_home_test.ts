import { homePageSize, memoryUsage } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('under memory limit home page', async (t) => {
    await t.expect(await memoryUsage(t)).lt(homePageSize)
})
