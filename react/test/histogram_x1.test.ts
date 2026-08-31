import { ClientFunction, Selector } from 'testcafe'

import { target, checkTextboxes, comparisonPage, downloadHistogram, downloadImage, downloadOrCheckString, screencap, urbanstatsFixture, waitForLoading, waitForSelectedSearchResult, getLocationWithoutSettings } from './test_utils'

const upperSGV = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
const pasadena = 'Pasadena CCD [CCD], Los Angeles County, California, USA'
const swSGV = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'

async function downloadOrCheckHistogram(t: TestController, name: string, nth = 0): Promise<void> {
    const output = await t.eval(() => {
        return document.getElementsByClassName('histogram-svg-panel')[nth].innerHTML
    }, { dependencies: { nth } }) as string
    await downloadOrCheckString(t, output, name, 'xml')
}

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

// TestCafe drives a mouse, so a finger has to be dispatched by hand. Both ends of the gesture are
// sent from the same client-side call, so that a tap here is as quick as a real one.
const touchPlot = ClientFunction((offsetX: number, offsetY: number, dx: number, dy: number, hold: number) => {
    const panel = document.getElementsByClassName('histogram-svg-panel')[0]
    const rect = panel.getBoundingClientRect()
    const send = (type: string, x: number, y: number): void => {
        panel.dispatchEvent(new PointerEvent(type, {
            pointerType: 'touch',
            pointerId: 2,
            isPrimary: true,
            bubbles: true,
            clientX: rect.left + x,
            clientY: rect.top + y,
        }))
    }
    send('pointerdown', offsetX, offsetY)
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            send('pointerup', offsetX + dx, offsetY + dy)
            resolve()
        }, hold)
    })
})

// A touch that lands on the chart is usually the start of a scroll down the page, so a touch pins
// only once it lifts, and only if it was a tap.
test('histogram-pinned-tooltip-touch', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.click(Selector('.expand-toggle'))
    // stands in for the pointerenter that precedes a real touch, which is what tells the plot which
    // point is being touched
    await t.hover(Selector('.histogram-svg-panel'), { offsetX: 500, offsetY: 200 })

    await touchPlot(500, 200, 0, -40, 0)
    await t.expect(pinnedTip.exists).notOk('a touch that drags off, as a scroll does, pins nothing')
    await touchPlot(500, 200, 0, 0, 700)
    await t.expect(pinnedTip.exists).notOk('a touch held down pins nothing')
    await touchPlot(500, 200, 0, 0, 0)
    await t.expect(pinnedTip.exists).ok('a tap pins the touched tooltip')

    await t.expect(Selector('.histogram-svg-panel').getStyleProperty('touch-action')).eql(
        'pan-y', 'a drag across the plot moves the tooltip rather than scrolling the page')
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

test('histogram-bar-comparison-search', async (t) => {
    await t.typeText(Selector('#searchbox').nth(1), 'Cal')
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

// The years used to go unnamed in the tooltip, which just repeated the region name once per year.
test('histogram-article-multiple-years-tooltip', async (t) => {
    await t.resizeWindow(1400, 800)
    await checkTextboxes(t, ['2010', '2000'])
    await t.click(Selector('.expand-toggle'))
    await t.hover(Selector('.histogram-svg-panel'), { offsetX: 500, offsetY: 200 })
    const tip = Selector('g[aria-label="tip"] tspan')
    await t.expect(tip.withText(/^.?2020 \/ 2010 \/ 2000$/).exists).ok('the tooltip should name the years its stacked values are in')
    await t.expect(tip.withText(/^.?Pasadena CCD: [\d.]+% \/ [\d.]+% \/ [\d.]+%$/).exists).ok('one line per region, one value per year')

    // fullPage would hover the corner of the page first, which would take the tooltip away with it
    await screencap(t, { fullPage: false, selector: Selector('.histogram-svg-panel') })
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
