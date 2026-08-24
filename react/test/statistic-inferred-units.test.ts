import { ClientFunction, Selector } from 'testcafe'

import { dataValues, target, urbanstatsFixture, waitForLoading } from './test_utils'

async function rows(): Promise<string[]> {
    const values = await dataValues()
    const unit = Selector('div').withAttribute('class', /value_unit/)
    const units = [] as string[]
    for (let i = 0; i < await unit.count; i++) {
        units.push(await unit.nth(i).innerText)
    }
    return values.map((value, index) => `${value} ${units[index] ?? ''}`.trim())
}

/** Thirteen judicial circuits, so that a page of them is quick to draw. */
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

test('a reader in Celsius reads that difference as one', async (t) => {
    await waitForLoading()
    const temperatures = Selector('[data-test-id=temperature_select]')
    await t.click(temperatures).click(temperatures.find('option').withText(/C/))
    // twenty-two Fahrenheit degrees between the day's high and its low is twelve Celsius degrees,
    // where a reading of 22.3°F would be 5.4 below freezing
    await t.expect(await rows()).eql(['+12.4 °C', '+10.6 °C', '+10.2 °C'])
})

urbanstatsFixture('several columns at once', `${target}/statistic.html?uss=${encodeURIComponent('customNode(""); condition (true); table(columns=[column(values=high_temp), column(values=high_temp - low_temp), column(values=population / area)])')}&article_type=Judicial+Circuit&start=1&amount=2&order=descending&universe=USA`)

test('each column of a table is written in its own units', async (t) => {
    await waitForLoading()
    await t.expect(await rows()).eql(['78.3 °F', '+19.1 °F', '39.4 /\u00a0km2', '77.5 °F', '+15.8 °F', '85.2 /\u00a0km2'])
})

urbanstatsFixture('the size of a reading and of a difference', tableOf('abs(high_temp)'))

test('the size of a reading is no reading', async (t) => {
    await waitForLoading()
    // no degrees, the zero of a temperature being wherever its scale puts it
    await t.expect(await rows()).eql(['78.3', '77.5', '69.5'])
})

urbanstatsFixture('the size of a difference', tableOf('abs(high_temp - low_temp)'))

test('the size of a difference is a number of degrees', async (t) => {
    await waitForLoading()
    await t.expect(await rows()).eql(['+22.3 °F', '+19.1 °F', '+18.3 °F'])
})

urbanstatsFixture('residuals of a regression', `${target}/statistic.html?uss=${encodeURIComponent('regr = regression(y=commute_transit, x1=ln(density_pw_1km))\ncondition (true)\ntable(columns=[column(values=regr.residuals)])')}&article_type=Judicial+Circuit&start=1&amount=3&order=descending&universe=USA`)

test('what a regression did not expect is a difference of shares', async (t) => {
    await waitForLoading()
    // above expectation, which is what the sign is there to say
    await t.expect(await rows()).eql(['+9.92 %', '+3.26 %', '+3.21 %'])
})

const filtered = `${target}/statistic.html?uss=${encodeURIComponent('customNode(""); condition (commute_bike > 0.05 & high_temp > 80); table(columns=[column(values=population)])')}&article_type=Judicial+Circuit&start=1&amount=3&order=descending&universe=USA`

urbanstatsFixture('a table filtered on a share and a temperature', filtered)

// eslint-disable-next-line no-restricted-syntax -- Reading the title the router set, not setting one.
const documentTitle = ClientFunction(() => document.title)

const captions = ClientFunction(() => Array.from(document.querySelectorAll('div, h1, h2, span')).map(node => (node as HTMLElement).innerText).filter(text => text.includes('where Commute Bike')).slice(0, 2))

test('the numbers a filter names are written in the units it reads them from', async (t) => {
    await waitForLoading()
    await t.expect(documentTitle()).eql('Population where Commute Bike % > 5% and Mean high temp > 80°F')
})

test('a reader in Celsius is given the caption in Celsius', async (t) => {
    await waitForLoading()
    const temperatures = Selector('[data-test-id=temperature_select]')
    await t.click(temperatures).click(temperatures.find('option').withText(/C/))
    await waitForLoading()
    await t.expect(captions()).eql([])
})

urbanstatsFixture('a quantity with no writing', tableOf('population ** 0.5'))

test('a root of a count is written plainly rather than failing', async (t) => {
    await waitForLoading()
    // to three figures, as anything of no known kind is, rather than whole as a count of people is
    await t.expect(await rows()).eql(['8\u202f180', '6\u202f110', '6\u202f060'])
})
