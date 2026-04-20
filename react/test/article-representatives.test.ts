import { checkTextboxes, screencap, urbanstatsFixture } from './test_utils'

urbanstatsFixture('special elections', '/article.html?longname=TN-07+%282023%29%2C+USA')

test('special elections', async (t) => {
    await checkTextboxes(t, ['Election'])
    await screencap(t)
})

urbanstatsFixture('collapsed pair of representatives', '/article.html?longname=02139%2C+USA')

test('collapsed pair of representatives', async (t) => {
    await checkTextboxes(t, ['Election'])
    await screencap(t)
})
