import { replaceInput } from './mapper-utils'
import { memoryUsage } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('mapper', '/mapper.html')

test('metropolitan clusters china', async (t) => {
    await replaceInput(t, 'USA', 'China')
    await replaceInput(t, 'Subnational Region', 'Metropolitan Cluster')
    await t.expect(await memoryUsage(t)).lt(210_000_000)
})
