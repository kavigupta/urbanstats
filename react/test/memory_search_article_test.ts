import { californiaArticleThreshold, homePageThreshold, memoryMonitor, searchSize } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('go to article and return to under memory limit', async (t) => {
    const memory = await memoryMonitor(t)
    await t.expect(await memory()).lt(homePageThreshold)
    await t.click('#searchbox')
    await t.expect(await memory()).gt(homePageThreshold)
    await t.expect(await memory()).lt(homePageThreshold + searchSize)
    await t.typeText('#searchbox', 'California')
    await t.pressKey('enter')
    await t.expect(await memory()).lt(californiaArticleThreshold)
})
