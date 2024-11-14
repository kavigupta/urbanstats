import fs from 'fs'

import { Selector } from 'testcafe'

import {
    SEARCH_FIELD, TARGET, check_textboxes, getLocation,
    safeReload,
    screencap,
    urbanstatsFixture,
} from './test_utils'

const testLocation = `${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`

urbanstatsFixture('settings regression test', testLocation,
    async (t) => {
        const EG_SETTINGS = fs.readFileSync('test/assets/saved-settings-1.json').toString()
        await t.eval(() => {
            localStorage.setItem('settings', EG_SETTINGS)
            // Delete settings param so old settings don't persist after navigation
            window.location.href = testLocation
        }, { dependencies: { EG_SETTINGS, testLocation } })
    })

test('check-settings-loaded', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
    // check there's an element containing class Huntington_Library
    await t.expect(Selector('path').withAttribute('class', /tag-Huntington_Library/).exists).ok()
    // check that there's no element Pasadena_city or 91101
    await t.expect(Selector('path').withAttribute('class', /tag-Pasadena_city/).exists).notOk()
    await t.expect(Selector('path').withAttribute('class', /tag-91101/).exists).notOk()
})

test('check-settings-loaded-desktop', async (t) => {
    // screenshot path: images/first_test.png
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('check-settings-persistent', async (t) => {
    await t.expect(Selector('span').withText('mi').exists).ok()
    // navigate to Pasadena via search
    await t.typeText(SEARCH_FIELD, 'Pasadena, CA, USA')
    await t.pressKey('enter')
    await t.expect(getLocation()).match(/\/article\.html\?longname=Pasadena\+city%2C\+California%2C\+USA/)
    // check box "Imperial"
    await check_textboxes(t, ['Use Imperial Units'])
    // assert mi not in page
    await t.expect(Selector('span').withText('mi').exists).notOk()
    // go back to San Marino
    await safeReload(t)
    await t.expect(Selector('span').withText('mi').exists).notOk()
})

test('check-related-button-checkboxes-page-specific', async (t) => {
    // navigate to 91108
    await t.typeText(SEARCH_FIELD, '91108')
    await t.pressKey('enter')
    await t.expect(getLocation()).match(/\/article\.html\?longname=91108%2C\+USA/)
    // this should not be page specific
    await t.expect(Selector('span').withText('mi').exists).ok()
    // San Marino should be present
    await t.expect(Selector('path').withAttribute('class', /tag-San_Marino_city/).exists).ok()
    // neighborhoods should not be present (Huntington Library)
    await t.expect(Selector('path').withAttribute('class', /tag-Huntington_Library/).exists).notOk()
})

test('checkboxes-can-be-checked', async (t) => {
    // check that Pasadena CCD is not present
    await t.expect(Selector('path').withAttribute('class', /tag-Pasadena_CCD/).exists).notOk()
    const pasadena_ccd = Selector('li').withAttribute('class', 'list_of_lists')
        .withText('Pasadena CCD')
    // find a checkbox inside it
        .find('input')
    await t
        .click(pasadena_ccd)
    // check that Pasadena CCD is now present
    await t.expect(Selector('path').withAttribute('class', /tag-Pasadena_CCD/).exists).ok()
    // check that this is persistent by going to Berkeley and checking that Briones CCD is present
    await t.typeText(SEARCH_FIELD, 'Berkeley, CA, USA')
    await t.pressKey('enter')
    await t.expect(getLocation()).match(/\/article\.html\?longname=Berkeley\+city%2C\+California%2C\+USA&s=4YFxurQq2ob9Rf/)
    await t.expect(Selector('path').withAttribute('class', /tag-Briones_CCD/).exists).ok()
})
