import fs from 'fs'

import { Selector } from 'testcafe'

import {
    target, checkTextboxes, getLocation,
    safeReload,
    screencap,
    urbanstatsFixture,
    doSearch,
    mapElement,
} from './test_utils'

const testLocation = `${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`

urbanstatsFixture('settings regression test', testLocation,
    async (t) => {
        const egSettings = fs.readFileSync('test/assets/saved-settings-1.json').toString()
        await t.eval(() => {
            localStorage.setItem('settings', egSettings)
            // Delete settings param so old settings don't persist after navigation
            // eslint-disable-next-line no-restricted-syntax -- Test file
            setTimeout(() => { window.location.href = testLocation }, 0)
        }, { dependencies: { egSettings, testLocation } })
    })

test('check-settings-loaded', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
    // check there's an element containing class Huntington_Library
    await t.expect(mapElement(/Huntington Library/).exists).ok()
    // check that there's no element Pasadena_city or 91101
    await t.expect(mapElement(/Pasadena city/).exists).notOk()
    await t.expect(mapElement(/91101/).exists).notOk()
})

test('check-settings-loaded-desktop', async (t) => {
    // screenshot path: images/first_test.png
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('check-settings-persistent', async (t) => {
    await t.expect(Selector('span').withText(/mi/).exists).ok()
    // navigate to Pasadena via search
    await doSearch(t, 'Pasadena, CA, USA')
    await t.expect(getLocation()).match(/\/article\.html\?longname=Pasadena\+city%2C\+California%2C\+USA/)
    // check box "Imperial"
    await checkTextboxes(t, ['Use Imperial Units'])
    // assert mi not in page
    await t.expect(Selector('span').withText(/mi/).exists).notOk()
    // go back to San Marino
    await safeReload(t)
    await t.expect(Selector('span').withText(/mi/).exists).notOk()
})

test('check-related-button-checkboxes-page-specific', async (t) => {
    // navigate to 91108
    await doSearch(t, '91108')
    await t.expect(getLocation()).match(/\/article\.html\?longname=91108%2C\+USA/)
    // this should not be page specific
    await t.expect(Selector('span').withText(/mi/).exists).ok()
    // San Marino should be present
    await t.expect(mapElement(/San Marino city/).exists).ok()
    // neighborhoods should not be present (Huntington Library)
    await t.expect(mapElement(/Huntington Library/).exists).notOk()
})

test('checkboxes-can-be-checked', async (t) => {
    // check that Pasadena CCD is not present
    await t.expect(mapElement(/Pasadena CCD/).exists).notOk()
    const pasadenaCCD = Selector('li')
        .withText(/Pasadena CCD/)
    // find a checkbox inside it
        .find('input')
    await t
        .click(pasadenaCCD)
    // check that Pasadena CCD is now present
    await t.expect(mapElement(/Pasadena CCD/).exists).ok()
    // check that this is persistent by going to Berkeley and checking that Briones CCD is present
    await doSearch(t, 'Berkeley, CA, USA')
    await t.expect(getLocation()).match(/\/article\.html\?longname=Berkeley\+city%2C\+California%2C\+USA/)
    await t.expect(mapElement(/Briones CCD/).exists).ok()
})
