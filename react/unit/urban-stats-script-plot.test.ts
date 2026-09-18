import assert from 'assert/strict'
import { test } from 'node:test'

import { Plot, PlotAxisSpec, PlotColorbar, PlotElement, PlotHistogram, PlotLine, PlotPoints } from '../src/urban-stats-script/constants/plot'
import { evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { USSValue } from '../src/urban-stats-script/types-values'

import { emptyContext, parseExpr } from './urban-stats-script-utils'

function run(code: string): USSValue {
    return evaluate(parseExpr(code), emptyContext())
}

function element(code: string): PlotElement {
    const result = run(code)
    assert.deepStrictEqual(result.type, { type: 'opaque', name: 'plotElement' })
    return (result.value as { type: 'opaque', value: PlotElement }).value
}

function plot(code: string): Plot {
    const result = run(code)
    assert.deepStrictEqual(result.type, { type: 'opaque', name: 'plot' })
    return (result.value as { type: 'opaque', value: Plot }).value
}

function single(code: string): Plot & { kind: 'plot' } {
    const result = plot(code)
    assert.strictEqual(result.kind, 'plot')
    return result
}

function errorFrom(code: string): string {
    try {
        run(code)
    }
    catch (e) {
        assert.ok(e instanceof InterpretationError, `expected an interpretation error, got ${String(e)}`)
        return e.message
    }
    throw new Error(`${code} was expected to fail`)
}

void test('a mark takes one value per point', () => {
    const points = element('points(x=[1, 2, 3], y=[4, 5, 6])') as PlotPoints
    assert.strictEqual(points.kind, 'points')
    assert.deepStrictEqual(points.x, [1, 2, 3])
    assert.deepStrictEqual(points.names, undefined)
    // the one colour and size given are spread across the points
    // eslint-disable-next-line no-restricted-syntax -- the colour a mark is expected to come out with
    assert.deepStrictEqual(points.colors, ['#5a7dc3', '#5a7dc3', '#5a7dc3'])
    assert.deepStrictEqual(points.sizes, [3, 3, 3])
})

void test('a colour per point is kept as given', () => {
    const points = element('points(x=[1, 2], y=[3, 4], color=[colorRed, colorBlue])') as PlotPoints
    assert.strictEqual(new Set(points.colors).size, 2)
})

void test('a vector that is neither one nor as long as the data is an error', () => {
    assert.match(
        errorFrom('points(x=[1, 2, 3], y=[4, 5, 6], color=[colorRed, colorBlue])'),
        /color must have one element or as many as the data \(3\), but had 2/,
    )
    assert.match(errorFrom('points(x=[1, 2, 3], y=[4, 5])'), /x and y must have the same length: 3 and 2/)
    assert.match(errorFrom('points(x=[1, 2], y=[3, 4], name=["a"])'), /name must be as long as the data \(2\), but had 1/)
})

void test('rampApply colours data the way a map does', () => {
    const points = element('points(x=[1, 2, 3], y=[1, 2, 3], color=rampApply(data=[1, 2, 3], ramp=rampBone))') as PlotPoints
    assert.strictEqual(points.colors.length, 3)
    assert.strictEqual(new Set(points.colors).size, 3)
    // the ends of the data sit at the ends of the ramp
    // eslint-disable-next-line no-restricted-syntax -- the colour a mark is expected to come out with
    assert.strictEqual(points.colors[0], '#000000')
    // eslint-disable-next-line no-restricted-syntax -- the colour a mark is expected to come out with
    assert.strictEqual(points.colors[2], '#ffffff')
})

void test('a histogram counts into equal bins', () => {
    const histogram = element('histogram(values=[0, 1, 2, 3, 4], bins=2)') as PlotHistogram
    assert.deepStrictEqual(histogram.counts, [2, 3])
    assert.deepStrictEqual(histogram.edges, [0, 2, 4])
    // the topmost value belongs to the last bin rather than opening one past the end
    assert.deepStrictEqual((element('histogram(values=[0, 10], bins=5)') as PlotHistogram).counts, [1, 0, 0, 0, 1])
    assert.match(errorFrom('histogram(values=[1, 2], bins=0)'), /at least one bin/)
})

void test('bars are placed by category or by position, not both', () => {
    assert.match(errorFrom('bars(y=[1, 2])'), /either category or x, not both and not neither/)
    assert.match(errorFrom('bars(category=["a"], x=[1], y=[1])'), /either category or x, not both and not neither/)
    assert.deepStrictEqual((element('bars(category=["a", "b"], y=[1, 2])') as { x: string[] }).x, ['a', 'b'])
})

void test('an axis says how a side is laid out, not which side it is', () => {
    const spec = (run('axis(min=0, max=10)').value as { type: 'opaque', value: PlotAxisSpec }).value
    assert.deepStrictEqual([spec.min, spec.max], [0, 10])
})

void test('a plot resolves each axis against the data drawn on it', () => {
    const result = single('genericPlot(elements=[points(x=[1, 2, 3], y=[10, 20, 30])])')
    assert.deepStrictEqual(result.x.scale, { kind: 'linear', min: 1, max: 3, center: undefined })
    assert.deepStrictEqual(result.y.scale, { kind: 'linear', min: 10, max: 30, center: undefined })
})

void test('which side an axis is is the plot it is passed to', () => {
    const result = single('genericPlot(elements=[points(x=[1, 100], y=[1, 2])], xAxis=axis(scale=logScale()))')
    assert.strictEqual(result.x.scale.kind, 'log')
    assert.strictEqual(result.y.scale.kind, 'linear')
})

void test('bars are read against zero, so the axis reaches it', () => {
    const result = single('genericPlot(elements=[bars(category=["a", "b"], y=[5, 9])])')
    assert.deepStrictEqual(result.y.scale, { kind: 'linear', min: 0, max: 9, center: undefined })
})

void test('a plot needs something to draw', () => {
    assert.match(errorFrom('genericPlot(elements=[])'), /at least one element/)
})

void test('a scatter plot assembles the primitives', () => {
    const result = single('scatterPlot(x=[1, 2, 3], y=[2, 4, 6], name=["a", "b", "c"])')
    assert.deepStrictEqual(result.elements.map(e => e.kind), ['points'])
    assert.deepStrictEqual((result.elements[0] as PlotPoints).names, ['a', 'b', 'c'])
})

void test('a scatter plot takes one way of colouring or the other', () => {
    assert.match(
        errorFrom('scatterPlot(x=[1, 2], y=[1, 2], name=["a", "b"], color=colorRed, colorValues=[1, 2])'),
        /pass either color or colorValues, not both/,
    )
    const flat = single('scatterPlot(x=[1, 2], y=[1, 2], name=["a", "b"], color=colorRed)')
    // the site's red, not a pure one
    // eslint-disable-next-line no-restricted-syntax -- the colour a mark is expected to come out with
    assert.deepStrictEqual(new Set((flat.elements[0] as PlotPoints).colors), new Set(['#f96d6d']))
    // colouring by value brings the bar that reads the colours off with it
    const ramped = single('scatterPlot(x=[1, 2], y=[1, 2], name=["a", "b"], colorValues=[1, 2])')
    assert.deepStrictEqual(ramped.elements.map(e => e.kind), ['points', 'colorbar'])
    assert.deepStrictEqual((ramped.elements[1] as PlotColorbar).scale, { kind: 'linear', min: 1, max: 2, center: undefined })
    // a scatter with no colour of its own is drawn in the same blue every other mark defaults to
    const plain = single('scatterPlot(x=[1, 2], y=[1, 2], name=["a", "b"])')
    // eslint-disable-next-line no-restricted-syntax -- the colour a mark is expected to come out with
    assert.deepStrictEqual(new Set((plain.elements[0] as PlotPoints).colors), new Set(['#5a7dc3']))
})

void test('a regression line is fitted through the points', () => {
    const result = single('scatterPlot(x=[1, 2, 3], y=[2, 4, 6], name=["a", "b", "c"], regressionLine=true)')
    assert.deepStrictEqual(result.elements.map(e => e.kind), ['points', 'line'])
    const line = result.elements[1] as PlotLine
    // drawn as a line rather than as its ends, so an axis that bends bends it too
    assert.strictEqual(line.x.length, 128)
    assert.deepStrictEqual([line.x[0], line.x[line.x.length - 1]], [1, 3])
    assert.deepStrictEqual([line.y[0], line.y[line.y.length - 1]].map(v => Math.round(v * 1e6) / 1e6), [2, 6])
    // every point of it lies on the fit, which is what makes it a line and not a chord
    assert.ok(line.y.every((value, i) => Math.abs(value - 2 * line.x[i]) < 1e-9))
})

void test('a fitted line says what it was fitted as', () => {
    const line = element('regressionLine(x=[1, 2, 3], y=[3, 5, 7])') as PlotLine
    assert.ok(line.fit !== undefined)
    assert.deepStrictEqual(
        [line.fit.slope, line.fit.intercept, line.fit.r2].map(v => Math.round(v * 1e6) / 1e6),
        [2, 1, 1],
    )
})

void test('a fitted line is formatted like any other', () => {
    const line = element('regressionLine(x=[1, 2], y=[1, 2], color=[colorRed], width=[4], dash=[3], label="Trend")') as PlotLine
    assert.strictEqual(line.widths[0], 4)
    assert.strictEqual(line.dashes[0], 3)
    assert.deepStrictEqual(line.label, [{ type: 'atom', value: 'Trend' }])
    // black is what a fit is drawn in when nothing says otherwise
    const plain = element('regressionLine(x=[1, 2], y=[1, 2])') as PlotLine
    // eslint-disable-next-line no-restricted-syntax -- the colour a mark is expected to come out with
    assert.strictEqual(plain.colors[0], '#000000')
})

void test('every attribute a mark draws with takes a value per datum', () => {
    const points = element('points(x=[1, 2], y=[3, 4], size=[5, 9], opacity=[0.5, 1])') as PlotPoints
    assert.deepStrictEqual(points.sizes, [5, 9])
    assert.deepStrictEqual(points.opacities, [0.5, 1])
    const line = element('line(x=[1, 2, 3], y=[1, 2, 3], width=[4], dash=[2])') as PlotLine
    // one value spreads along the line, which is what a line drawn in one colour and width is
    assert.deepStrictEqual(line.widths, [4, 4, 4])
    assert.deepStrictEqual(line.dashes, [2, 2, 2])
    assert.strictEqual(line.colors.length, 3)
    const histogram = element('histogram(values=[1, 2, 3, 4], bins=2, color=[colorRed, colorBlue])') as PlotHistogram
    assert.strictEqual(new Set(histogram.colors).size, 2)
})

void test('a scatter plot sizes its points by area, against the largest', () => {
    const result = single('scatterPlot(x=[1, 2, 3], y=[1, 2, 3], name=["a", "b", "c"], size=[1, 4, 0], maxSize=10)')
    // a point of four times the value is twice across, and one of nothing does not draw
    assert.deepStrictEqual((result.elements[0] as PlotPoints).sizes, [5, 10, 0])
})

void test('a scatter plot with no sizes draws them all the same', () => {
    const result = single('scatterPlot(x=[1, 2], y=[1, 2], name=["a", "b"], maxSize=4)')
    assert.deepStrictEqual((result.elements[0] as PlotPoints).sizes, [4, 4])
})

void test('plots stack in either direction, and stacks nest', () => {
    const scatter = 'scatterPlot(x=[1, 2], y=[1, 2], name=["a", "b"])'
    const result = plot(`stacked(plots=[sideBySide(plots=[${scatter}, ${scatter}]), ${scatter}])`)
    assert.strictEqual(result.kind, 'stack')
    assert.strictEqual(result.direction, 'vertical')
    assert.deepStrictEqual(result.plots.map(p => p.kind), ['stack', 'plot'])
    assert.match(errorFrom('stacked(plots=[])'), /at least one plot/)
})
