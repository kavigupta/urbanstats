import { californiaArticleSize, memoryUsage } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('california', '/article.html?longname=California%2C+USA&s=GczH23sVhzZkQid')

test('under memory limit california', async (t) => {
    await t.expect(await memoryUsage(t)).lt(californiaArticleSize)
})
