import { Selector } from 'testcafe'

import { target, checkTextboxes, comparisonPage, downloadImage, getLocation, getLocationWithoutSettings, screencap, urbanstatsFixture, waitForSelectedSearchResult, dataValues, createComparison, disableTestingUserAgent } from './test_utils'

export const upperSGV = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const pasadena = 'Pasadena CCD [CCD], Los Angeles County, California, USA'
export const swSGV = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const eastSGV = 'East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const chicago = 'Chicago city [CCD], Cook County, Illinois, USA'

urbanstatsFixture('comparison test heterogenous', comparisonPage(['San Marino city, California, USA', pasadena, swSGV]))

test('comparison-3-desktop-heterogenous', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('comparison-3-mobile-heterogenous', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

test('comparison-heterogenous-search', async (t) => {
    await createComparison(t, 'pasadena c cd', 'Pasadena city, California, USA') // Would be pasadena city otherwise
})

urbanstatsFixture('comparison test homogenous (2)', comparisonPage([upperSGV, swSGV]))

test('comparison-2-mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

test('comparison-homogenous-search', async (t) => {
    await createComparison(t, 'pasadena c cd', pasadena) // Would be pasadena city otherwise
})

urbanstatsFixture('comparison test homogenous (3)', comparisonPage([upperSGV, pasadena, swSGV]))

test('comparison-3-desktop', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('comparison-3-mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

test('comparison-3-add', async (t) => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Name')
    await t
        .click(otherRegion)
        .typeText(otherRegion, 'san marino city california')
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([upperSGV, pasadena, swSGV, 'San Marino city, California, USA']))
})

test('comparison-3-remove-first', async (t) => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(0)
    await t
        .click(remove)
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([pasadena, swSGV]))
})

test('comparison-3-remove-second', async (t) => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(1)
    await t
        .click(remove)
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([upperSGV, swSGV]))
})

test('comparison-3-replace-second', async (t) => {
    const replace = Selector('div').withAttribute('class', 'serif manipulation-button-replace').nth(1)
    await t
        .click(replace)
    // already focused on the input
    const otherRegion = Selector('input').withAttribute('placeholder', 'Replacement')
    await t
        .typeText(otherRegion, 'East San Gabriel Valley')
    await t.wait(4000)
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([upperSGV, eastSGV, swSGV]))
})

test('comparison-3-editable-number-third', async (t) => {
    const editableNumber = Selector('span').withAttribute('class', 'editable_content').nth(2)
    await t
        .click(editableNumber)
        // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(editableNumber.innerText).eql('3')
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([upperSGV, pasadena, chicago]))
})

urbanstatsFixture('comparison test homogenous (3) (high resolution)', comparisonPage([upperSGV, pasadena, swSGV]), async (t) => {
    await disableTestingUserAgent(t)
})

test('comparison-3-download', async (t) => {
    await t.resizeWindow(1400, 800)
    await downloadImage(t)
})

urbanstatsFixture('plotted-across-180', `${target}/comparison.html?longnames=%5B%22England%2C+United+Kingdom%22%2C%22Alaska%2C+USA%22%2C%22Chukotskiy+avtonomnyy+okrug%2C+Russian+Federation%22%5D`)

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

const onlyUSAndCanadaCensus = 'AkWGLJMDBPzz5'
const neither = 'AkWGLJ6mbMkR7'

urbanstatsFixture(
    'comparison-non-overlapping-population-stats',
    `${target}/comparison.html?longnames=%5B"Cambridge+city%2C+Massachusetts%2C+USA"%2C"Chinandega%2C+Nicaragua"%5D&s=${onlyUSAndCanadaCensus}`,
)

test('comparison-2-non-overlapping-population-stats', async (t) => {
    // no overlap: both are forced onto the screen
    await t.expect(await checkboxStatus('US Census')).eql('missing')
    await t.expect(await checkboxStatus('GHSL')).eql('missing')
    await t.expect(await dataValues()).eql(['119', '420'])
    await screencap(t)
    await t.click(Selector('.disclaimer-toggle'))
    await screencap(t)
})

urbanstatsFixture(
    'comparison-both-american-states-population-stats',
    `${target}/comparison.html?longnames=%5B"Cambridge+city%2C+Massachusetts%2C+USA"%2C"California%2C+USA"%5D&s=${onlyUSAndCanadaCensus}`,
)

test('comparison-both-american-states-population-stats', async (t) => {
    // both are American states: only US Census is forced onto the screen
    await t.expect(await checkboxStatus('US Census')).eql('disabled')
    await t.expect(await checkboxStatus('GHSL')).eql('enabled')
    // these are the values for the US Census
    await t.expect(await dataValues()).eql(['119', '39.5'])
})

urbanstatsFixture(
    'comparison-american-vs-canada-population-stats',
    `${target}/comparison.html?longnames=%5B"Ontario%2C+Canada"%2C"California%2C+USA"%5D&s=${onlyUSAndCanadaCensus}`,
)

test('comparison-american-vs-canada-population-stats', async (t) => {
    // forces GHSL onto the screen. US Census is only enabled by the checkbox
    await t.expect(await checkboxStatus('US Census')).eql('enabled')
    await t.expect(await checkboxStatus('Canadian Census')).eql('enabled')
    await t.expect(await checkboxStatus('GHSL')).eql('enabled')
    // these are the values for the US Census
    await t.expect(await dataValues()).eql(['14.2', '39.5'])
    await checkTextboxes(t, ['US Census'])
    // these are the values for StatCan
    await t.expect(await dataValues()).eql(['14.2', 'NaN'])
    // enable everything
    await checkTextboxes(t, ['US Census', 'GHSL'])
    await t.expect(await dataValues()).eql(['14.2', '39.5', '14.3', '40.4'])
})

urbanstatsFixture(
    'comparison-american-vs-international-population-stats',
    `${target}/comparison.html?longnames=%5B"Delhi%2C+India"%2C"California%2C+USA"%5D&s=${onlyUSAndCanadaCensus}`,
)

let ghslLocation: string

test('comparison-american-vs-international-population-stats', async (t) => {
    // forces GHSL onto the screen. US Census is only enabled by the checkbox
    await t.expect(await checkboxStatus('US Census')).eql('enabled')
    await t.expect(await checkboxStatus('GHSL')).eql('disabled')
    // these are the values for the US Census
    await t.expect(await dataValues()).eql(['NaN', '39.5', '20.8', '40.4'])
    await checkTextboxes(t, ['US Census'])
    ghslLocation = await getLocation()
    // these are the values for GHSL
    await t.expect(await dataValues()).eql(['20.8', '40.4'])
    // disabled so this does nothing
    await checkTextboxes(t, ['GHSL'])
    await t.expect(getLocation()).eql(ghslLocation)
})

test('settings param works correctly on url with just ghsl source checked', async (t) => {
    await t.navigateTo(ghslLocation)
    await t.expect(Selector('[data-test-id="source Population US Census"]').checked).eql(false)
    await t.expect(Selector('[data-test-id="source Population GHSL"]').checked).eql(true)
    await screencap(t)
})

urbanstatsFixture(
    'comparison-usa-vs-usa',
    `${target}/comparison.html?longnames=%5B"Massachusetts%2C+USA"%2C"California%2C+USA"%5D&s=${onlyUSAndCanadaCensus}`,
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
    `${target}/comparison.html?longnames=%5B"Massachusetts%2C+USA"%2C"California%2C+USA"%5D&s=${neither}`,
)

test('comparison-usa-vs-usa-netiher', async (t) => {
    // should show a warning
    await screencap(t)
})

urbanstatsFixture(
    'comparison-city-vs-city',
    `${target}/comparison.html?longnames=%5B"Boston+city%2C+Massachusetts%2C+USA"%2C"Cambridge+city%2C+Massachusetts%2C+USA"%5D`,
)

test('comparison-city-vs-city', async (t) => {
    // check that the image with class `universe-selector` has the alt text `USA`
    await t.expect(Selector('img.universe-selector').getAttribute('alt')).eql('USA')
})

urbanstatsFixture(
    'comparison-uc-vs-uc-intl',
    `${target}/comparison.html?longnames=%5B"Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India"%2C"Mumbai+Urban+Center%2C+India"%5D`,
)

test('comparison-uc-vs-uc-intl', async (t) => {
    // check that the image with class `universe-selector` has the alt text `world`
    await t.expect(Selector('img.universe-selector').getAttribute('alt')).eql('world')
})

urbanstatsFixture('comparison with histogram with data only for second comparee', `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%5D&s=4gm8ETCK5SCX`)

test('renders successfully', async (t) => {
    await screencap(t)
})

urbanstatsFixture('comparison with heterogenous data sources', `${target}/comparison.html?longnames=%5B%22USA%22%2C%22Canada%22%2C%22Australia%22%5D&s=k32AgBaCktXf8M`)

test('renders us canada austrailia successfully', async (t) => {
    await screencap(t)
})

urbanstatsFixture('transpose comparision', `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%2C%22Japan%22%2C%22Indonesia%22%5D&s=6TunChiToWxwZeDP`, async (t) => {
    await disableTestingUserAgent(t)
})

test('renders transpose comparision', async (t) => {
    await screencap(t)
})

test('transpose screencap', async (t) => {
    await downloadImage(t)
})

urbanstatsFixture('scrolling transpose comparison', `${target}/comparison.html?longnames=%5B"Santa+Clarita+city%2C+California%2C+USA"%2C"Santa+Clara+city%2C+California%2C+USA"%2C"Boston+city%2C+Massachusetts%2C+USA"%2C"San+Francisco+city%2C+California%2C+USA"%2C"Denver+city%2C+Colorado%2C+USA"%5D&s=8gkGqBdgQkNpHJZ`)

test('renders scrolling transpose comparision', async (t) => {
    await screencap(t)
})

urbanstatsFixture('mobile transpose', `${target}/comparison.html?longnames=%5B%22California%2C+USA%22%2C%22Texas%2C+USA%22%2C%22Florida%2C+USA%22%5D&s=2EoPvra9nrE8zYq`, async (t) => {
    await t.resizeWindow(400, 800)
    await disableTestingUserAgent(t)
})

test('renders mobile transpose correctly', async (t) => {
    await screencap(t)
})

test('mobile transpose screencap', async (t) => {
    await downloadImage(t)
})

urbanstatsFixture('transpose with duplicate', `${target}/comparison.html?longnames=%5B%22California%2C+USA%22%2C%22Texas%2C+USA%22%2C%22Florida%2C+USA%22%2C%22Texas%2C+USA%22%5D&s=k32AgBaBU3tCGR`)

test('removing duplicate does not glitch out', async (t) => {
    await t.click(Selector('.manipulation-button-delete').nth(3))
    await screencap(t)
})

urbanstatsFixture('comparison add many cities', comparisonPage(['Los Angeles city, California, USA']))

for (const platform of ['desktop', 'mobile']) {
    test(`comparison-add-many-cities-${platform}`, async (t) => {
        if (platform === 'mobile') {
            await t.resizeWindow(400, 800)
        }

        await screencap(t)

        const citiesToAdd = [
            'New York city, New York, USA',
            'Denver city, Colorado, USA',
            'Anchorage municipality, Alaska, USA',
            'Houston city, Texas, USA',
            'Miami city, Florida, USA',
            'Chicago city, Illinois, USA',
        ]
        for (const city of citiesToAdd) {
            const input = Selector('input').withAttribute('placeholder', 'Name')
            await t
                .click(input)
                .typeText(input, city)
            await waitForSelectedSearchResult(t)
            await t.pressKey('enter')
            await screencap(t)
        }
    })
}
