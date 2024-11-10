import { Selector } from 'testcafe'

import {
    SEARCH_FIELD, TARGET,
    getLocationWithoutSettings, screencap,
    urbanstatsFixture,
} from './test_utils'

urbanstatsFixture('article universe selector test', `/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('article-universe-selector-test-california', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t)
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'California, USA'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)
})

urbanstatsFixture('article universe selector test international', `/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India`)

test('article-universe-selector-test-india', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t)
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'India'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India&universe=India`)
    await screencap(t)
})

urbanstatsFixture('article universe navigation test', `/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)

test('article-universe-right-arrow', async (t) => {
    // click right population arrow
    await t
        .click(Selector('a').withText('>'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=Camp+Pendleton+South+CDP%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-ordinal', async (t) => {
    // click the ordinal for the universe
    const editableNumber = Selector('span').withAttribute('class', 'editable_number').nth(0)
    await t
        .click(editableNumber)
    // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=San+Jose+city%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-statistic-page', async (t) => {
    // click the link for Area
    await t
        .click(Selector('a').withText(/^Area$/))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/statistic.html?statname=Area&article_type=City&start=821&amount=20&universe=California%2C+USA`)
    await screencap(t)
})

test('article-universe-related-button', async (t) => {
    await t
        .click(Selector('a').withText('Los Angeles County'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=Los+Angeles+County%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-search', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Chino')
    await t
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=Chino+city%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-compare', async (t) => {
    // compare to San Francisco
    await t
        .click(Selector('input').withAttribute('placeholder', 'Other region...'))
        .typeText(Selector('input').withAttribute('placeholder', 'Other region...'), 'San Francisco city california')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(
            `${TARGET}/comparison.html?longnames=%5B%22San+Marino+city%2C+California%2C+USA%22%2C%22San+Francisco+city%2C+California%2C+USA%22%5D&universe=California%2C+USA`,
        )
    await screencap(t)
})

test('article-universe-compare-different', async (t) => {
    // compare to Chicago
    await t
        .click(Selector('input').withAttribute('placeholder', 'Other region...'))
        .typeText(Selector('input').withAttribute('placeholder', 'Other region...'), 'Chicago city illinois')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(
            `${TARGET}/comparison.html?longnames=%5B%22San+Marino+city%2C+California%2C+USA%22%2C%22Chicago+city%2C+Illinois%2C+USA%22%5D`,
        )
    await screencap(t)
})

urbanstatsFixture('article universe state test', `/article.html?longname=California%2C+USA`)

test('article-universe-state-world', async (t) => {
    // go to the world
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'world'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=California%2C+USA&universe=world`)
    // screenshot
    await screencap(t)
})

urbanstatsFixture('article universe state from subnational test', `/article.html?longname=Kerala%2C+India`)

test('article-universe-state-from-subnational', async (t) => {
    await screencap(t)
    // click the > button
    await t
        .click(Selector('a').withText('>'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${TARGET}/article.html?longname=California%2C+USA&universe=world`)
    await screencap(t)
})
