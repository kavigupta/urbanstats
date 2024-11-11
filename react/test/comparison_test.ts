import { Selector } from 'testcafe'

import { TARGET, check_textboxes, comparison_page, download_image, getLocation, getLocationWithoutSettings, screencap, urbanstatsFixture } from './test_utils'

export const upper_sgv = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const pasadena = 'Pasadena CCD [CCD], Los Angeles County, California, USA'
export const sw_sgv = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const east_sgv = 'East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const chicago = 'Chicago city [CCD], Cook County, Illinois, USA'

urbanstatsFixture('comparison test heterogenous', comparison_page(['San Marino city, California, USA', pasadena, sw_sgv]))

test('comparison-3-desktop-heterogenous', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('comparison-3-mobile-heterogenous', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

urbanstatsFixture('comparison test homogenous (2)', comparison_page([upper_sgv, sw_sgv]))

test('comparison-2-mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

urbanstatsFixture('comparison test homogenous (3)', comparison_page([upper_sgv, pasadena, sw_sgv]))

test('comparison-3-desktop', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('comparison-3-mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

test('comparison-3-download', async (t) => {
    await t.resizeWindow(1400, 800)
    await download_image(t)
})

test('comparison-3-add', async (t) => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Name')
    await t
        .click(otherRegion)
        .typeText(otherRegion, 'san marino city california')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(comparison_page([upper_sgv, pasadena, sw_sgv, 'San Marino city, California, USA']))
})

test('comparison-3-remove-first', async (t) => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(0)
    await t
        .click(remove)
    await t.expect(getLocationWithoutSettings())
        .eql(comparison_page([pasadena, sw_sgv]))
})

test('comparison-3-remove-second', async (t) => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(1)
    await t
        .click(remove)
    await t.expect(getLocationWithoutSettings())
        .eql(comparison_page([upper_sgv, sw_sgv]))
})

test('comparison-3-replace-second', async (t) => {
    const replace = Selector('div').withAttribute('class', 'serif manipulation-button-replace').nth(1)
    await t
        .click(replace)
    // already focused on the input
    const otherRegion = Selector('input').withAttribute('placeholder', 'Replacement')
    await t
        .typeText(otherRegion, 'East San Gabriel Valley')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(comparison_page([upper_sgv, east_sgv, sw_sgv]))
})

test('comparison-3-editable-number-third', async (t) => {
    const editableNumber = Selector('span').withAttribute('class', 'editable_number').nth(2)
    await t
        .click(editableNumber)
    // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(editableNumber.innerText).eql('3')
    await t.expect(getLocationWithoutSettings())
        .eql(comparison_page([upper_sgv, pasadena, chicago]))
})

urbanstatsFixture('plotted-across-180', `${TARGET}/comparison.html?longnames=%5B%22England%2C+United+Kingdom%22%2C%22Alaska%2C+USA%22%2C%22Chukotskiy+avtonomnyy+okrug%2C+Russian+Federation%22%5D`)

test('comparison-3-plotted-across-180', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

async function checkboxStatus(name: string): Promise<string> {
    const selector = Selector('div.checkbox-setting')
        .filter(node => node.querySelector('label')!.innerText === name, { name })
    if ((await selector.count) === 0) {
        return 'missing'
    }
    if (await selector.hasClass('testing-checkbox-disabled')) {
        return 'disabled'
    }
    return 'enabled'
}

async function dataValues(): Promise<string[]> {
    const selector = Selector('span').withAttribute('class', /testing-statistic-value/)
    const values = [] as string[]
    for (let i = 0; i < await selector.count; i++) {
        values.push(await selector.nth(i).innerText)
    }
    return values
}

const ONLY_US_CENSUS = '7aScwAoYX'
const NEITHER = 'W2c5c5XY2Z'

urbanstatsFixture(
    'comparison-non-overlapping-population-stats',
    `${TARGET}/comparison.html?longnames=%5B"Cambridge+city%2C+Massachusetts%2C+USA"%2C"Chinandega%2C+Nicaragua"%5D&s=${ONLY_US_CENSUS}`,
)

test('comparison-2-non-overlapping-population-stats', async (t) => {
    // no overlap: both are forced onto the screen
    await t.expect(await checkboxStatus('US Census')).eql('missing')
    await t.expect(await checkboxStatus('GHSL')).eql('missing')
    await t.expect(await dataValues()).eql(['119', 'NaN', 'NaN', '419'])
})

urbanstatsFixture(
    'comparison-both-american-states-population-stats',
    `${TARGET}/comparison.html?longnames=%5B"Cambridge+city%2C+Massachusetts%2C+USA"%2C"California%2C+USA"%5D&s=${ONLY_US_CENSUS}`,
)

test('comparison-both-american-states-population-stats', async (t) => {
    // both are American states: only US Census is forced onto the screen
    await t.expect(await checkboxStatus('US Census')).eql('disabled')
    await t.expect(await checkboxStatus('GHSL')).eql('enabled')
    // these are the values for the US Census
    await t.expect(await dataValues()).eql(['119', '39.5'])
})

urbanstatsFixture(
    'comparison-american-vs-international-population-stats',
    `${TARGET}/comparison.html?longnames=%5B"Ontario%2C+Canada"%2C"California%2C+USA"%5D&s=${ONLY_US_CENSUS}`,
)

test('comparison-american-vs-international-population-stats', async (t) => {
    // forces GHSL onto the screen. US Census is only enabled by the checkbox
    await t.expect(await checkboxStatus('US Census')).eql('enabled')
    await t.expect(await checkboxStatus('GHSL')).eql('disabled')
    // these are the values for the US Census
    await t.expect(await dataValues()).eql(['NaN', '39.5', '14.3', '40.3'])
    await check_textboxes(t, ['US Census'])
    // assert location
    await t.expect(getLocation()).eql(`${TARGET}/comparison.html?longnames=%5B%22Ontario%2C+Canada%22%2C%22California%2C+USA%22%5D&s=${NEITHER}`)
    // these are the values for GHSL
    await t.expect(await dataValues()).eql(['14.3', '40.3'])
    // disabled so this does nothing
    await check_textboxes(t, ['GHSL'])
    await t.expect(getLocation()).eql(`${TARGET}/comparison.html?longnames=%5B%22Ontario%2C+Canada%22%2C%22California%2C+USA%22%5D&s=${NEITHER}`)
})

urbanstatsFixture(
    'comparison-usa-vs-usa',
    `${TARGET}/comparison.html?longnames=%5B"Massachusetts%2C+USA"%2C"California%2C+USA"%5D&s=${ONLY_US_CENSUS}`,
)

test('comparison-usa-vs-usa', async (t) => {
    // both are American states: nothing is forced onto the screen
    await t.expect(await checkboxStatus('US Census')).eql('enabled')
    await t.expect(await checkboxStatus('GHSL')).eql('enabled')
    // these are the values for the US Census, since GHSL is disabled
    await t.expect(await dataValues()).eql(['7.03', '39.5'])
})

urbanstatsFixture(
    'comparison-usa-vs-usa-netiher',
    `${TARGET}/comparison.html?longnames=%5B"Massachusetts%2C+USA"%2C"California%2C+USA"%5D&s=${NEITHER}`,
)

test('comparison-usa-vs-usa-netiher', async (t) => {
    // should show a warning
    await screencap(t)
})
