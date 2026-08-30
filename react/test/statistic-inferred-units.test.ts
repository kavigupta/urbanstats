import { Selector } from 'testcafe'

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

urbanstatsFixture('a column in no unit at all', `${target}/statistic.html?uss=${encodeURIComponent('customNode(""); condition (true); table(columns=[column(values=population * area)])')}&article_type=Judicial+Circuit&start=1&amount=3&order=descending&universe=USA&edit=true`)

test('a column whose unit cannot be worked out says so, where the script is being written', async (t) => {
    await waitForLoading()
    await t.expect(Selector('#test-editor-result').innerText)
        .contains('Could not compute units for population * area: people·m^2 has no name of its own')
})

urbanstatsFixture('a logarithm of a quantity', tableOf('ln(high_temp)'))

test('a logarithm names what its argument was read in', async (t) => {
    await waitForLoading()
    await t.expect(Selector('[data-test-id="statistic-link"]').innerText).eql('ln(Mean high temp [in °F])')
})

test('and keeps naming it that to a reader in Celsius, the logarithm being of the Fahrenheit number', async (t) => {
    await waitForLoading()
    const temperatures = Selector('[data-test-id=temperature_select]')
    await t.click(temperatures).click(temperatures.find('option').withText(/C/))
    await t.expect(Selector('[data-test-id="statistic-link"]').innerText).eql('ln(Mean high temp [in °F])')
})

urbanstatsFixture('a column named after what it is measured against', tableOf('maximum(high_temp, 80)'))

const columnName = Selector('[data-test-id="statistic-link"]')

test('a number a script names is written in the units it is read from', async (t) => {
    await waitForLoading()
    await t.expect(columnName.innerText).eql('max(Mean high temp, 80°F)')
})

test('a reader in Celsius is given that number in Celsius', async (t) => {
    await waitForLoading()
    const temperatures = Selector('[data-test-id=temperature_select]')
    await t.click(temperatures).click(temperatures.find('option').withText(/C/))
    await t.expect(columnName.innerText).eql('max(Mean high temp, 26.7°C)')
    // the same name flattened to a string, for the screen reader and for the tab
    await t.expect(Selector('[aria-label^="Sort by max"]').getAttribute('aria-label'))
        .eql('Sort by max(Mean high temp, 26.7°C), currently descending')
    // eslint-disable-next-line no-restricted-syntax -- reading the tab the statistic panel writes
    await t.expect(await t.eval(() => document.title)).eql('max(Mean high temp, 26.7°C)')
})

const everything = `${target}/statistic.html?uss=${encodeURIComponent(`customNode(""); condition (commute_bike > 0.004 & high_temp > 60); table(columns=[
    column(values=population / area),
    column(values=high_temp - low_temp),
    column(values=maximum(commute_bike, 0.05)),
    column(values=population ** 0.5)
])`)}&article_type=Judicial+Circuit&start=1&amount=2&order=descending&universe=USA`

urbanstatsFixture('a filtered table of four derived columns', everything)

const columnNames = Selector('[data-test-id="statistic-link"]')

test('every column of a filtered table is named and written in what the script works out', async (t) => {
    await waitForLoading()
    const names = [] as string[]
    for (let i = 0; i < await columnNames.count; i++) {
        names.push(await columnNames.nth(i).innerText)
    }
    await t.expect(names).eql(['Population ÷ Area', 'Mean high temp − Mean low temp', 'max(Commute Bike %, 5%)', 'Population0.5'])
    await t.expect(await rows()).eql([
        '3\u202f897 /\u00a0km2', '+16.8 °F', '5.00 %', '830',
        '163 /\u00a0km2', '+15.9 °F', '5.00 %', '4\u202f825',
    ])
})

urbanstatsFixture('a quantity with no writing', tableOf('population ** 0.5'))

test('a root of a count is written plainly rather than failing', async (t) => {
    await waitForLoading()
    // to three figures, as anything in no known unit is, rather than whole as a count of people is
    await t.expect(await rows()).eql(['8\u202f176', '6\u202f105', '6\u202f063'])
})
