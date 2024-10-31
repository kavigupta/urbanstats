import { Selector } from 'testcafe'

import {
    SEARCH_FIELD, TARGET, check_all_category_boxes, check_textboxes, comparison_page, download_image,
    getLocation, screencap,
    urbanstatsFixture,
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
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Arizona%2C+USA&s=3t2X5xvsKo`)
})

urbanstatsFixture('shorter article test', `/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('san-marino-article-test', async (t) => {
    await screencap(t)
})

test('editable-number', async (t) => {
    // span with class editable_number
    const editableNumber = Selector('span').withAttribute('class', 'editable_number').nth(0)
    await t
        .click(editableNumber)
    // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(editableNumber.innerText).eql('3')
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Chicago+city%2C+Illinois%2C+USA&s=3t2X5xvsKo`)
})

test('lr-buttons', async (t) => {
    // button with a < on it
    const prev = Selector('a').withText('<').nth(0)
    const next = Selector('a').withText('>').nth(0)
    const prev_overall = Selector('a').withText('<').nth(1)
    const next_overall = Selector('a').withText('>').nth(1)
    await t
        .click(prev)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Fortuna+city%2C+California%2C+USA&s=3t2X5xvsKo`)
    await t
        .click(next)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=3t2X5xvsKo`)
    await t
        .click(next)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Lakewood+Park+CDP%2C+Florida%2C+USA&s=3t2X5xvsKo`)
    await t
        .click(prev)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=3t2X5xvsKo`)

    await t.click(prev_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Havre+High+School+District%2C+Montana%2C+USA&s=3t2X5xvsKo`)
    await t.click(next_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=3t2X5xvsKo`)
    await t.click(next_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=78225%2C+USA&s=3t2X5xvsKo`)
})

test('san-marino-2010-health', async (t) => {
    await check_textboxes(t, ['2010', 'Health'])
    await screencap(t)
})

test('uncheck-box-mobile', async (t) => {
    // Find div with class checkbox-setting containing a label with text "Race"
    // and a checkbox, then find the checkbox
    await t.resizeWindow(400, 800)
    await check_textboxes(t, ['Race'])

    await screencap(t)
    // refresh
    await t.eval(() => { location.reload() })
    await screencap(t)
})

test('uncheck-box-desktop', async (t) => {
    await t.resizeWindow(1400, 800)

    await check_textboxes(t, ['Race'])

    await screencap(t)
    // refresh
    await t.eval(() => { location.reload() })
    await screencap(t)
})

test('simple', async (t) => {
    await t.resizeWindow(1400, 800)

    await check_textboxes(t, ['Simple Ordinals'])

    await screencap(t)
})

test('download-article', async (t) => {
    await download_image(t)
})

test('create-comparison-from-article', async (t) => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Other region...')
    await t
        .click(otherRegion)
        .typeText(otherRegion, 'pasadena city california')
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(comparison_page(['San Marino city, California, USA', 'Pasadena city, California, USA']))
})

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
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=3t2X5xvsKo&universe=California%2C+USA`)
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
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India&s=3t2X5xvsKo&universe=India`)
    await screencap(t)
})

urbanstatsFixture('article universe navigation test', `/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)

test('article-universe-right-arrow', async (t) => {
    // click right population arrow
    await t
        .click(Selector('a').withText('>'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Camp+Pendleton+South+CDP%2C+California%2C+USA&universe=California%2C+USA&s=3t2X5xvsKo`)
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
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Jose+city%2C+California%2C+USA&universe=California%2C+USA&s=3t2X5xvsKo`)
})

test('article-universe-statistic-page', async (t) => {
    // click the link for Area
    await t
        .click(Selector('a').withText(/^Area$/))
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Area&article_type=City&start=821&amount=20&universe=California%2C+USA`)
    await screencap(t)
})

test('article-universe-related-button', async (t) => {
    await t
        .click(Selector('a').withText('Los Angeles County'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Los+Angeles+County%2C+California%2C+USA&universe=California%2C+USA&s=3t2X5xvsKo`)
})

test('article-universe-search', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Chino')
    await t
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Chino+city%2C+California%2C+USA&universe=California%2C+USA&s=3t2X5xvsKo`)
})

test('article-universe-compare', async (t) => {
    // compare to San Francisco
    await t
        .click(Selector('input').withAttribute('placeholder', 'Other region...'))
        .typeText(Selector('input').withAttribute('placeholder', 'Other region...'), 'San Francisco city california')
        .pressKey('enter')
    await t.expect(getLocation())
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
    await t.expect(getLocation())
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
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=California%2C+USA&s=3t2X5xvsKo&universe=world`)
    // screenshot
    await screencap(t)
})

urbanstatsFixture('article universe state from subnational test', `/article.html?longname=Kerala%2C+India`)

test('article-universe-state-from-subnational', async (t) => {
    await screencap(t)
    // click the > button
    await t
        .click(Selector('a').withText('>'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=California%2C+USA&universe=world&s=3t2X5xvsKo`)
    await screencap(t)
})

urbanstatsFixture('all stats test', `/article.html?longname=California%2C+USA`)

test('california-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await check_all_category_boxes(t)
    await screencap(t)
})

// selected because the gz changed in statistic classes
urbanstatsFixture('all stats test regression', `/article.html?longname=Charlotte%2C+Maine%2C+USA`)

test('charlotte-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await check_all_category_boxes(t)
    await screencap(t)
})
