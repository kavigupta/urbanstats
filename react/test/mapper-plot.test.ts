import { Selector } from 'testcafe'

import { getCodeFromMainField, getErrors, getInput, replaceInput, toggleCustomScript } from './mapper-utils'
import { mapper, screencap } from './test_utils'

const cMap = 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)'

mapper(() => test)('a scatter plot of two statistics', {
    code: 'scatterPlot(x=density_pw_1km, y=population, colorValues=high_temp, size=population, regressionLine=true)',
    geo: 'Subnational Region',
    universe: 'USA',
}, async (t) => {
    await t.expect(Selector('[data-test-id="plot-panel"]').count).eql(1)
    await t.expect(getErrors()).eql([])
    // the axes are named after the data drawn against them, and the colourbar after what it reads off
    await t.expect(Selector('[data-test-id="plot-panel"]').innerText).contains('PW Density (r=1km)')
    await t.expect(Selector('[data-test-id="plot-panel"]').innerText).contains('Population')
    await t.expect(Selector('[data-test-id="plot-panel"]').innerText).contains('Mean high temp')
    await screencap(t)
})

mapper(() => test)('a plot built out of the primitives', {
    code: `genericPlot(
        elements=[
            points(x=density_pw_1km, y=population, name=geoName, color=rampApply(data=population), size=[4]),
            line(x=[0, 5000], y=[0, 200000], color=[colorRed], dash=[6]),
            colorbar(data=population)
        ],
        title="Built by hand"
    )`,
    geo: 'Subnational Region',
    universe: 'USA',
}, async (t) => {
    await t.expect(getErrors()).eql([])
    await screencap(t)
})

mapper(() => test)('bars, a histogram, and plots laid out together', {
    code: `sideBySide(plots=[
        genericPlot(elements=[histogram(values=density_pw_1km, bins=12)], title="Density"),
        stacked(plots=[
            genericPlot(elements=[bars(category=["a", "b", "c"], y=[3, 1, 2], color=[colorRed, colorGreen, colorBlue])], title="Bars"),
            genericPlot(elements=[points(x=population, y=area)], xAxis=axis(scale=logScale()), yAxis=axis(scale=logScale()), title="Log-log")
        ])
    ])`,
    geo: 'Subnational Region',
    universe: 'USA',
}, async (t) => {
    // one panel per genericPlot, in the order the stacks lay them out
    await t.expect(Selector('[data-test-id="plot-panel"]').count).eql(3)
    await t.expect(getErrors()).eql([])
    await screencap(t)
})

mapper(() => test)('a fitted line says what it fitted, in the units of the axes', {
    code: `genericPlot(elements=[
        points(x=density_pw_1km, y=population),
        regressionLine(x=density_pw_1km, y=population, color=[colorPurple], dash=[6])
    ])`,
    geo: 'Subnational Region',
    universe: 'USA',
}, async (t) => {
    await t.expect(getErrors()).eql([])
    const legend = Selector('[data-test-id="plot-legend"]')
    await t.expect(legend.count).eql(1)
    // the slope is a population over a density, which is an area
    await t.expect(legend.innerText).contains('Population = 1\u202f775km2 × PW Density (r=1km)')
    await t.expect(legend.innerText).contains('R² = 0.12')
    await screencap(t)
})

mapper(() => test)('a plot has no geography to export', {
    code: 'scatterPlot(x=density_pw_1km, y=population)',
}, async (t) => {
    await t.expect(getErrors()).eql([])
    // the button is there for maps, and a plot simply has nothing to put in a GeoJSON
    await t.expect(Selector('button').withExactText('Export as GeoJSON').hasAttribute('disabled')).ok()
    await t.expect(Selector('button').withExactText('Export as PNG').hasAttribute('disabled')).notOk()
})

mapper(() => test)('switching a map to a plot in the editor', { code: cMap }, async (t) => {
    await toggleCustomScript(t)
    await t.expect(getInput('Choropleth Map').exists).ok()

    await replaceInput(t, 'Choropleth Map', 'Scatter Plot')
    await t.expect(getErrors()).eql([])
    await t.expect(Selector('[data-test-id="plot-panel"]').count).eql(1)
    // the statistic the map was drawing is what the scatter starts from
    await t.expect(getInput('PW Density (r=1km)').exists).ok()

    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('scatterPlot(')
})

mapper(() => test)('a mark whose attributes do not line up says so', {
    code: 'genericPlot(elements=[points(x=[1, 2, 3], y=[4, 5, 6], color=[colorRed, colorBlue])])',
}, async (t) => {
    await t.expect(getErrors()).eql(['color must have one element or as many as the data (3), but had 2 at 2:15-75'])
})

mapper(() => test)('a scatter plot is coloured one way or the other', {
    code: 'scatterPlot(x=density_pw_1km, y=population, color=colorRed, colorValues=population)',
}, async (t) => {
    await t.expect(getErrors()).eql([
        'pass either color or colorValues, not both: one paints every point the same, the other colours them by value at 1:1 - 6:12',
    ])
})
