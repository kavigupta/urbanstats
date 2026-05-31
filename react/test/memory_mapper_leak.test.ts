import { replaceInput } from './mapper-utils'
import { memoryUsage } from './memory_test_utils'
import { urbanstatsFixture, waitForLoading } from './test_utils'

urbanstatsFixture('mapper', '/mapper.html')

test('USA zip and back', async (t) => {
    await waitForLoading()
    await replaceInput(t, 'Subnational Region', 'ZIP')
    await waitForLoading()
    await replaceInput(t, 'ZIP', 'Subnational Region')
    await waitForLoading()

    await t.expect(await memoryUsage(t, target => target.type === 'page')).lt(79_000_000)
})
