import { Selector } from 'testcafe'

import {
    SEARCH_FIELD, TARGET, check_all_category_boxes, check_textboxes, comparison_page, download_image,
    getLocation, screencap,
} from './test_utils'

fixture('longer article test')
    .page(`${TARGET}/article.html?longname=California%2C+USA`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('california-article-test', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t, 'article/california')
})

test('neighboring-state-test', async (t) => {
    await t.wait(1000)
    await screencap(t, 'article/california-with-neighbors')
    await t
        .click(Selector('path').withAttribute('class', /tag-Arizona,_USA/))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Arizona%2C+USA`)
})

fixture('shorter article test')
    .page(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`)
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('san-marino-article-test', async (t) => {
    await screencap(t, 'article/san-marino')
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
        .eql(`${TARGET}/article.html?longname=Chicago+city%2C+Illinois%2C+USA`)
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
        .eql(`${TARGET}/article.html?longname=Fortuna+city%2C+California%2C+USA`)
    await t
        .click(next)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`)
    await t
        .click(next)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Lakewood+Park+CDP%2C+Florida%2C+USA`)
    await t
        .click(prev)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`)

    await t.click(prev_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Havre+High+School+District%2C+Montana%2C+USA`)
    await t.click(next_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`)
    await t.click(next_overall)
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=78225%2C+USA`)
})

test('san-marino-2010-health', async (t) => {
    await check_textboxes(t, ['2010 Census', 'Health'])
    await screencap(t, 'article/san-marino-2010-health')
})

test('uncheck-box-mobile', async (t) => {
    // Find div with class checkbox-setting containing a label with text "Race"
    // and a checkbox, then find the checkbox
    await t.resizeWindow(400, 800)
    // refresh
    await t.eval(() => { location.reload() })
    await t.wait(1000)
    await check_textboxes(t, ['Race'])

    await screencap(t, 'article/remove_race_initial_mobile')
    // refresh
    await t.eval(() => { location.reload() })
    await screencap(t, 'article/remove_race_refresh_mobile')
})

test('uncheck-box-desktop', async (t) => {
    await t.resizeWindow(1400, 800)
    // refresh
    await t.eval(() => { location.reload() })
    await t.wait(1000)
    await check_textboxes(t, ['Race'])

    await screencap(t, 'article/remove_race_initial_desktop')
    // refresh
    await t.eval(() => { location.reload() })
    await screencap(t, 'article/remove_race_refresh_desktop')
})

test('simple', async (t) => {
    await t.resizeWindow(1400, 800)
    // refresh
    await t.eval(() => { location.reload() })
    await t.wait(1000)
    await check_textboxes(t, ['Simple Ordinals'])

    await screencap(t, 'article/simple-ordinals')
})

test('download-article', async (t) => {
    await download_image(t, 'article/download-article')
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

fixture('article universe selector test')
    .page(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('article-universe-selector-test', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t, 'article-dropped-down-universe-selector')
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'California, USA'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)
})

fixture('article universe selector test international')
    .page(`${TARGET}/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('article-universe-selector-test', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t, 'article-dropped-down-universe-selector-international')
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'India'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India&universe=India`)
    await screencap(t, 'article/delhi-india')
})

fixture('article universe navigation test')
    .page(`${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('article-universe-right-arrow', async (t) => {
    // click right population arrow
    await t
        .click(Selector('a').withText('>'))
    await t.expect(getLocation())
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
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=San+Jose+city%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-statistic-page', async (t) => {
    // click the link for Area
    await t
        .click(Selector('a').withText(/^Area$/))
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Area&article_type=City&start=821&amount=20&universe=California%2C+USA`)
    await screencap(t, 'statistics/universe-statistic-page')
})

test('article-universe-related-button', async (t) => {
    await t
        .click(Selector('a').withText('Los Angeles County'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Los+Angeles+County%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-search', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Chino')
    await t
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=Chino+city%2C+California%2C+USA&universe=California%2C+USA`)
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
    await screencap(t, 'comparison/universe-compare')
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
    await screencap(t, 'comparison/universe-compare-different')
})

fixture('article universe state test')
    .page(`${TARGET}/article.html?longname=California%2C+USA`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

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
        .eql(`${TARGET}/article.html?longname=California%2C+USA&universe=world`)
    // screenshot
    await screencap(t, 'article/california-world')
})

fixture('article universe state from subnational test')
    .page(`${TARGET}/article.html?longname=Kerala%2C+India`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('article-universe-state-from-subnational', async (t) => {
    await screencap(t, 'article/kerala-india')
    // click the > button
    await t
        .click(Selector('a').withText('>'))
    await t.expect(getLocation())
        .eql(`${TARGET}/article.html?longname=California%2C+USA&universe=world`)
    await screencap(t, 'article/california-world-from-kerala')
})

fixture('all stats test')
    .page(`${TARGET}/article.html?longname=California%2C+USA`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('california-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.eval(() => { location.reload() })
    await check_all_category_boxes(t)
    await screencap(t, 'article/california-all-stats')
})

// selected because the gz changed in statistic classes
fixture('all stats test regression')
    .page(`${TARGET}/article.html?longname=Charlotte%2C+Maine%2C+USA`)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('charlotte-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.eval(() => { location.reload() })
    await check_all_category_boxes(t)
    await screencap(t, 'article/charlotte-all-stats')
})
