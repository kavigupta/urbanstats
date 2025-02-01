import { californiaArticleThreshold, memoryMonitor } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('california', '/article.html?longname=California%2C+USA&s=GczH23sVhzZkQid')

test('under memory limit california', async (t) => {
    const memory = await memoryMonitor(t)
    await t.expect(await memory()).lt(californiaArticleThreshold)
})
