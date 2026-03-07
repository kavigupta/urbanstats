import { networkUsage } from './network_test_utils'
import { getLocation, searchField, target, urbanstatsFixture, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('home page', '/')

test('under network limit home page navigate to california', async (t) => {
    const flushNetworkUsage = await networkUsage(t)
    await t.navigateTo('/')
    await t.expect(await flushNetworkUsage('home')).lt(600_000)
    await t.typeText(searchField, 'california')
    await waitForSelectedSearchResult(t)
    await t.expect(await flushNetworkUsage('search')).lt(2_800_000)
    await t.pressKey('enter')
    await t.expect(await flushNetworkUsage('article')).lt(2_600_000)
})

test('under network limit stat counties by population', async (t) => {
    const flushNetworkUsage = await networkUsage(t)
    await t.navigateTo('/')
    await t.typeText(searchField, 'county area')
    await waitForSelectedSearchResult(t)
    await t.expect(await flushNetworkUsage('search')).lt(3_400_000)
    await t.pressKey('enter')
    await t.expect(getLocation()).eql(`${target}/statistic.html?statname=Area&article_type=County&start=1&amount=20&universe=USA`)
    await t.expect(await flushNetworkUsage('stat')).lt(1_700_00)
})
