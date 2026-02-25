import { networkUsage } from './network_test_utils'
import { searchField, urbanstatsFixture, waitForSelectedSearchResult } from './test_utils'

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
