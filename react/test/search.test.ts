import { Selector } from 'testcafe'

import {
    searchField, target, getLocationWithoutSettings, screencap,
    urbanstatsFixture,
    getLocation,
    openInNewTabModifiers,
    waitForPageLoaded,
    pageDescriptorKind,
    waitForSelectedSearchResult,
    createComparison,
    checkTextboxes,
} from './test_utils'

urbanstatsFixture('shorter article test', `${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('search-test', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)
    await screencap(t)
    await t
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Pasadena+city%2C+Texas%2C+USA`)
})

test('search-test-with-extra-char', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena c')
    await screencap(t)
})

test('search-test-with-special-chars', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Utt')
    await screencap(t)
})

test('search-test-different-first-char', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'hina')
    await screencap(t)
})

test('search-test-arrows', async (t) => {
    await t
        .click(searchField)
    await t.wait(1000)
    await t
        .typeText(searchField, 'Pasadena')
    await t.wait(1000)
    await t
        .pressKey('down')
        .pressKey('down')
    await screencap(t)
    await t
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Pasadena+CDP%2C+Maryland%2C+USA`)
})

// Regession test for a crash
test('tab tab type', async (t) => {
    await t.pressKey('tab').pressKey('tab')
    await t.expect(Selector(searchField).focused).ok()
    await t.pressKey('a')
})

test('control click search result to open in new tab', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await t.click(Selector('a').withText(/Pasadena/), { modifiers: openInNewTabModifiers })
    await t.expect(getLocation()).match(/article\.html\?longname=San\+Marino\+city%2C\+California%2C\+USA/)
})

test('can visit Umm Siado', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Umm Siado')
    await t.click(Selector('a').withText(/Umm Siado/))
    await t.expect(getLocation()).match(/article\.html\?longname=Umm\+Siado%3F%3F\+Urban\+Center%2C\+Sudan/)
    await waitForPageLoaded(t)
    await t.expect(pageDescriptorKind()).eql('article')
})

test('on mobile, closes the sidebar when you search', async (t) => {
    await t.resizeWindow(400, 800)
    await t.navigateTo('/article.html?longname=San+Jose+Urban+Center%2C+USA') // Need to navigate to an article first, otherwise the page change closes the sidebar
    await t.click('.hamburgermenu')
    await t
        .click(searchField)
        .typeText(searchField, 'Santa Rosa, CA')
    await t.click(Selector('div').withExactText('Santa Rosa city, California, USA'))
    await t.expect(Selector('.sidebar_mobile').exists).notOk()
})

test('when adding another article for comparison, should prioritize regions of the same type', async (t) => {
    await createComparison(t, 'san jose', 'San Jose city, California, USA')
})

test('search for a MPC', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Perth 10MPC')
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
    await t.expect(getLocation()).match(/article\.html\?longname=Perth\+10MPC%2C\+Australia/)
    await waitForPageLoaded(t)
    await checkTextboxes(t, ['Include Person Circles'])
    await t.click(searchField)
        .typeText(searchField, 'Perth 10MPC')
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
    await t.expect(getLocation()).notMatch(/article\.html\?longname=Perth\+10MPC%2C\+Australia/)
    await screencap(t)
    await checkTextboxes(t, ['Include Person Circles'])
    await screencap(t)
})
