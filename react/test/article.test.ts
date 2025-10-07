import { ClientFunction, Selector } from 'testcafe'

import {
    target, checkAllCategoryBoxes, checkTextboxes, comparisonPage, downloadImage,
    getLocationWithoutSettings, safeReload, screencap,
    urbanstatsFixture,
    getLocation,
    createComparison,
    waitForPageLoaded,
    clickMapElement,
    downloadOrCheckString,
    waitForDownload,
} from './test_utils'

urbanstatsFixture('longer article test', '/article.html?longname=California%2C+USA')

test('california-article-test', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
})

test('neighboring-state-test', async (t) => {
    await screencap(t)
    await clickMapElement(t, /Arizona, USA/)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Arizona%2C+USA`)
})

urbanstatsFixture('cross-country test', '/article.html?longname=Tijuana+Urban+Center%2C+Mexico-USA')

test('tijuana-article-test', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
})

urbanstatsFixture('cross-country test', '/article.html?longname=Los+Angeles+200MPC%2C+USA-Brazil-Mexico')

test('200mpc-article-test', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
})

urbanstatsFixture('shorter article test', `/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('san-marino-article-test', async (t) => {
    await screencap(t)
})

test('editable-number', async (t) => {
    // span with class editable_content
    const editableNumber = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t
        .click(editableNumber)
        // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(editableNumber.innerText).eql('3')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Chicago+city%2C+Illinois%2C+USA`)
})

test('lr-buttons', async (t) => {
    // button with a < on it
    const prev = Selector('button[data-test-id="-1"]').nth(0)
    const next = Selector('button[data-test-id="1"]').nth(0)
    const prevOverall = Selector('button[data-test-id="-1"]').nth(1)
    const nextOverall = Selector('button[data-test-id="1"]').nth(1)
    await t
        .click(prev)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Fortuna+city%2C+California%2C+USA`)
    await t
        .click(next)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`)
    await t
        .click(next)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Lakewood+Park+CDP%2C+Florida%2C+USA`)
    await t
        .click(prev)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`)

    await t.click(prevOverall)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Havre+High+School+District%2C+Montana%2C+USA`)
    await t.click(nextOverall)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`)
    await t.click(nextOverall)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=78225%2C+USA`)
})

test('san-marino-2010-health', async (t) => {
    await checkTextboxes(t, ['2010', 'Health'])
    await screencap(t)
})

test('uncheck-box-mobile', async (t) => {
    // Find div with class checkbox-setting containing a label with text "Race"
    // and a checkbox, then find the checkbox
    await t.resizeWindow(400, 800)
    await checkTextboxes(t, ['Race'])

    await screencap(t)
    // refresh
    await safeReload(t)
    await screencap(t)
})

test('uncheck-box-desktop', async (t) => {
    await t.resizeWindow(1400, 800)

    await checkTextboxes(t, ['Race'])

    await screencap(t)
    // refresh
    await safeReload(t)
    await screencap(t)
})

test('simple', async (t) => {
    await t.resizeWindow(1400, 800)

    await checkTextboxes(t, ['Simple Ordinals'])

    await screencap(t)
})

test('download-article', async (t) => {
    await downloadImage(t)
})

test('download-article-dark', async (t) => {
    await t.click(Selector('.theme-setting').find('select')).click(Selector('option').withExactText('Dark Mode'))
    await downloadImage(t)
})

test('create-comparison-from-article', async (t) => {
    await createComparison(t, 'pasadena city california')
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage(['San Marino city, California, USA', 'Pasadena city, California, USA']))
})

// just area and compactness
urbanstatsFixture('lr overall', `/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya&s=D9dego8tisfjWgh`)

test('lr-overall-other-stat', async (t) => {
    try {
        const prevOverallArea = Selector('button[data-test-id="-1"]').nth(1)
        const nextOverallArea = Selector('button[data-test-id="1"]').nth(1)
        const prevOverallCompactness = Selector('button[data-test-id="-1"]').nth(3)
        const nextOverallCompactness = Selector('button[data-test-id="1"]').nth(3)
        await t
            .click(prevOverallArea)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=49633%2C+USA&universe=world`)
        await waitForPageLoaded(t)
        await t
            .click(nextOverallArea)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
        await waitForPageLoaded(t)
        // check that prevOverallCompactness is disabled
        await t.expect(prevOverallCompactness.hasAttribute('disabled')).ok()
        // check that prevOverallCompactness does nothing when clicked
        await t.click(prevOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
        await waitForPageLoaded(t)

        await t.click(nextOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Singapore+%28Center%29+5MPC%2C+Singapore`)
        await waitForPageLoaded(t)
        // check that prevOverallCompactness is enabled
        await t.expect(prevOverallCompactness.hasAttribute('disabled')).notOk()
        await t.click(prevOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
        await waitForPageLoaded(t)
        // least compact region
        await t.navigateTo('/article.html?longname=Cairo+Metropolitan+Cluster%2C+Egypt&s=D9dego8tisfjWgh')
        // check that nextOverallCompactness is disabled
        await t.expect(nextOverallCompactness.hasAttribute('disabled')).ok()
        // check that nextOverallCompactness does nothing when clicked
        await t.click(nextOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Cairo+Metropolitan+Cluster%2C+Egypt`)
        await waitForPageLoaded(t)
        // check that prevOverallCompactness is enabled
        await t.expect(prevOverallCompactness.hasAttribute('disabled')).notOk()
        await t.click(prevOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Fiji`)
        await waitForPageLoaded(t)
        // check that nextOverallCompactness is enabled
        await t.expect(nextOverallCompactness.hasAttribute('disabled')).notOk()
        await t.click(nextOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Cairo+Metropolitan+Cluster%2C+Egypt`)
        await waitForPageLoaded(t)
    }
    finally {
        // eslint-disable-next-line no-console -- Debugging test failure
        console.log(await t.getBrowserConsoleMessages())
    }
})

urbanstatsFixture('all stats test', `/article.html?longname=California%2C+USA`)

test('california-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkAllCategoryBoxes(t)
    await screencap(t)
})

// selected because the gz changed in statistic classes
urbanstatsFixture('all stats test regression', `/article.html?longname=Charlotte%2C+Maine%2C+USA`)

test('charlotte-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkAllCategoryBoxes(t)
    await screencap(t)
})

urbanstatsFixture('weather F', '/article.html?longname=California%2C+USA&s=jV3GG2h8Vfb')

test('is F', async (t) => {
    await t.expect(Selector('span').withExactText('61.5').exists).ok()
})

const temperatureSelect = Selector('[data-test-id=temperature_select]')

test('change to C and back to F', async (t) => {
    await t.click(temperatureSelect).click(temperatureSelect.find('option').withText(/C/))
    await t.expect(Selector('span').withExactText('26.9').exists).ok()
    await t.click(temperatureSelect).click(temperatureSelect.find('option').withText(/F/))
    await t.expect(Selector('span').withExactText('61.5').exists).ok()
})

test('paste C link', async (t) => {
    await checkTextboxes(t, ['Simple Ordinals']) // to save settings
    await t.navigateTo('/article.html?longname=California%2C+USA&s=jV3GG2h8Vfs')
    await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()
    await t.expect(Selector('span').withExactText('26.9').exists).ok()
    await screencap(t)
})

urbanstatsFixture('no-domestic-stats', '/article.html?longname=US+Virgin+Islands%2C+USA')

test('virgin-islands', async (t) => {
    await screencap(t)
})

urbanstatsFixture('some-stats-missing', '/article.html?longname=Pueblo East CDP%2C+Texas%2C+USA')

test('pueblo-east-cdp', async (t) => {
    await checkTextboxes(t, ['Transportation'])
    await screencap(t)
})

urbanstatsFixture('4 digit election swing', '/article.html?longname=Corpus+Christi+city%2C+Texas%2C+USA&s=GczH23rwqX34ctu')

test('overflows correctly on mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await safeReload(t) // Since the map loading is racing with the window size
    await screencap(t)
})

urbanstatsFixture('article with many /', '/article.html?longname=Victory+Manor%2FEast+Hill%2FDonwood+Neighborhood%2C+Savannah+City%2C+Georgia%2C+USA')

test('loads successfully', async (t) => {
    await t.expect(Selector('div').withExactText('Victory Manor/East Hill/Donwood, Savannah').exists).ok()
})

test('has the correct URL after loading', async (t) => {
    await t.expect(getLocation()).match(/article\.html\?longname=Victory\+Manor%2FEast\+Hill%2FDonwood\+Neighborhood%2C\+Savannah\+City%2C\+Georgia%2C\+USA/)
})

urbanstatsFixture('article with neighbor whose title is two lines', '/article.html?longname=Charlotte+NC+Media+Market%2C+USA')

test('when navigating to next media market that is two lines, maintains relative position of pointer', async (t) => {
    const scrollPosition = ClientFunction(() => window.scrollY)
    const pointerPosition = ClientFunction(() => document.querySelector('button[data-test-id="1"]')!.getBoundingClientRect().top)

    const before = {
        pointerPosition: await pointerPosition(),
        scrollPosition: await scrollPosition(),
    }

    await t.click(Selector('button[data-test-id="1"]').nth(0))
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()

    const after = {
        pointerPosition: await pointerPosition(),
        scrollPosition: await scrollPosition(),
    }

    // Page has scrolled to maintain pointer position
    await t.expect(after.scrollPosition).notEql(before.scrollPosition)

    await t.expect(after.pointerPosition).eql(before.pointerPosition)
})

test('when navigating to next media market that is two lines via map click, maintains relative position of map', async (t) => {
    const scrollPosition = ClientFunction(() => window.scrollY)
    const mapPosition = ClientFunction(() => document.querySelector('.maplibregl-canvas-container')!.getBoundingClientRect().top)
    // scroll down to bottom of the map
    await t.scrollIntoView(Selector('a').withExactText('North America'))

    const before = {
        mapPosition: await mapPosition(),
        scrollPosition: await scrollPosition(),
    }

    await clickMapElement(t, /Raleigh-Durham \(Fayetteville\) NC Media Market/)
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()

    const after = {
        mapPosition: await mapPosition(),
        scrollPosition: await scrollPosition(),
    }

    // Page has scrolled to maintain pointer position
    await t.expect(after.scrollPosition).notEql(before.scrollPosition)

    await t.expect(after.mapPosition).eql(before.mapPosition)
})

test('can navigate back to original navigated shape in map', async (t) => {
    await clickMapElement(t, /Raleigh-Durham \(Fayetteville\) NC Media Market/)
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()
    await clickMapElement(t, /Charlotte NC Media Market, USA/)
    await t.expect(Selector('div').withExactText('Charlotte NC Media Market').exists).ok()
})

urbanstatsFixture('historical congressional', '/article.html?longname=Historical+Congressional+District+CA-46%2C+108th-112th+Congress%2C+USA')

test('historical congressional', async (t) => {
    await checkTextboxes(t, ['Include Historical Districts'])
    await screencap(t)
})

function screenshotOfPage(name: string, url: string): void {
    urbanstatsFixture(name, url)
    test(name, async (t) => {
        await screencap(t)
    })
}

screenshotOfPage('congressional district', '/article.html?longname=CA-46%2C+USA')
screenshotOfPage('congressional district at large', '/article.html?longname=VT-00%2C+USA')
screenshotOfPage('legislative district complicated name', '/article.html?longname=VT-HDB-1%2C+USA')
screenshotOfPage('legislative district short name', '/article.html?longname=CA-SD023%2C+USA')
screenshotOfPage('county cross district', '/article.html?longname=WY-00+in+Natrona+County%2C+USA')

urbanstatsFixture('washington no relateds', '/article.html?longname=China&s=PnVFWSmVr78Jm')

test('region on map is not clickable', async (t) => {
    const historyLength = ClientFunction(() => history.length)
    const initialHistoryLength = await historyLength()
    await t.click('.maplibregl-map') // Click China
    await t.expect(historyLength()).eql(initialHistoryLength)
})

urbanstatsFixture('csv-export', `/article.html?longname=Rafael+Pena+CDP%2C+Texas%2C+USA&s=4YGF3xUkfbjxoj`)

test('download-article-csv-settings-ignored', async (t) => {
    const laterThan = Date.now()

    const csvButton = Selector('img').withAttribute('src', '/csv.png')
    await t.click(csvButton)

    const downloadedFilePath = await waitForDownload(t, laterThan, '.csv')
    const fs = await import('fs')
    const csvContent = fs.readFileSync(downloadedFilePath, 'utf-8')

    await downloadOrCheckString(t, csvContent, 'csv-export-california-article', 'csv', false)
})
