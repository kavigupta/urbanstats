import { Selector } from 'testcafe'

import {
    target, checkAllCategoryBoxes, checkSidebarTextboxes, checkTextboxes, comparisonPage, downloadImage,
    getLocationWithoutSettings, safeReload, screencap,
    urbanstatsFixture,
    createComparison,
    clickMapFeature,
    waitForLoading,
} from './test_utils'

function articleUrl(longname: string): string {
    return `/article.html?longname=${encodeURIComponent(longname).replace(/%20/g, '+')}`
}

urbanstatsFixture('longer article test', '/article.html?longname=California%2C+USA')

test('california-article-test', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t)
})

test('neighboring-state-test', async (t) => {
    await screencap(t)
    await clickMapFeature(/Arizona, USA/)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Arizona%2C+USA`)
})

test('editable-percentile-population-california', async (t) => {
    // California is the most populous state, so it holds the highest population percentile
    // (~88th -- the maximum, since it can't be more populous than itself). Asking for the 95th
    // percentile (above that maximum) should therefore resolve to the top geography, staying on
    // California, rather than jumping to a less-populous state.
    const editablePercentile = Selector('div').withAttribute('data-test-id', 'statistic-percentile').nth(0)
        .find('span').withAttribute('class', 'editable_content')
    await t
        .click(editablePercentile)
        .pressKey('ctrl+a')
        .typeText(editablePercentile, '95')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=California%2C+USA`)
    // The field must snap back to California's true maximum percentile (88), not keep
    // echoing the out-of-range 95 that was entered.
    await t.expect(editablePercentile.innerText).eql('88')
})

urbanstatsFixture('zeroth percentile test', '/article.html?longname=North+Dakota%2C+USA')

test('editable-percentile-zeroth-does-not-trap', async (t) => {
    // North Dakota sits at the 0th population percentile but is not the least-populous state
    // (several states/territories are tied at the 0th percentile). Submitting the 0th percentile --
    // even though the field already shows "0" -- must navigate to the bottom of that bucket (the
    // least-populous state/territory, US Virgin Islands) rather than doing nothing.
    const editablePercentile = Selector('div').withAttribute('data-test-id', 'statistic-percentile').nth(0)
        .find('span').withAttribute('class', 'editable_content')
    await t
        .click(editablePercentile)
        .pressKey('ctrl+a')
        .typeText(editablePercentile, '0')
        .pressKey('enter')
    // Navigation is async (loadStatisticsPage), so use a retrying assertion rather than snapshotting
    // the URL once, which could read the location before navigation completes.
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}${articleUrl('US Virgin Islands, USA')}`)
})

test('editable-percentile-hundredth-goes-to-top-state', async (t) => {
    // The 100th percentile resolves to the top of the bucket -- the most-populous state, California.
    const editablePercentile = Selector('div').withAttribute('data-test-id', 'statistic-percentile').nth(0)
        .find('span').withAttribute('class', 'editable_content')
    await t
        .click(editablePercentile)
        .pressKey('ctrl+a')
        .typeText(editablePercentile, '100')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}${articleUrl('California, USA')}`)
})

test('editable-percentile-median-state', async (t) => {
    // The 50th percentile among states/territories resolves to the median, Georgia.
    const editablePercentile = Selector('div').withAttribute('data-test-id', 'statistic-percentile').nth(0)
        .find('span').withAttribute('class', 'editable_content')
    await t
        .click(editablePercentile)
        .pressKey('ctrl+a')
        .typeText(editablePercentile, '50')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}${articleUrl('Georgia, USA')}`)
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
    // the editable ordinal for the first statistic (population)
    const editableNumber = Selector('span').withAttribute('data-test-id', 'editable-ordinal').nth(0)
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

test('editable-percentile', async (t) => {
    // the editable percentile for the first statistic (population); editing it jumps to
    // the bottom of the requested percentile bucket among cities. The 50th percentile
    // resolves to the median city, Monterey Park.
    const editablePercentile = Selector('div').withAttribute('data-test-id', 'statistic-percentile').nth(0)
        .find('span').withAttribute('class', 'editable_content')
    await t
        .click(editablePercentile)
        .pressKey('ctrl+a')
        .typeText(editablePercentile, '50')
        .pressKey('enter')
    // Navigation is async (loadStatisticsPage), so use a retrying assertion rather than snapshotting
    // the URL once, which could read the location before navigation completes.
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}${articleUrl('Monterey Park city, California, USA')}`)
})

test('editable-percentile-hundredth-goes-to-top-city', async (t) => {
    // The 100th percentile resolves to the top of the bucket -- the most-populous city, New York.
    const editablePercentile = Selector('div').withAttribute('data-test-id', 'statistic-percentile').nth(0)
        .find('span').withAttribute('class', 'editable_content')
    await t
        .click(editablePercentile)
        .pressKey('ctrl+a')
        .typeText(editablePercentile, '100')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}${articleUrl('New York city, New York, USA')}`)
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

    await checkSidebarTextboxes(t, ['Simple Ordinals'])

    await screencap(t)
})

test('download-article', async (t) => {
    await downloadImage(t)
})

test('download-article-dark', async (t) => {
    await t.click(Selector('.theme-setting').find('select')).click(Selector('option').withExactText('Dark Mode'))
    await downloadImage(t)
})

test('create-comparison-from-article', async (t) => {
    await createComparison(t, 'pasadena city california')
    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage(['San Marino city, California, USA', 'Pasadena city, California, USA']))
})

// just area and compactness
urbanstatsFixture('lr overall', `/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya&s=D9dego8tisfjWgh`)

test('lr-overall-other-stat', async (t) => {
    const prevOverallArea = Selector('button[data-test-id="-1"]').nth(1)
    const nextOverallArea = Selector('button[data-test-id="1"]').nth(1)
    const prevOverallCompactness = Selector('button[data-test-id="-1"]').nth(3)
    const nextOverallCompactness = Selector('button[data-test-id="1"]').nth(3)
    await t
        .click(prevOverallArea)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=49633%2C+USA&universe=world`)
    await waitForLoading()
    await t
        .click(nextOverallArea)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
    await waitForLoading()
    // check that prevOverallCompactness is disabled
    await t.expect(prevOverallCompactness.hasAttribute('disabled')).ok()
    // check that prevOverallCompactness does nothing when clicked
    await t.click(prevOverallCompactness)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
    await waitForLoading()

    await t.click(nextOverallCompactness)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Singapore+%28Center%29+5MPC%2C+Singapore`)
    await waitForLoading()
    // check that prevOverallCompactness is enabled
    await t.expect(prevOverallCompactness.hasAttribute('disabled')).notOk()
    await t.click(prevOverallCompactness)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Nairobi+%28Center%29+5MPC%2C+Kenya`)
    await waitForLoading()
    // least compact region
    await t.navigateTo('/article.html?longname=Cairo+Metropolitan+Cluster%2C+Egypt&s=D9dego8tisfjWgh')
    // check that nextOverallCompactness is disabled
    await t.expect(nextOverallCompactness.hasAttribute('disabled')).ok()
    // check that nextOverallCompactness does nothing when clicked
    await t.click(nextOverallCompactness)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Cairo+Metropolitan+Cluster%2C+Egypt`)
    await waitForLoading()
    // check that prevOverallCompactness is enabled
    await t.expect(prevOverallCompactness.hasAttribute('disabled')).notOk()
    await t.click(prevOverallCompactness)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Fiji`)
    await waitForLoading()
    // check that nextOverallCompactness is enabled
    await t.expect(nextOverallCompactness.hasAttribute('disabled')).notOk()
    await t.click(nextOverallCompactness)
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Cairo+Metropolitan+Cluster%2C+Egypt`)
    await waitForLoading()
})

// Regression test for California article with specific settings (US Census and Area/Compactness unchecked)
urbanstatsFixture('california-article-area-compactness-no-us-census', '/article.html?longname=California%2C+USA&universe=world&s=2jZmh2wde1Kqyhw')

test('california-article-area-compactness-no-us-census', async (t) => {
    // If this page fails to load, the fixture will surface console errors or network failures.
    // Simply take a screenshot to verify the page renders without crashing.
    await screencap(t)
})

urbanstatsFixture('all stats test', `/article.html?longname=California%2C+USA`)

test('california-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkAllCategoryBoxes(t)
    // Verify life expectancy (81.407) is rendered as 81.4 (3 significant figures)
    await t.expect(Selector('span').withExactText('81.4').exists).ok()
    // Verify compactness (0.253) is still rendered as 0.253 (3 significant figures)
    await t.expect(Selector('span').withExactText('0.253').exists).ok()
    await screencap(t)
})

// selected because the gz changed in statistic classes
urbanstatsFixture('all stats test regression', `/article.html?longname=Charlotte%2C+Maine%2C+USA`)

test('charlotte-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkAllCategoryBoxes(t)
    await screencap(t)
})

urbanstatsFixture('all stats test', `/article.html?longname=Toronto+CDR%2C+Ontario%2C+Canada`)

test('toronto-cdr-all-stats', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkAllCategoryBoxes(t)
    await screencap(t)
})
