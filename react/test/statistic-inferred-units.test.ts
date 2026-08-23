import { Selector } from 'testcafe'

import { dataValues, target, urbanstatsFixture, waitForLoading } from './test_utils'

/** Each row as it reads: the value, and the unit written in the column beside it. */
async function rows(): Promise<string[]> {
    const values = await dataValues()
    const unit = Selector('div').withAttribute('class', /value_unit/)
    const units = [] as string[]
    for (let i = 0; i < await unit.count; i++) {
        units.push(await unit.nth(i).innerText)
    }
    return values.map((value, index) => `${value} ${units[index] ?? ''}`.trim())
}

/** The judicial circuits, of which there are thirteen, so that a page of them is quick to draw. */
function tableOf(values: string): string {
    return `${target}/statistic.html?uss=${encodeURIComponent(`customNode(""); condition (true); table(columns=[column(values=${values})])`)}&article_type=Judicial+Circuit&start=1&amount=3&order=descending&universe=USA`
}

urbanstatsFixture('people over an area', tableOf('population / area'))

test('people over an area are people per unit of area', async (t) => {
    await waitForLoading()
    await t.expect(await rows()).eql(['3\u202f897 /\u00a0km2', '163 /\u00a0km2', '148 /\u00a0km2'])
})

urbanstatsFixture('a ratio of two densities', tableOf('density_pw_1km / density_pw_2km'))

test('a ratio of two densities is of no kind at all', async (t) => {
    await waitForLoading()
    await t.expect(await rows()).eql(['1.22', '1.22', '1.21'])
})

urbanstatsFixture('a difference of two temperatures', tableOf('high_temp - low_temp'))

test('a difference of two temperatures is a number of degrees', async (t) => {
    await waitForLoading()
    await t.expect(await rows()).eql(['+22.3 °F', '+19.1 °F', '+18.3 °F'])
})

urbanstatsFixture('a quantity with no writing', tableOf('population ** 0.5'))

test('a root of a count is written plainly rather than failing', async (t) => {
    await waitForLoading()
    await t.expect(await rows()).eql(['8\u202f176', '6\u202f105', '6\u202f063'])
})
