import { memoryMonitor, homePageThreshold, searchSize } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('click away from search box and return to memory limit', async (t) => {
    const memory = await memoryMonitor(t)
    await t.expect(await memory()).lt(homePageThreshold)
    await t.click('#searchbox')
    await t.expect(await memory()).lt(homePageThreshold + searchSize)
    await t.click('body')
    await t.expect(await memory()).lt(homePageThreshold)
})
