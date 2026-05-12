import { replaceInput } from './mapper-utils'
import { memoryUsage } from './memory_test_utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture('mapper', '/mapper.html')

test('counties USA', async (t) => {
    await replaceInput(t, 'Subnational Region', 'County')
    await t.expect(await memoryUsage(t)).lt(186_000_000)
})
