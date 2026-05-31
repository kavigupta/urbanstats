import { replaceInput } from './mapper-utils'
import { memoryUsage } from './memory_test_utils'
import { urbanstatsFixture, waitForLoading } from './test_utils'

urbanstatsFixture('mapper', '/mapper.html')

test('USA zip and back', async (t) => {
    await waitForLoading()

    for (let n = 0; n < 10; n++) {
        console.warn(`Iteration ${n}`)
        const mapTypes = ['Choropleth Map', 'RGB Choropleth Map', 'Point Map', 'Clustered Point Map']
        for (let i = 0; i < mapTypes.length; i++) {
            await replaceInput(t, mapTypes[i], mapTypes[(i + 1) % mapTypes.length])
            await waitForLoading()
            await replaceInput(t, 'Subnational Region', 'ZIP')
            await waitForLoading()
            await replaceInput(t, 'ZIP', 'Subnational Region')
            await waitForLoading()
        }
    }

    await t.expect(await memoryUsage(t, target => target.type === 'page')).lt(86_000_000)
})
