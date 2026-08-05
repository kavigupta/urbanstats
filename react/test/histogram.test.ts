import { ClientFunction, Selector } from 'testcafe'

import { target, checkIndividualStat, checkSidebarTextboxes, checkTextboxes, comparisonPage, downloadHistogram, downloadImage, downloadOrCheckString, screencap, urbanstatsFixture, waitForLoading, waitForSelectedSearchResult, getLocationWithoutSettings } from './test_utils'

export const upperSGV = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const pasadena = 'Pasadena CCD [CCD], Los Angeles County, California, USA'
export const swSGV = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const eastSGV = 'East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const chicago = 'Chicago city [CCD], Cook County, Illinois, USA'

async function downloadOrCheckHistogram(t: TestController, name: string, nth = 0): Promise<void> {
    const output = await t.eval(() => {
        return document.getElementsByClassName('histogram-svg-panel')[nth].innerHTML
    }, { dependencies: { nth } }) as string
    await downloadOrCheckString(t, output, name, 'xml')
}

urbanstatsFixture('article check and uncheck test', `${target}/article.html?longname=New+York+Urban+Center%2C+USA&universe=world`)

test('histogram-article-check-uncheck', async (t) => {
    await t.resizeWindow(400, 800)
    // count the number of `histogram-svg-panel` elements
    await t.expect(Selector('.histogram-svg-panel').count).eql(0)
    await t.click(Selector('.expand-toggle'))
    await t.expect(Selector('.histogram-svg-panel').count).eql(1)
    await t.click(Selector('.expand-toggle'))
    await t.expect(Selector('.histogram-svg-panel').count).eql(0)
})

urbanstatsFixture('article test', `${target}/article.html?longname=Germany&universe=world`)

test('histogram-basic-article', async (t) => {
    await t.resizeWindow(400, 800)
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-basic-article')
})

test('histogram-basic-article-multi', async (t) => {
    await t.resizeWindow(400, 800)
    await checkTextboxes(t, ['Other Density Metrics'])
    const count = await Selector('.expand-toggle').count
    for (let i = 0; i < count; i++) {
        await t.click(Selector('.expand-toggle').nth(i))
    }
    await screencap(t)
    await downloadImage(t)
    await downloadHistogram(t, 0)
    await downloadHistogram(t, 1)
})

urbanstatsFixture('comparison test heterogenous', comparisonPage(['San Marino city, California, USA', pasadena, swSGV]))

test('histogram-basic-comparison', async (t) => {
    await t.resizeWindow(400, 800)
    // select element with class name `expand-toggle`
    await t.expect(Selector('.expand-toggle').count).eql(1)
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-basic-comparison')
})

urbanstatsFixture('comparison test heterogenous with nan', comparisonPage(['India', 'China', pasadena]))

test('histogram-basic-comparison-nan', async (t) => {
    await t.resizeWindow(400, 800)
    // select element with class name `expand-toggle`
    await t.expect(Selector('.expand-toggle').count).eql(1)
    await t.click(Selector('.expand-toggle').nth(0))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-basic-comparison-nan')
})

urbanstatsFixture('comparison test heterogenous with nan in the middle', comparisonPage(['India', pasadena, 'China']))

test('histogram-basic-comparison-nan-middle', async (t) => {
    await t.resizeWindow(400, 800)
    // select element with class name `expand-toggle`
    await t.expect(Selector('.expand-toggle').count).eql(1)
    await t.click(Selector('.expand-toggle').nth(0))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-basic-comparison-nan-middle')
})

// Regression tests for a bug where comparing a region with valid partner-stat data
// (e.g. Canada, which has both rainfall and snowfall) against a region where the
// partner stat is invalid/all-zero (e.g. Singapore, which has no snowfall) caused
// the region without valid partner data to mislabel its series with a bare year
// (e.g. "2020") instead of "Rain", producing a bogus extra entry in the shared legend.

urbanstatsFixture('comparison test monthly plot with mismatched pair validity', comparisonPage(['Singapore', 'Canada']))

test('histogram-monthly-comparison-mismatched-pair-validity', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await downloadHistogram(t, 0)
})

// Tooltip regression coverage: paired series (Rain/Snow, High/Low) for the same region
// should be stacked onto one tooltip line ("Canada: 4.8cm / 4.2cm") rather than two
// separate lines that both just say "Canada: <value>". A region with no valid partner
// data (Singapore has no snowfall) should keep its single unstacked value.
test('histogram-monthly-tooltip-stacks-rain-snow', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await t.hover(Selector('g[aria-label="dot"] circle').nth(0))
    const tip = Selector('g[aria-label="tip"] tspan')
    await t.expect(tip.withText(/^.?Canada: [-\d.]+cm \/ [-\d.]+cm$/).exists).ok('Canada should stack Rain / Snow onto one line')
    await t.expect(tip.withText(/^.?Singapore: [-\d.]+cm$/).exists).ok('Singapore should show a single unstacked value')
})

// Same mismatched validity, but with a third (also-valid) region in the mix.
urbanstatsFixture('comparison test monthly plot with mismatched pair validity, three regions', comparisonPage(['Singapore', 'Canada', 'Russia']))

test('histogram-monthly-comparison-mismatched-pair-validity-triple', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await downloadHistogram(t, 0)
})

// Both regions lack the partner stat (neither has valid snowfall) -- the dashed
// overlay line should simply not appear, rather than crashing or mislabeling.
urbanstatsFixture('comparison test monthly plot with symmetric invalid pair', comparisonPage(['Singapore', 'Malaysia']))

test('histogram-monthly-comparison-symmetric-invalid-pair', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await downloadHistogram(t, 0)
})

// Expanding from the invalid side of the pair (Singapore's own snowfall data is invalid) should
// still show Singapore's valid Rain data -- not drop the region from the chart entirely, which
// was a real bug: pullRelevantPlotProps used to bail out as soon as the *own* stat (Snowfall) had
// no data, without ever checking whether the pair partner (Rainfall) did.
urbanstatsFixture('comparison test monthly plot expanding the invalid side of the pair', comparisonPage(['Singapore', 'Canada']))

test('histogram-monthly-comparison-expand-invalid-own-stat', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Snowfall [rain-equivalent]"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Singapore$/).exists).ok('Singapore should still appear, via its valid Rain data')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Canada$/).exists).ok('Canada should still appear, with both Rain and Snow')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Rain$/).exists).ok('Rain legend entry')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Snow$/).exists).ok('Snow legend entry')
    // the axis label is picked per-region (Singapore is solo Rain, Canada is paired), so this
    // regression-tests always preferring a region where the pair is genuinely shown -- the axis
    // should read "Precipitation", not "Rain", since Canada's Snow line is on this chart too
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Precipitation \(rain equivalent/).exists).ok('axis label should reflect the pair, not just Singapore\'s solo Rain')
    await downloadHistogram(t, 0)
})

// A different pair (high/low temperature, both valid) for general coverage of the
// cross-stat pairing mechanism beyond rain/snow.
urbanstatsFixture('comparison test monthly plot with high/low temperature pair', comparisonPage(['USA', 'Canada']))

test('histogram-monthly-comparison-temperature-pair', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    await downloadHistogram(t, 0)
})

// Same tooltip-stacking check as the rain/snow case, but for the High/Low temperature pair.
test('histogram-monthly-tooltip-stacks-high-low', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    await t.hover(Selector('g[aria-label="dot"] circle').nth(0))
    const tip = Selector('g[aria-label="tip"] tspan')
    await t.expect(tip.withText(/^.?USA: [-\d.]+°F \/ [-\d.]+°F$/).exists).ok('USA should stack High / Low onto one line')
    await t.expect(tip.withText(/^.?Canada: [-\d.]+°F \/ [-\d.]+°F$/).exists).ok('Canada should stack High / Low onto one line')
})

// Temperature stats have a second plot mode -- a distribution ("Distribution") in addition
// to the monthly overlay ("Monthly") -- which is otherwise untested. The high/low overlay is
// deliberately excluded from Distribution mode (pairedInFor: ['monthly_time_series']), so
// switching modes and back should toggle the "Low" series on and off without losing state.
urbanstatsFixture('comparison test temperature distribution mode switch', comparisonPage(['USA', 'Canada']))

test('histogram-temperature-distribution-mode-switch', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Low$/).exists).ok('Low overlay should be visible in Monthly mode')

    const modeSelect = Selector('[data-test-id=plot_mode]')
    await t.click(modeSelect).click(modeSelect.find('option').withExactText('Distribution'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Low$/).exists).notOk('Low overlay should be excluded from Distribution mode')
    await downloadHistogram(t, 0)

    await t.click(modeSelect).click(modeSelect.find('option').withExactText('Monthly'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Low$/).exists).ok('Low overlay should reappear after switching back to Monthly')
})

// Distribution mode for a single article (no cross-region legend, no pairing) --
// exercises TemperatureHistogramPlot outside of a comparison.
urbanstatsFixture('article test temperature distribution mode', `${target}/article.html?longname=Germany&universe=world`)

test('histogram-temperature-distribution-article', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    const modeSelect = Selector('[data-test-id=plot_mode]')
    await t.click(modeSelect).click(modeSelect.find('option').withExactText('Distribution'))
    await downloadHistogram(t, 0)
})

// Regression test for TemperatureHistogramPlot clipping the x-axis to the region's actual
// temperature range (temperatureHistogramBounds in plots-temperature-histogram-bins.ts), instead
// of always spanning the fixed global bin range (-40F to 140F, 19 boundary ticks). Pasadena's
// real climate never approaches either extreme, so if clipping regresses, the axis would widen
// back out to the full range and the -40F/140F boundary ticks would reappear.
urbanstatsFixture('article test temperature distribution axis clipping', `${target}/article.html?${new URLSearchParams({ longname: pasadena }).toString()}`)

test('histogram-temperature-distribution-clips-axis', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    const modeSelect = Selector('[data-test-id=plot_mode]')
    await t.click(modeSelect).click(modeSelect.find('option').withExactText('Distribution'))

    const axisTicks = Selector('.histogram-svg-panel').find('text').withText(/^-?\d+°F$/)
    await t.expect(axisTicks.count).gt(0, 'expected at least one temperature axis tick')
    await t.expect(axisTicks.count).lt(19, 'axis should show fewer ticks than the full -40F..140F range')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^-40°F$/).exists).notOk('axis should not reach the global minimum bin (-40F) for this region')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^140°F$/).exists).notOk('axis should not reach the global maximum bin (140F) for this region')
})

// Regression coverage for converting monthly precipitation values to imperial units
// (rainfall/snowfall are stored in metric and converted for display) -- combined with
// the mismatched-pair-validity regions to make sure the two don't interact badly.
urbanstatsFixture('comparison test monthly plot with imperial units, precipitation', comparisonPage(['Singapore', 'Canada']))

test('histogram-monthly-comparison-imperial-units-precipitation', async (t) => {
    await checkSidebarTextboxes(t, ['Use Imperial Units'])
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await downloadHistogram(t, 0)
})

// Same idea, but for the other weather-plot unit kind: temperature (°F/°C via the
// separate "Temperatures" dropdown, not the "Use Imperial Units" checkbox). Exercises
// both the metric (Celsius) and imperial (Fahrenheit) conversion branches for the
// monthly high/low temperature overlay.
urbanstatsFixture('comparison test monthly plot with imperial units, temperature', comparisonPage(['USA', 'Canada']))

test('histogram-monthly-comparison-imperial-units-temperature', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    const temperatureSelect = Selector('[data-test-id=temperature_select]')

    await t.click(temperatureSelect).click(temperatureSelect.find('option').withExactText('°C'))
    await downloadHistogram(t, 0)

    await t.click(temperatureSelect).click(temperatureSelect.find('option').withExactText('°F'))
    await downloadHistogram(t, 0)
})

urbanstatsFixture('germany default', `${target}/article.html?longname=Germany&universe=world`)

// just one temperature checked
test('histogram-monthly-article-just-high-temp', async (t) => {
    await checkIndividualStat(t, 'Weather', 'Mean high temp')
    await t.expect(Selector('[aria-label="Expand Mean low temp"]').exists).notOk('Low should not have a row at all when unchecked')
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Mean high temp by month/).exists).ok('solo axis label should name the stat, not "Mean Temp by Month"')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Low$/).exists).notOk('no Low legend entry when Low is unchecked')
    await downloadHistogram(t, 0)
})

test('histogram-monthly-article-just-low-temp', async (t) => {
    await checkIndividualStat(t, 'Weather', 'Mean low temp')
    await t.expect(Selector('[aria-label="Expand Mean high temp"]').exists).notOk('High should not have a row at all when unchecked')
    await t.click(Selector('[aria-label="Expand Mean low temp"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Mean low temp by month/).exists).ok('solo axis label should name the stat, not "Mean Temp by Month"')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^High$/).exists).notOk('no High legend entry when High is unchecked')
    await downloadHistogram(t, 0)
})

// Both temperatures present
test('histogram-monthly-article-both-temps', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Mean Temp by Month/).exists).ok('paired axis label when both are present')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^High$/).exists).ok('High legend entry')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Low$/).exists).ok('Low legend entry')
    await downloadHistogram(t, 0)
})

test('histogram-temperature-distribution-article-low-temp', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean low temp"]'))
    const modeSelect = Selector('[data-test-id=plot_mode]')
    await t.click(modeSelect).click(modeSelect.find('option').withExactText('Distribution'))
    await downloadHistogram(t, 0)
})

// Snow and rain one at a time
test('histogram-monthly-article-just-rain', async (t) => {
    await checkIndividualStat(t, 'Weather', 'Rainfall')
    await t.expect(Selector('[aria-label="Expand Snowfall [rain-equivalent]"]').exists).notOk('Snow should not have a row at all when unchecked')
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Rain \(/).exists).ok('solo Rain axis label')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Snow$/).exists).notOk('no Snow legend entry when Snow is unchecked')
    await downloadHistogram(t, 0)
})

test('histogram-monthly-article-just-snow', async (t) => {
    await checkIndividualStat(t, 'Weather', 'Snowfall [rain-equivalent]')
    await t.expect(Selector('[aria-label="Expand Rainfall"]').exists).notOk('Rain should not have a row at all when unchecked')
    await t.click(Selector('[aria-label="Expand Snowfall [rain-equivalent]"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Snow \(rain equivalent/).exists).ok('solo Snow axis label')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Rain$/).exists).notOk('no Rain legend entry when Rain is unchecked')
    await downloadHistogram(t, 0)
})

urbanstatsFixture(
    'comparison test temperature distribution, extreme climates',
    `${target}/comparison.html?${new URLSearchParams({ longnames: JSON.stringify(['San Luis city, Arizona, USA', 'Utqiaġvik city, Alaska, USA']) }).toString()}`,
)

test('histogram-temperature-distribution-comparison-extreme-climates', async (t) => {
    // the combining-diacritic longname (Utqiaġvik) takes a little longer to resolve than a plain-ASCII one
    await waitForLoading()
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Mean high temp"]'))
    const modeSelect = Selector('[data-test-id=plot_mode]')
    await t.click(modeSelect).click(modeSelect.find('option').withExactText('Distribution'))

    const axisTicks = Selector('.histogram-svg-panel').find('text').withText(/^-?\d+°F$/)
    await t.expect(axisTicks.count).gt(0, 'expected at least one temperature axis tick')
    // even the union of a desert and an Arctic town's real data should never need ticks
    // outside the true global bin range
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^-50°F$/).exists).notOk('axis should never go below the global minimum bin (-40F)')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^150°F$/).exists).notOk('axis should never go above the global maximum bin (140F)')
    await downloadHistogram(t, 0)
})

urbanstatsFixture('article test with no snow at all', `${target}/article.html?longname=Singapore&universe=world`)

test('histogram-monthly-article-snow-when-none', async (t) => {
    await checkIndividualStat(t, 'Weather', 'Snowfall [rain-equivalent]')
    await t.expect(Selector('[aria-label="Expand Snowfall [rain-equivalent]"]').exists).notOk('no chart to expand -- Singapore has no valid snowfall data')
    await t.expect(Selector('div').withText(/^Singapore$/).exists).ok('rest of the page should still work fine')
})

// Regression test: the "expanded" flag for a row is a global per-statpath setting (it
// persists across navigation, not scoped to the currently-viewed region). Previously,
// expanding Snowfall on Canada (which has valid snow) and then navigating to Singapore
// (which has none) would leave the Snowfall plot visibly expanded on Singapore's page
urbanstatsFixture('expand snow on a valid region, then navigate to one with none', `${target}/article.html?longname=Canada&universe=world`)

test('histogram-monthly-expanded-state-does-not-leak-to-invalid-region', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Snowfall [rain-equivalent]"]'))
    await t.expect(Selector('.histogram-svg-panel').count).eql(1)

    await t.navigateTo(`${target}/article.html?longname=Singapore&universe=world`)
    await waitForLoading()
    await t.expect(Selector('[aria-label="Expand Snowfall [rain-equivalent]"]').exists).notOk('no toggle for a region with no valid snowfall data, even with a leftover "expanded" setting')
    await t.expect(Selector('.histogram-svg-panel').count).eql(0)
})

// Both Rain and Snow checked (via "Weather") on a single, non-comparison article with valid
// data for both -- the paired overlay mechanism doesn't require a comparison.
urbanstatsFixture('article test with both rain and snow', `${target}/article.html?longname=Canada&universe=world`)

test('histogram-monthly-article-both-rain-snow', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/Precipitation \(rain equivalent/).exists).ok('paired axis label when both are present')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Rain$/).exists).ok('Rain legend entry')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Snow$/).exists).ok('Snow legend entry')
    await downloadHistogram(t, 0)
})

// A comparison where BOTH regions have fully valid rain and snow data (unlike the
// mismatched/symmetric-invalid tests above, which are specifically about invalid data) --
// general coverage of the clean, common case for a rain/snow comparison.
urbanstatsFixture('comparison test with both rain and snow, both valid', comparisonPage(['Canada', 'Russia']))

test('histogram-monthly-comparison-both-rain-snow-valid', async (t) => {
    await checkTextboxes(t, ['Weather'])
    await t.click(Selector('[aria-label="Expand Rainfall"]'))
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Rain$/).exists).ok('Rain legend entry')
    await t.expect(Selector('.histogram-svg-panel').find('text').withText(/^Snow$/).exists).ok('Snow legend entry')
    await downloadHistogram(t, 0)
})

// Clicking a point pins its tooltip: unlike the hover tooltip, a pinned one survives the mouse
// leaving the chart and is drawn into the downloaded image. Any number of points can be pinned at
// once, each dismissed with the little "x" in its corner, and the pins are per-plot component
// state, so navigating away clears them.
urbanstatsFixture('histogram pinned tooltip', `${target}/article.html?longname=Germany&universe=world`)

const pinnedTip = Selector('.histogram-svg-panel').find('g.plot-pinned-tip')
const dismissPinnedTip = Selector('[data-test-id=dismiss_pinned_tooltip]')

test('histogram-pinned-tooltip', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.click(Selector('.expand-toggle'))
    await t.expect(pinnedTip.exists).notOk('no tooltip is pinned until one is clicked')

    const panel = Selector('.histogram-svg-panel')
    await t.click(panel, { offsetX: 500, offsetY: 200 })
    await t.expect(pinnedTip.exists).ok('clicking the chart pins the pointed-at tooltip')
    await t.expect(pinnedTip.find('tspan').withText(/^.?Density: /).exists).ok('pinned tooltip shows the density it is pinned to')
    await t.expect(dismissPinnedTip.exists).ok('pinned tooltip has a dismiss button')

    // the pin is what distinguishes this from the hover tooltip: moving off the chart, and even
    // clicking elsewhere on the page, leaves it in place
    await t.hover('body', { offsetX: 0, offsetY: 0 })
    await t.expect(pinnedTip.exists).ok('pinned tooltip outlives the pointer leaving the chart')
    await t.click(Selector('.expand-toggle'))
    await t.click(Selector('.expand-toggle'))
    await t.expect(pinnedTip.exists).notOk('collapsing the plot discards the pin along with the plot')

    await t.click(panel, { offsetX: 500, offsetY: 200 })
    await t.expect(pinnedTip.exists).ok()
    // pins accumulate rather than replacing each other
    await t.click(panel, { offsetX: 250, offsetY: 200 })
    await t.expect(pinnedTip.count).eql(2, 'a second click pins a second tooltip')
    await screencap(t)
    // the point of all this: the tooltips are part of the plot we re-render for the download
    await downloadHistogram(t, 0)

    await t.click(dismissPinnedTip)
    await t.expect(pinnedTip.count).eql(1, 'a dismiss button unpins only its own tooltip')
    await t.click(dismissPinnedTip)
    await t.expect(pinnedTip.exists).notOk('the dismiss button unpins the tooltip')
})

// pins are per-plot component state, so several graphs on a page each keep their own set, and each
// graph carries only its own into the image it exports
test('histogram-pinned-tooltip-multiple-graphs', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkTextboxes(t, ['Other Density Metrics'])
    const count = await Selector('.expand-toggle').count
    for (let i = 0; i < count; i++) {
        await t.click(Selector('.expand-toggle').nth(i))
    }
    const panels = Selector('.histogram-svg-panel')
    await t.expect(panels.count).gte(2, 'this test needs more than one graph on the page')

    const firstPanel = panels.nth(0)
    const secondPanel = panels.nth(1)
    await t.click(firstPanel, { offsetX: 400, offsetY: 200 })
    await t.click(firstPanel, { offsetX: 650, offsetY: 200 })
    await t.click(secondPanel, { offsetX: 500, offsetY: 200 })
    await t.expect(firstPanel.find('g.plot-pinned-tip').count).eql(2, 'both pins land on the graph they were clicked on')
    await t.expect(secondPanel.find('g.plot-pinned-tip').count).eql(1, 'a pin on one graph does not show up on another')

    await screencap(t)
    // the whole-page export and each graph's own export both draw the pins they contain
    await downloadImage(t)
    await downloadHistogram(t, 0)
    await downloadHistogram(t, 1)
})

test('histogram-pinned-tooltip-cleared-by-navigation', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.click(Selector('.expand-toggle'))
    await t.click(Selector('.histogram-svg-panel'), { offsetX: 500, offsetY: 200 })
    await t.expect(pinnedTip.exists).ok()

    await t.navigateTo(`${target}/article.html?longname=France&universe=world`)
    await waitForLoading()
    await t.expect(Selector('.histogram-svg-panel').exists).ok('the expanded state itself is a setting, so it persists')
    await t.expect(pinnedTip.exists).notOk('the pin is not persistent state, and does not survive a navigation')
})

// what a tooltip has to stay clear of: the top of the frame, taken as its highest gridline, and the
// legend drawn inside it. `tipGroup` selects the mark the tooltip belongs to, which is either the
// pointer-driven tip or a pinned one -- the placement they get is the same either way.
const tooltipGeometry = ClientFunction((tipGroup: string) => {
    const panel = document.getElementsByClassName('histogram-svg-panel')[0]
    // the tooltip proper is the mark group's child; the leader back to its point is a sibling of it
    const tooltip = panel.querySelector(`${tipGroup} > g`)!.getBoundingClientRect()
    const legend = panel.querySelector('[data-test-id=plot_legend]')!.getBoundingClientRect()
    const gridlines = Array.from(panel.querySelectorAll('g[aria-label="y-grid"] line'))
    return {
        tooltipTop: tooltip.top,
        frameTop: Math.min(...gridlines.map(line => line.getBoundingClientRect().top)),
        overlapsLegend: tooltip.left < legend.right && legend.left < tooltip.right
        && tooltip.top < legend.bottom && legend.top < tooltip.bottom,
    }
})

// the leader is drawn a frame after the tooltip, so this is also what waits for the tooltip to
// have settled into its final place before it gets measured
const tooltipLeader = Selector('.histogram-svg-panel').find('g[aria-label=tip] > path')
const pinnedTipLeader = Selector('.histogram-svg-panel').find('g.plot-pinned-tip > path')

// A cumulative relative histogram is at 100% on the left, so a tooltip there is anchored at the
// very top of the frame, and on a comparison it is several lines tall. Plot would fit such a
// tooltip into the top margin, drawing it across the frame and under the settings bar (#2083); it
// belongs below its point instead -- and below the legend, which is drawn in that same corner.
urbanstatsFixture('tooltip against the top of the frame', comparisonPage(['China', 'USA', 'Japan', 'Indonesia']))

test('histogram-tooltip-top-of-frame', async (t) => {
    // the GHS-POP row, since it is the one every country has data for -- the census rows would
    // leave a single series, and a lone series draws no legend to run into
    await t.click(Selector('[aria-label="Expand PW Density (r=1km) [GHS-POP]"]'))
    await t.expect(Selector('[data-test-id=histogram_relative]').checked).ok('relative histograms are on by default, which is what puts the left of the curve at 100%')
    const histogramType = Selector('[data-test-id=histogram_type]')
    await t.click(histogramType).click(histogramType.find('option').withExactText('Line (cumulative)'))

    // the left of the curve is both the top of the frame and its left edge, so the tooltip has
    // nowhere to go but down and to the right
    await t.hover(Selector('.histogram-svg-panel'), { offsetX: 150, offsetY: 200 })
    await t.expect(tooltipLeader.exists).ok('a tooltip moved off its point is joined back to it by a leader')

    const { tooltipTop, frameTop, overlapsLegend } = await tooltipGeometry('g[aria-label=tip]')
    await t.expect(tooltipTop).gte(frameTop - 1, 'the tooltip hangs below its point rather than across the top of the frame')
    await t.expect(overlapsLegend).notOk('the tooltip is dropped past the legend rather than drawn onto it')

    // fullPage would hover the corner of the page first, which would take the tooltip away with it
    await screencap(t, { fullPage: false, selector: Selector('.histogram-svg-panel') })
})

// the same placement, for a tooltip that was pinned at that point rather than hovered -- a pinned
// one outlives the pointer, so unlike the hover case it can be captured in a full-page screenshot
// and drawn into the downloaded image
urbanstatsFixture('pinned tooltip against the top of the frame', comparisonPage(['Canada', 'USA', 'Mexico', 'Germany']))

test('histogram-pinned-tooltip-top-of-frame', async (t) => {
    await t.click(Selector('.expand-toggle'))
    await t.expect(Selector('[data-test-id=histogram_relative]').checked).ok('relative histograms are on by default, which is what puts the left of the curve at 100%')
    const histogramType = Selector('[data-test-id=histogram_type]')
    await t.click(histogramType).click(histogramType.find('option').withExactText('Line (cumulative)'))

    // the left of the curve is both the top of the frame and its left edge, so the tooltip has
    // nowhere to go but down and to the right
    await t.click(Selector('.histogram-svg-panel'), { offsetX: 150, offsetY: 200 })
    await t.expect(pinnedTip.exists).ok('clicking the left of the curve pins a tooltip')

    await t.expect(pinnedTipLeader.exists).ok('a tooltip moved off its point is joined back to it by a leader')
    const { tooltipTop, frameTop, overlapsLegend } = await tooltipGeometry('g.plot-pinned-tip')
    await t.expect(tooltipTop).gte(frameTop - 1, 'the tooltip hangs below its point rather than across the top of the frame')
    await t.expect(overlapsLegend).notOk('the tooltip is dropped past the legend rather than drawn onto it')

    await screencap(t)
    await downloadHistogram(t, 0)
})

urbanstatsFixture('comparison ordering test', `${target}/comparison.html?longnames=%5B%22USA%22%2C%22United+Kingdom%22%5D`)

test('histogram-ordering', async (t) => {
    await t.expect(Selector('.expand-toggle').count).eql(2)
    await t.click(Selector('.expand-toggle').nth(1))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-ordering')
})

urbanstatsFixture('bar histogram test', `${target}/article.html?longname=Santa+Clarita+city%2C+California%2C+USA&s=6TunChoK92PzC9tD`)

test('histogram-bar', async (t) => {
    await screencap(t)
})

urbanstatsFixture('bar histogram comparison test', `${target}/comparison.html?longnames=%5B"China"%2C"USA"%5D&s=2EoPvrZ42dy2gxh`)

test('histogram-bar-comparison', async (t) => {
    await screencap(t)
})

urbanstatsFixture('histogram axis labels not clipped', `${target}/comparison.html?longnames=%5B%22Canada%22%2C%22USA%22%2C%22Mexico%22%2C%22Germany%22%5D&s=879GMNZfJ19PW2KpGDBZj`)

test('histogram-axis-labels-not-clipped', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

urbanstatsFixture('scrolling transpose comparison', `${target}/comparison.html?longnames=%5B%22Santa+Clarita+city%2C+California%2C+USA%22%2C%22Santa+Clara+city%2C+California%2C+USA%22%2C%22Boston+city%2C+Massachusetts%2C+USA%22%2C%22San+Francisco+city%2C+California%2C+USA%22%2C%22Denver+city%2C+Colorado%2C+USA%22%5D&s=SAaYfgWFPJQ2WHM3`)

test('histogram-transpose-download', async (t) => {
    await downloadHistogram(t, 0)
})

urbanstatsFixture('transpose histograms', `${target}/comparison.html?longnames=%5B"China"%2C"USA"%2C"Japan"%2C"Indonesia"%5D&s=2EoPvrZ42d9b5wf`)

test('transpose-histograms', async (t) => {
    // Capture all kinds of transposed histograms

    await screencap(t)

    await t.click('[data-test-id=histogram_relative]')

    await screencap(t)

    const histogramTypeSelect = Selector('[data-test-id=histogram_type]')

    await t.click(histogramTypeSelect).click(histogramTypeSelect.find('option').withExactText('Line (cumulative)'))

    await screencap(t)

    await t.click('[data-test-id=histogram_relative]')

    await screencap(t)

    await t.click(histogramTypeSelect).click(histogramTypeSelect.find('option').withExactText('Bar'))

    await screencap(t)

    await t.click('[data-test-id=histogram_relative]')

    await screencap(t)
})

urbanstatsFixture('histogram add region test', comparisonPage([upperSGV, pasadena]))

test('histogram-add-region-search-works', async (t) => {
    await t.click(Selector('.expand-toggle'))

    const addButton = Selector('img[src="/add.png"]')
    await t.click(addButton)
    await screencap(t)

    const searchBox = Selector('input[placeholder="Add region..."]')
    await t.typeText(searchBox, 'Southwest San Gabriel Valley CCD')
    await waitForSelectedSearchResult(t)
    await screencap(t)

    await t.pressKey('enter')

    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([upperSGV, pasadena, swSGV]))
})

urbanstatsFixture('histogram add region test starting from article', `${target}/article.html?longname=Pasadena+CCD+%5BCCD%5D%2C+Los+Angeles+County%2C+California%2C+USA`)

test('histogram-add-region-search-works-from-article', async (t) => {
    await t.click(Selector('.expand-toggle'))

    const addButton = Selector('img[src="/add.png"]')
    await t.click(addButton)

    const searchBox = Selector('input[placeholder="Add region..."]')
    await t.typeText(searchBox, 'Southwest San Gabriel Valley CCD')

    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')

    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([pasadena, swSGV]))
})

urbanstatsFixture('histogram add region test with multiple years', `${target}/article.html?longname=Pasadena+CCD+%5BCCD%5D%2C+Los+Angeles+County%2C+California%2C+USA`)

test('histogram-add-region-multiple-years', async (t) => {
    // Enable multiple years to create subseries
    await checkTextboxes(t, ['2020', '2010'])

    await t.click(Selector('.expand-toggle'))

    const addButton = Selector('img[src="/add.png"]')
    await t.click(addButton)

    const searchBox = Selector('input[placeholder="Add region..."]')
    await t.typeText(searchBox, 'Upper San Gabriel Valley CCD')

    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')

    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([pasadena, upperSGV]))
})

urbanstatsFixture('histogram duplicate', comparisonPage([pasadena, pasadena]))

test('histogram-duplicate-articles', async (t) => {
    await checkTextboxes(t, ['2020', '2010'])
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
})

urbanstatsFixture('histogram article multiple years', `${target}/article.html?longname=Pasadena+CCD+%5BCCD%5D%2C+Los+Angeles+County%2C+California%2C+USA`)

test('histogram-article-multiple-years', async (t) => {
    await checkTextboxes(t, ['2020', '2010', '2000'])
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-article-multiple-years')
})

urbanstatsFixture('histogram comparison multiple years', comparisonPage([pasadena, upperSGV]))

test('histogram-comparison-multiple-years', async (t) => {
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    // Test with different histogram type
    const histogramTypeSelect = Selector('[data-test-id=histogram_type]')
    await t.click(histogramTypeSelect).click(histogramTypeSelect.find('option').withExactText('Bar'))
    await screencap(t)
    await checkTextboxes(t, ['2010', '2000'])
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-comparison-multiple-years')
})

urbanstatsFixture('histogram comparison with country with only one year', comparisonPage([pasadena, upperSGV, 'Canada', 'Germany']))

test('histogram-comparison-multiple-years-and-nan', async (t) => {
    await checkTextboxes(t, ['2000', '2010'])
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    await downloadOrCheckHistogram(t, 'histogram-comparison-multiple-years-and-nan')
})
