import { ClientFunction, Selector } from 'testcafe'

import {
    target, checkAllCategoryBoxes, checkTextboxes, comparisonPage, downloadImage,
    getLocationWithoutSettings, safeReload, screencap,
    urbanstatsFixture,
    getLocation,
} from './test_utils'

urbanstatsFixture('longer article test', '/article.html?longname=California%2C+USA')

test('california-article-test', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
})

test('neighboring-state-test', async (t) => {
    await screencap(t)
    await t
        .click(Selector('path').withAttribute('class', /tag-Arizona,_USA/))
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
    await t.click(Selector('.theme-setting').find('select')).click(Selector('option').withText('Dark Mode'))
    await downloadImage(t)
})

test('create-comparison-from-article', async (t) => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Other region...')
    await t
        .click(otherRegion)
        .typeText(otherRegion, 'pasadena city california')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage(['San Marino city, California, USA', 'Pasadena city, California, USA']))
})

// just area and compactness
urbanstatsFixture('lr overall', `/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya&s=D9dego8tisfjWgh`)

test.only('lr-overall-other-stat', async (t) => {
    while (true) {
        await t.navigateTo(`/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya&s=D9dego8tisfjWgh`)
        // button with a < on it
        const prevOverallArea = Selector('button[data-test-id="-1"]').nth(1)
        const nextOverallArea = Selector('button[data-test-id="1"]').nth(1)
        const prevOverallCompactness = Selector('button[data-test-id="-1"]').nth(3)
        const nextOverallCompactness = Selector('button[data-test-id="1"]').nth(3)
        await t
            .click(prevOverallArea)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=49633%2C+USA&universe=world`)
        await t.wait(100)
        await t
            .click(nextOverallArea)
        await t.wait(100)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
        // check that prevOverallCompactness is disabled
        await t.expect(prevOverallCompactness.hasAttribute('disabled')).ok()
        // check that prevOverallCompactness does nothing when clicked
        await t.click(prevOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)

        await t.click(nextOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Singapore+%28Center%29+5MPC%2C+Singapore`)
        // check that prevOverallCompactness is enabled
        await t.expect(prevOverallCompactness.hasAttribute('disabled')).notOk()
        await t.click(prevOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
        // least compact region
        await t.navigateTo('/article.html?longname=Fiji&s=D9dego8tisfjWgh')
        // check that nextOverallCompactness is disabled
        await t.expect(nextOverallCompactness.hasAttribute('disabled')).ok()
        // check that nextOverallCompactness does nothing when clicked
        await t.click(nextOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Fiji`)
        // check that prevOverallCompactness is enabled
        await t.expect(prevOverallCompactness.hasAttribute('disabled')).notOk()
        await t.click(prevOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Northern%2C+Fiji`)
        // check that nextOverallCompactness is enabled
        await t.expect(nextOverallCompactness.hasAttribute('disabled')).notOk()
        await t.click(nextOverallCompactness)
        await t.expect(getLocationWithoutSettings())
            .eql(`${target}/article.html?longname=Fiji`)
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
    await t.expect(Selector('span').withText('62.2').exists).ok()
})

const temperatureSelect = Selector('[data-test-id=temperature_select]')

test('change to C and back to F', async (t) => {
    await t.click(temperatureSelect).click(temperatureSelect.find('option').withText('C'))
    await t.expect(Selector('span').withText('28.8').exists).ok()
    await t.click(temperatureSelect).click(temperatureSelect.find('option').withText('F'))
    await t.expect(Selector('span').withText('62.2').exists).ok()
})

test('paste C link', async (t) => {
    await checkTextboxes(t, ['Simple Ordinals']) // to save settings
    await t.navigateTo('/article.html?longname=California%2C+USA&s=jV3GG2h8Vfs')
    await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()
    await t.expect(Selector('span').withText('28.8').exists).ok()
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

urbanstatsFixture('4 digit election swing', '/article.html?longname=Corpus+Christi+city%2C+Texas%2C+USA&s=4EWiZCQEgxLku')

test('overflows correctly on mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

urbanstatsFixture('article with many /', '/article.html?longname=Victory+Manor%2FEast+Hill%2FDonwood+Neighborhood%2C+Savannah+City%2C+Georgia%2C+USA')

test('loads successfully', async (t) => {
    await t.expect(Selector('div').withText('Victory Manor/East Hill/Donwood, Savannah').exists).ok()
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

test('when navigating to next media market that is two lines vai map click, maintains relative position of map', async (t) => {
    const scrollPosition = ClientFunction(() => window.scrollY)
    const mapPosition = ClientFunction(() => document.querySelector('.map-container-for-testing')!.getBoundingClientRect().top)
    const neighbor = Selector('path').withAttribute('class', /tag-Raleigh-Durham_\(Fayetteville\)_NC_Media_Market/)

    await t.scrollIntoView(neighbor)

    const before = {
        mapPosition: await mapPosition(),
        scrollPosition: await scrollPosition(),
    }

    await t.click(neighbor)
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
    await t.click(Selector('path').withAttribute('class', /tag-Raleigh-Durham_\(Fayetteville\)_NC_Media_Market/))
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()
    await t.click(Selector('path').withAttribute('class', /Charlotte_NC_Media_Market,_USA/))
    await t.expect(Selector('div').withExactText('Charlotte NC Media Market').exists).ok()
})
