import { target, getLocation, urbanstatsFixture } from './test_utils'

urbanstatsFixture('random', `${target}/random.html?sampleby=population&us_only=true`)

test('random-usa', async (t) => {
    // wait for load
    await t.wait(1000)
    // contains article
    await t.expect(getLocation())
        .contains('/article.html?longname=')
    // location should not include &universe=
    await t.expect(getLocation())
        .notContains('&universe=')
})
