import { getJSHeapSize, homePageThreshold } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('under memory limit home page', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(homePageThreshold)
})
