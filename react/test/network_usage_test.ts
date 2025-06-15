import { networkUsage } from './network_test_utils'
import { doSearch, urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', '/')

test('under network limit home page navigate to california', async (t) => {
    const getNetworkUsage = await networkUsage(t)
    await t.navigateTo('/')
    await t.wait(5000)
    await t.expect(getNetworkUsage()).lt(600_000)
    await doSearch(t, 'california')
    await t.wait(5000)
    await t.expect(getNetworkUsage()).lt(3_500_000)
})
