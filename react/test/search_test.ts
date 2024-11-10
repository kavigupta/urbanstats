import {
    SEARCH_FIELD, TARGET, getLocation, screencap,
    urbanstatsFixture,
} from './test_utils'

urbanstatsFixture('shorter article test', `${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('search-test', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Pasadena')
    await screencap(t)
    await t
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Pasadena+city%2C+Texas%2C+USA&s=3PTGqijnkK`)
})

test('search-test-with-extra-char', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Pasadena c')
    await screencap(t)
})

test('search-test-with-special-chars', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Utt')
    await screencap(t)
})

test('search-test-different-first-char', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'hina')
    await screencap(t)
})

test('search-test-arrows', async (t) => {
    await t
        .click(SEARCH_FIELD)
    await t.wait(1000)
    await t
        .typeText(SEARCH_FIELD, 'Pasadena')
    await t.wait(1000)
    await t
        .pressKey('down')
        .pressKey('down')
    await screencap(t)
    await t
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Pasadena+CDP%2C+Maryland%2C+USA&s=3PTGqijnkK`)
})
