import { californiaArticleThreshold, getJSHeapSize } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('california', '/article.html?longname=California%2C+USA&s=GczH23sVhzZkQid')

test('under memory limit california', async (t) => {
    await t.expect(await getJSHeapSize(t)).lt(californiaArticleThreshold)
})
