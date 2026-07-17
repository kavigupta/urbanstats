import { Selector } from 'testcafe'

import { target, checkIndividualStat, checkTextboxes, comparisonPage, downloadHistogram, downloadImage, downloadOrCheckString, screencap, urbanstatsFixture, waitForLoading, waitForSelectedSearchResult, getLocationWithoutSettings } from './test_utils'

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
    await checkTextboxes(t, ['Use Imperial Units'])
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
