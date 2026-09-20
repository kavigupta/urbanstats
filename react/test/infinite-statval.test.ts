import { dataValues, target, urbanstatsFixture, waitForLoading } from './test_utils'

function tableOf(values: string): string {
    return `${target}/statistic.html?uss=${encodeURIComponent(`customNode(""); condition (true); table(columns=[column(values=${values})])`)}&article_type=Judicial+Circuit&start=1&amount=3&order=descending&universe=USA`
}

urbanstatsFixture('a quantity over zero', tableOf('population / 0'))

test('an unbounded value is written as an infinity, not as a missing one', async (t) => {
    await waitForLoading()
    await t.expect(await dataValues()).eql(['∞', '∞', '∞'])
})

urbanstatsFixture('a negative quantity over zero', tableOf('(0 - population) / 0'))

test('an unbounded value below zero keeps its sign', async (t) => {
    await waitForLoading()
    await t.expect(await dataValues()).eql(['-∞', '-∞', '-∞'])
})
