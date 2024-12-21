import { Selector } from 'testcafe'

import {
    searchField, target, getLocationWithoutSettings, screencap,
    urbanstatsFixture,
    getLocation,
    openInNewTabModifiers,
} from './test_utils'

urbanstatsFixture('shorter article test', `${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('search-test', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
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
    await t.click(Selector('a').withText('Pasadena'), { modifiers: openInNewTabModifiers })
    await t.expect(getLocation()).match(/article\.html\?longname=San\+Marino\+city%2C\+California%2C\+USA/)
})
