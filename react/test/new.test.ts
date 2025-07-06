import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('longer article test', '/article.html?longname=California%2C+USA')

test('too long test', async (t) => {
    await t.wait(6 * 60 * 1000)
})

// Some trivial change
