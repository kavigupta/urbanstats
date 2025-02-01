import { memoryMonitor, homePageThreshold } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('under memory limit home page', async (t) => {
    const memory = await memoryMonitor(t)
    await t.expect(await memory()).lt(homePageThreshold)
})
