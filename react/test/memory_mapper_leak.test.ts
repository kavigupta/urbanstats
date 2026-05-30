import { replaceInput } from './mapper-utils'
import { memoryUsage } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('mapper', '/mapper.html')

test('counties USA', async (t) => {
    await replaceInput(t, 'USA', 'California, USA')
    await replaceInput(t, 'Subnational Region', 'Metropolitan Cluster')
    await replaceInput(t, 'California, USA', 'Asia')
    await replaceInput(t, 'Asia', 'USA')
    await replaceInput(t, 'Metropolitan Cluster', 'County')
    await t.expect(await memoryUsage(t)).lt(185_000_000)
})
