import { Selector } from 'testcafe'

import {
    TARGET, check_all_category_boxes, check_textboxes, comparison_page, download_image,
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
        .eql(`${TARGET}/article.html?longname=Arizona%2C+USA&s=4YErw5vV5ZfzEX`)
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
        .eql(`${TARGET}/article.html?longname=Chicago+city%2C+Illinois%2C+USA&s=4YErw5vV5ZfzEX`)
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
        .eql(`${TARGET}/article.html?longname=Fortuna+city%2C+California%2C+USA&s=4YErw5vV5ZfzEX`)
    await t
        .click(next)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=4YErw5vV5ZfzEX`)
    await t
        .click(next)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Lakewood+Park+CDP%2C+Florida%2C+USA&s=4YErw5vV5ZfzEX`)
    await t
        .click(prev)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=4YErw5vV5ZfzEX`)

    await t.click(prev_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Havre+High+School+District%2C+Montana%2C+USA&s=4YErw5vV5ZfzEX`)
    await t.click(next_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&s=4YErw5vV5ZfzEX`)
    await t.click(next_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=78225%2C+USA&s=4YErw5vV5ZfzEX`)
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
