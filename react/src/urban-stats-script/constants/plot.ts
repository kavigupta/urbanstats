/*
 * What a plot is made of. A mark carries one entry per datum, already reduced to what a renderer
 * needs: colours as strings, scales as descriptors. Functions cannot be sent over the worker
 * boundary, so `genericPlot` resolves each axis's scale against the data its marks carry, and
 * nothing in a finished plot holds one.
 */

import { calculateRegression, computePearsonR2 } from '../../mapper/regression'
import { assert } from '../../utils/defensive'
import { HumanReadableName } from '../../utils/human-readable-element'
import { hre, parseHumanReadableTemplate } from '../../utils/human-readable-template'
import { markerRadius } from '../../utils/marker-size'
import { UnitType } from '../../utils/unit'
import { Context } from '../context'
import { parseNoErrorAsExpression } from '../parser'
import { createConstantExpression, NamedFunctionArgumentWithDocumentation, USSRawValue, USSType, USSValue } from '../types-values'

import { colorConstants } from './color'
import { Color, doRender } from './color-utils'
import { normalizeRelativeArea } from './map'
import { rampColors, RampT } from './ramp'
import { Scale, ScaleDescriptor } from './scale'

export interface PlotPoints {
    kind: 'points'
    x: number[]
    y: number[]
    /** What each point is called, for its tooltip; absent where the data is not of named things. */
    names: string[] | undefined
    colors: string[]
    sizes: number[]
    opacities: number[]
    label: HumanReadableName | undefined
}

export interface PlotLine {
    kind: 'line'
    x: number[]
    y: number[]
    /** One per vertex, as a line drawn in changing colours needs. */
    colors: string[]
    widths: number[]
    /** 0 draws a solid line; anything else is the length of a dash and of the gap after it. */
    dashes: number[]
    label: HumanReadableName | undefined
    /** Present on a fitted line: what it was fitted as, for a legend to write out. */
    fit?: LineFit
}

/** A least-squares fit of y against x, in the units the two are given in. */
export interface LineFit {
    slope: number
    intercept: number
    r2: number
}

export interface PlotBars {
    kind: 'bars'
    /** Categories, or positions on a numeric axis. */
    x: string[] | number[]
    y: number[]
    colors: string[]
    label: HumanReadableName | undefined
}

export interface PlotHistogram {
    kind: 'histogram'
    /** Binned here rather than in the renderer, so that a tooltip can name the bin it is over. */
    counts: number[]
    /** One more than there are counts. */
    edges: number[]
    colors: string[]
    label: HumanReadableName | undefined
}

export interface PlotColorbar {
    kind: 'colorbar'
    ramp: RampT
    scale: ScaleDescriptor
    label: HumanReadableName | undefined
}

export type PlotElement = PlotPoints | PlotLine | PlotBars | PlotHistogram | PlotColorbar

/** An axis as the user stated it. Its scale is a function, so this never leaves the worker. */
export interface PlotAxisSpec {
    scale: Scale
    unit: UnitType | undefined
    label: HumanReadableName | undefined
    min: number | undefined
    max: number | undefined
}

/** An axis with its scale resolved against the data, which is what a renderer is given. */
export interface PlotAxis {
    scale: ScaleDescriptor
    unit: UnitType | undefined
    label: HumanReadableName | undefined
}

export type Plot =
    { kind: 'plot', elements: PlotElement[], x: PlotAxis, y: PlotAxis, title: HumanReadableName | undefined } |
    { kind: 'stack', direction: 'horizontal' | 'vertical', plots: Plot[] }

const plotElementType = { type: 'opaque', name: 'plotElement' } satisfies USSType
const plotAxisType = { type: 'opaque', name: 'plotAxis' } satisfies USSType
const plotType = { type: 'opaque', name: 'plot' } satisfies USSType

type Argument = NamedFunctionArgumentWithDocumentation

const numberVector = { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } } satisfies Argument
const stringVector = { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'string' } } } } satisfies Argument
const colorVector = { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'opaque', name: 'color' } } } } satisfies Argument
const oneColor = { type: { type: 'concrete', value: { type: 'opaque', name: 'color' } } } satisfies Argument
const oneNumber = { type: { type: 'concrete', value: { type: 'number' } } } satisfies Argument
const oneScale = { type: { type: 'concrete', value: { type: 'opaque', name: 'scale' } } } satisfies Argument
const oneRamp = { type: { type: 'concrete', value: { type: 'opaque', name: 'ramp' } } } satisfies Argument

function withDefault(argument: Argument, source: string): Argument {
    return { ...argument, defaultValue: parseNoErrorAsExpression(source, '') }
}

function optional(argument: Argument): Argument {
    return { ...argument, defaultValue: createConstantExpression(null) }
}

const labelArgument = optional({ type: { type: 'concrete', value: { type: 'string' } } })

const labelSyntax = hre`A label names a mark in the legend and heads its tooltips, and supports subscript with \`_{...}\` and superscript with \`^{...}\`.`

const recycling = hre`A vector of one is spread across every point, so \`color=[colorRed]\` paints them all red; any other vector must be as long as the data.`

/** The colour a named constant stands for, so that a default here is the one the script would write. */
function namedColor(name: string): string {
    const constant = colorConstants.find(([constantName]) => constantName === name)
    assert(constant !== undefined, `${name} is not one of the colour constants`)
    return doRender((constant[1].value as { value: Color }).value)
}

/** What a mark is drawn in unless the script says otherwise. */
const defaultMarkColor = namedColor('colorBlue')

/** One value per datum: a vector of one is spread across them all, which is how a mark takes a single colour or size. */
function recycle<T>(values: T[], length: number, what: string): T[] {
    if (values.length === length) {
        return values
    }
    if (values.length === 1) {
        return Array.from({ length }, () => values[0])
    }
    throw new Error(`${what} must have one element or as many as the data (${length}), but had ${values.length}`)
}

function sameLength(x: number[], y: number[]): void {
    if (x.length !== y.length) {
        throw new Error(`x and y must have the same length: ${x.length} and ${y.length}`)
    }
}

function colorsOf(raw: USSRawValue): string[] {
    return (raw as { type: 'opaque', opaqueType: 'color', value: Color }[]).map(color => doRender(color.value))
}

function scaleOf(raw: USSRawValue): Scale {
    return (raw as { type: 'opaque', opaqueType: 'scale', value: Scale }).value
}

function rampOf(raw: USSRawValue): RampT {
    return (raw as { type: 'opaque', opaqueType: 'ramp', value: RampT }).value
}

function labelOf(raw: USSRawValue): HumanReadableName | undefined {
    const label = raw as string | null
    return label === null ? undefined : parseHumanReadableTemplate(label)
}

function numberOrUndefined(raw: USSRawValue): number | undefined {
    return raw === null ? undefined : raw as number
}

function asElement(value: PlotElement): USSRawValue {
    return { type: 'opaque', opaqueType: 'plotElement', value }
}

function elementsOf(raw: USSRawValue): PlotElement[] {
    return (raw as { type: 'opaque', opaqueType: 'plotElement', value: PlotElement }[]).map(e => e.value)
}

/**
 * A points mark with every attribute checked and spread across the data. Both `points` and the
 * scatter plot built on it come through here, so a mark is put together one way only.
 */
function pointsMark(fields: {
    x: number[]
    y: number[]
    names: string[] | null
    colors: string[]
    sizes: number[]
    opacities: number[]
    label: HumanReadableName | undefined
}): PlotPoints {
    const { x, y, names } = fields
    sameLength(x, y)
    if (names !== null && names.length !== x.length) {
        throw new Error(`name must be as long as the data (${x.length}), but had ${names.length}`)
    }
    return {
        kind: 'points',
        x,
        y,
        names: names ?? undefined,
        colors: recycle(fields.colors, x.length, 'color'),
        sizes: recycle(fields.sizes, x.length, 'size'),
        opacities: recycle(fields.opacities, x.length, 'opacity'),
        label: fields.label,
    }
}

/** The bar that reads a ramp off, which a scatter plot colouring by value adds for itself. */
function colorbarMark(ramp: RampT, scale: ScaleDescriptor, label: HumanReadableName | undefined): PlotColorbar {
    return { kind: 'colorbar', ramp, scale, label }
}

export const points: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            x: numberVector,
            y: numberVector,
            name: optional(stringVector),
            color: withDefault(colorVector, '[colorBlue]'),
            size: withDefault(numberVector, '[3]'),
            opacity: withDefault(numberVector, '[1]'),
            label: labelArgument,
        },
        returnType: { type: 'concrete', value: plotElementType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        return asElement(pointsMark({
            x: namedArgs.x as number[],
            y: namedArgs.y as number[],
            names: namedArgs.name as string[] | null,
            colors: colorsOf(namedArgs.color),
            sizes: namedArgs.size as number[],
            opacities: namedArgs.opacity as number[],
            label: labelOf(namedArgs.label),
        }))
    },
    documentation: {
        humanReadableName: 'Points',
        category: 'plot',
        isDefault: true,
        namedArgs: { x: 'X', y: 'Y', name: 'Names', color: 'Color', size: 'Size', opacity: 'Opacity', label: 'Label' },
        longDescription: hre`Draws a point for each pair of x and y values. \`name\` says what each point is, which is what its tooltip is headed with: \`name=geoName\` for a point per geography. Colour by value with \`rampApply\`, and size by value by passing a vector to \`size\`. ${recycling} ${labelSyntax}`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

export const line: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            x: numberVector,
            y: numberVector,
            color: withDefault(colorVector, '[colorBlue]'),
            width: withDefault(numberVector, '[2]'),
            dash: withDefault(numberVector, '[0]'),
            label: labelArgument,
        },
        returnType: { type: 'concrete', value: plotElementType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const x = namedArgs.x as number[]
        const y = namedArgs.y as number[]
        sameLength(x, y)
        return asElement({
            kind: 'line',
            x,
            y,
            colors: recycle(colorsOf(namedArgs.color), x.length, 'color'),
            widths: recycle(namedArgs.width as number[], x.length, 'width'),
            dashes: recycle(namedArgs.dash as number[], x.length, 'dash'),
            label: labelOf(namedArgs.label),
        })
    },
    documentation: {
        humanReadableName: 'Line',
        category: 'plot',
        namedArgs: { x: 'X', y: 'Y', color: 'Color', width: 'Width', dash: 'Dash Length', label: 'Label' },
        longDescription: hre`Joins the points given, in the order given, with a line. A \`dash\` of 0 draws it solid; anything else is the length of a dash and of the gap after it. ${labelSyntax}`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

export const bars: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            category: optional(stringVector),
            x: optional(numberVector),
            y: numberVector,
            color: withDefault(colorVector, '[colorBlue]'),
            label: labelArgument,
        },
        returnType: { type: 'concrete', value: plotElementType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const category = namedArgs.category as string[] | null
        const numeric = namedArgs.x as number[] | null
        const y = namedArgs.y as number[]
        if ((category === null) === (numeric === null)) {
            throw new Error('bars needs either category or x, not both and not neither')
        }
        const x = category ?? numeric!
        if (x.length !== y.length) {
            throw new Error(`bars needs as many y values as bars: ${y.length} against ${x.length}`)
        }
        return asElement({
            kind: 'bars',
            x,
            y,
            colors: recycle(colorsOf(namedArgs.color), y.length, 'color'),
            label: labelOf(namedArgs.label),
        })
    },
    documentation: {
        humanReadableName: 'Bars',
        category: 'plot',
        namedArgs: { category: 'Categories', x: 'X', y: 'Y', color: 'Color', label: 'Label' },
        longDescription: hre`Draws a bar per value. Name the bars with \`category\` for a bar chart, or place them on a numeric axis with \`x\`; one or the other, not both. ${recycling} ${labelSyntax}`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

/** Equal-width bins over the data's range; an empty vector, or one value, has nothing to bin. */
function binValues(values: number[], bins: number): { counts: number[], edges: number[] } {
    const present = values.filter(value => !isNaN(value))
    if (present.length === 0) {
        return { counts: [], edges: [] }
    }
    const min = Math.min(...present)
    const max = Math.max(...present)
    const width = (max - min) / bins || 1
    const counts = Array.from({ length: bins }, () => 0)
    for (const value of present) {
        // the topmost value belongs to the last bin rather than opening one past the end
        counts[Math.min(bins - 1, Math.floor((value - min) / width))]++
    }
    return { counts, edges: Array.from({ length: bins + 1 }, (_, i) => min + i * width) }
}

export const histogram: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            values: numberVector,
            bins: withDefault(oneNumber, '20'),
            color: withDefault(colorVector, '[colorBlue]'),
            label: labelArgument,
        },
        returnType: { type: 'concrete', value: plotElementType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const bins = Math.trunc(namedArgs.bins as number)
        if (bins < 1) {
            throw new Error(`histogram needs at least one bin, but was given ${bins}`)
        }
        const { counts, edges } = binValues(namedArgs.values as number[], bins)
        return asElement({
            kind: 'histogram',
            counts,
            edges,
            colors: recycle(colorsOf(namedArgs.color), counts.length, 'color'),
            label: labelOf(namedArgs.label),
        })
    },
    documentation: {
        humanReadableName: 'Histogram',
        category: 'plot',
        namedArgs: { values: 'Values', bins: 'Bins', color: 'Color', label: 'Label' },
        longDescription: hre`Counts the values into \`bins\` equal-width bins across their range, and draws a bar per bin. ${labelSyntax}`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

export const regressionLine: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            x: numberVector,
            y: numberVector,
            color: withDefault(colorVector, '[colorBlack]'),
            width: withDefault(numberVector, '[2]'),
            dash: withDefault(numberVector, '[0]'),
            label: labelArgument,
        },
        returnType: { type: 'concrete', value: plotElementType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const x = namedArgs.x as number[]
        const y = namedArgs.y as number[]
        sameLength(x, y)
        return asElement(fittedLine(x, y, {
            colors: colorsOf(namedArgs.color),
            widths: namedArgs.width as number[],
            dashes: namedArgs.dash as number[],
            label: labelOf(namedArgs.label),
        }))
    },
    documentation: {
        humanReadableName: 'Regression Line',
        category: 'plot',
        namedArgs: { x: 'X', y: 'Y', color: 'Color', width: 'Width', dash: 'Dash Length', label: 'Label' },
        longDescription: hre`Fits y against x by least squares and draws the line, formatted as any other line is. Unless it is given a \`label\`, the plot's legend writes out the fit: what a step along x is worth in y, where the line crosses, and how much of the variation it accounts for.`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

export const colorbar: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            data: numberVector,
            ramp: withDefault(oneRamp, 'rampUridis'),
            scale: withDefault(oneScale, 'linearScale()'),
            label: labelArgument,
        },
        returnType: { type: 'concrete', value: plotElementType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const data = namedArgs.data as number[]
        return asElement(colorbarMark(rampOf(namedArgs.ramp), scaleOf(namedArgs.scale)(data), labelOf(namedArgs.label)))
    },
    documentation: {
        humanReadableName: 'Colorbar',
        category: 'plot',
        namedArgs: { data: 'Data', ramp: 'Ramp', scale: 'Scale', label: 'Label' },
        longDescription: hre`A bar reading off what the colours of a \`rampApply\` mean. It is given the same data, ramp and scale as the \`rampApply\` it explains, since a mark is handed finished colours and cannot say where they came from.`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

export const axis: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            scale: withDefault(oneScale, 'linearScale()'),
            unit: optional({ type: { type: 'concrete', value: { type: 'opaque', name: 'Unit' } } }),
            label: labelArgument,
            min: optional(oneNumber),
            max: optional(oneNumber),
        },
        returnType: { type: 'concrete', value: plotAxisType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const unit = namedArgs.unit as { type: 'opaque', opaqueType: 'unit', value: { unit: UnitType } } | null
        return {
            type: 'opaque',
            opaqueType: 'plotAxis',
            value: {
                scale: scaleOf(namedArgs.scale),
                unit: unit === null ? undefined : unit.value.unit,
                label: labelOf(namedArgs.label),
                min: numberOrUndefined(namedArgs.min),
                max: numberOrUndefined(namedArgs.max),
            } satisfies PlotAxisSpec,
        }
    },
    documentation: {
        humanReadableName: 'Axis',
        category: 'plot',
        isDefault: true,
        namedArgs: { scale: 'Scale', unit: 'Unit', label: 'Label', min: 'Min', max: 'Max' },
        longDescription: hre`How one side of a plot is laid out, on the scale given — \`logScale()\` for a logarithmic axis. Which side it is is decided by the plot it is passed to, as \`xAxis\` or \`yAxis\`. Without a \`label\` the axis is named after the data plotted against it, and without a \`unit\` it is read in whatever unit that data is in.`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

/** What an axis's ticks have to span: every value any mark places against it. */
function dataAlong(which: 'x' | 'y', elements: PlotElement[]): number[] {
    return elements.flatMap((element) => {
        switch (element.kind) {
            case 'points':
            case 'line':
                return which === 'x' ? element.x : element.y
            case 'bars':
                if (which === 'y') {
                    // a bar is read against zero, so the axis has to reach it however high the bars are
                    return [0, ...element.y]
                }
                return typeof element.x[0] === 'number' ? element.x as number[] : []
            case 'histogram':
                return which === 'x' ? element.edges : [0, ...element.counts]
            case 'colorbar':
                return []
        }
    })
}

function resolveAxis(spec: PlotAxisSpec, which: 'x' | 'y', elements: PlotElement[]): PlotAxis {
    const data = dataAlong(which, elements)
    return {
        scale: spec.scale(data.length === 0 ? [0, 1] : data, spec.min, spec.max),
        unit: spec.unit,
        label: spec.label,
    }
}

function axisOf(raw: USSRawValue): PlotAxisSpec {
    return (raw as { type: 'opaque', opaqueType: 'plotAxis', value: PlotAxisSpec }).value
}

function asPlot(value: Plot): USSRawValue {
    return { type: 'opaque', opaqueType: 'plot', value }
}

export const genericPlot: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            elements: { type: { type: 'concrete', value: { type: 'vector', elementType: plotElementType } } },
            xAxis: withDefault({ type: { type: 'concrete', value: plotAxisType } }, 'axis()'),
            yAxis: withDefault({ type: { type: 'concrete', value: plotAxisType } }, 'axis()'),
            title: labelArgument,
        },
        returnType: { type: 'concrete', value: plotType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const elements = elementsOf(namedArgs.elements)
        if (elements.length === 0) {
            throw new Error('a plot needs at least one element to draw')
        }
        return asPlot({
            kind: 'plot',
            elements,
            x: resolveAxis(axisOf(namedArgs.xAxis), 'x', elements),
            y: resolveAxis(axisOf(namedArgs.yAxis), 'y', elements),
            title: labelOf(namedArgs.title),
        })
    },
    documentation: {
        humanReadableName: 'Plot',
        category: 'plot',
        namedArgs: { elements: 'Elements', xAxis: 'X Axis', yAxis: 'Y Axis', title: 'Title' },
        longDescription: hre`Draws the elements given — points, lines, bars, histograms, a colorbar — on one pair of axes. Several elements on one plot share those axes, so a line drawn over points is read against the same scales. An \`axis\` says how a side is laid out; passing it as \`xAxis\` or \`yAxis\` is what makes it that side. ${labelSyntax}`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}

function stacker(direction: 'horizontal' | 'vertical', name: string, description: HumanReadableName): USSValue {
    return {
        type: {
            type: 'function',
            posArgs: [],
            namedArgs: {
                plots: { type: { type: 'concrete', value: { type: 'vector', elementType: plotType } } },
            },
            returnType: { type: 'concrete', value: plotType },
        },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            const plots = (namedArgs.plots as { type: 'opaque', opaqueType: 'plot', value: Plot }[]).map(p => p.value)
            if (plots.length === 0) {
                throw new Error(`${name} needs at least one plot`)
            }
            return asPlot({ kind: 'stack', direction, plots })
        },
        documentation: {
            humanReadableName: name,
            category: 'plot',
            namedArgs: { plots: 'Plots' },
            longDescription: description,
            selectorRendering: { kind: 'subtitleLongDescription' },
        },
    }
}

export const sideBySide = stacker('horizontal', 'Side by Side', hre`Lays the plots given out in a row, each with its own axes. Since it is a plot itself, a row of stacks (or a stack of rows) builds a grid.`)
export const stacked = stacker('vertical', 'Stacked', hre`Lays the plots given out in a column, each with its own axes. Since it is a plot itself, a stack of rows (or a row of stacks) builds a grid.`)

/**
 * How many points a fitted line is drawn with. It is straight in the data's own terms, but an axis
 * need not be, so it is sampled densely enough to bend with a log one rather than cut across it.
 */
const fittedLinePoints = 128

/**
 * The least-squares fit of y against x, sampled across the range of x. The fit itself is of the
 * data as given, whatever the axes do with it afterwards.
 */
function fittedLine(
    x: number[],
    y: number[],
    format: { colors: string[], widths: number[], dashes: number[], label: HumanReadableName | undefined },
): PlotLine {
    const { residuals, weights, intercept } = calculateRegression(y, [x], undefined, false)
    const fit: LineFit = { slope: weights[0], intercept, r2: computePearsonR2(y, residuals, undefined) }
    const present = x.filter(value => !isNaN(value))
    const [from, to] = present.length === 0 ? [0, 1] : [Math.min(...present), Math.max(...present)]
    const step = (to - from) / (fittedLinePoints - 1)
    const sampled = Array.from({ length: fittedLinePoints }, (_, i) => from + i * step)
    return {
        kind: 'line',
        x: sampled,
        y: sampled.map(value => fit.slope * value + fit.intercept),
        colors: recycle(format.colors, sampled.length, 'color'),
        widths: recycle(format.widths, sampled.length, 'width'),
        dashes: recycle(format.dashes, sampled.length, 'dash'),
        label: format.label,
        fit,
    }
}

export const scatterPlot: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            x: numberVector,
            y: numberVector,
            name: withDefault(stringVector, 'geoName'),
            color: optional(oneColor),
            colorValues: optional(numberVector),
            ramp: withDefault(oneRamp, 'rampUridis'),
            scale: withDefault(oneScale, 'linearScale()'),
            size: optional(numberVector),
            maxSize: withDefault(oneNumber, '6'),
            regressionLine: withDefault({ type: { type: 'concrete', value: { type: 'boolean' } } }, 'false'),
            regressionColor: withDefault(colorVector, '[colorBlack]'),
            regressionWidth: withDefault(numberVector, '[2]'),
            regressionDash: withDefault(numberVector, '[0]'),
            xAxis: withDefault({ type: { type: 'concrete', value: plotAxisType } }, 'axis()'),
            yAxis: withDefault({ type: { type: 'concrete', value: plotAxisType } }, 'axis()'),
            title: labelArgument,
        },
        returnType: { type: 'concrete', value: plotType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
        const x = namedArgs.x as number[]
        const y = namedArgs.y as number[]
        sameLength(x, y)
        const flat = namedArgs.color as { type: 'opaque', opaqueType: 'color', value: Color } | null
        const colorValues = namedArgs.colorValues as number[] | null
        if (flat !== null && colorValues !== null) {
            throw new Error('pass either color or colorValues, not both: one paints every point the same, the other colours them by value')
        }
        const ramp = rampOf(namedArgs.ramp)
        const scale = scaleOf(namedArgs.scale)
        const names = namedArgs.name as string[]
        if (colorValues !== null && colorValues.length !== x.length) {
            throw new Error(`colorValues must be as long as the data (${x.length}), but had ${colorValues.length}`)
        }
        const colorScale = colorValues === null ? undefined : scale(colorValues)
        const marks: PlotElement[] = [pointsMark({
            x,
            y,
            names,
            colors: colorValues === null
                ? [flat === null ? defaultMarkColor : doRender(flat.value)]
                : rampColors(ramp, colorScale!, colorValues),
            // sized the way a point map sizes its markers: by area, against the largest
            sizes: normalizeRelativeArea(namedArgs.size as number[] | null, x.length)
                .map(area => markerRadius(area, namedArgs.maxSize as number)),
            opacities: [1],
            label: undefined,
        })]
        if (namedArgs.regressionLine as boolean) {
            marks.push(fittedLine(x, y, {
                colors: colorsOf(namedArgs.regressionColor),
                widths: namedArgs.regressionWidth as number[],
                dashes: namedArgs.regressionDash as number[],
                label: undefined,
            }))
        }
        if (colorScale !== undefined) {
            marks.push(colorbarMark(ramp, colorScale, undefined))
        }
        return asPlot({
            kind: 'plot',
            elements: marks,
            x: resolveAxis(axisOf(namedArgs.xAxis), 'x', marks),
            y: resolveAxis(axisOf(namedArgs.yAxis), 'y', marks),
            title: labelOf(namedArgs.title),
        })
    },
    documentation: {
        humanReadableName: 'Scatter Plot',
        category: 'plot',
        isDefault: true,
        namedArgs: {
            x: 'X',
            y: 'Y',
            name: 'Names',
            color: 'Color',
            colorValues: 'Color by Value',
            ramp: 'Ramp',
            scale: 'Color Scale',
            size: 'Relative Size',
            maxSize: 'Max Size',
            regressionLine: 'Regression Line',
            regressionColor: 'Regression Color',
            regressionWidth: 'Regression Width',
            regressionDash: 'Regression Dash Length',
            xAxis: 'X Axis',
            yAxis: 'Y Axis',
            title: 'Title',
        },
        longDescription: hre`A point per pair of x and y values, on axes named after the data. Either paint them all one \`color\`, or give \`colorValues\` to colour them by a third statistic through \`ramp\` — passing both is an error, since only one of them can be what a point is coloured by. Colouring by value brings a colorbar with it. \`size\` sizes the points by value: the largest is \`maxSize\` across and the rest cover area in proportion, so a point twice another's value is twice its area. \`regressionLine=true\` fits a line through the points, formatted by the \`regression\` arguments, and the plot's legend writes the fit out. What this assembles is \`points\`, \`rampApply\`, \`colorbar\` and \`genericPlot\`, for when the plot is an ordinary scatter.`,
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
}
