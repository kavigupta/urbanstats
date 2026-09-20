/*
 * What a renderer needs from a plot, worked out without touching the DOM: the panels to draw, and
 * for each of them the domain and kind of its axes. Turning a mark into something a plotting
 * library draws is the renderer's business; everything here is ordinary data, so it can be tested
 * without one.
 */

import { Plot, PlotAxis, PlotColorbar, PlotElement } from '../urban-stats-script/constants/plot'
import { ScaleDescriptor } from '../urban-stats-script/constants/scale'
import { AxisNaming } from '../urban-stats-script/derive-unit'
import { HumanReadableName } from '../utils/human-readable-element'
import { StoredUnit } from '../utils/quantity'
import { UnitType } from '../utils/unit'

export interface AxisSpec {
    /** What the script called it, or failing that what the data drawn against it is called. */
    label: HumanReadableName | undefined
    unit: UnitType | undefined
    /** What the data works out to be measured in, where the script stated no unit of its own. */
    derivedUnit: StoredUnit | undefined
    kind: 'linear' | 'log'
    domain: [number, number]
}

/** One pair of axes and everything drawn against them. */
export interface PanelSpec {
    title: HumanReadableName | undefined
    /** The colorbar is pulled out of these, since it is drawn beside the panel rather than in it. */
    marks: Exclude<PlotElement, PlotColorbar>[]
    colorbar: PlotColorbar | undefined
    /** What the colourbar stands for, and what it is read in, where the script did not say. */
    colorbarLabel: HumanReadableName | undefined
    colorbarUnit: StoredUnit | undefined
    x: AxisSpec
    y: AxisSpec
}

export type PlotLayout =
    { kind: 'panel', panel: PanelSpec } |
    { kind: 'stack', direction: 'horizontal' | 'vertical', children: PlotLayout[] }

/** A log scale holds its bounds in log space, which is not where a reader of the axis is. */
function domainOf(scale: ScaleDescriptor): [number, number] {
    if (scale.kind === 'log') {
        return [Math.exp(scale.linearScale.min), Math.exp(scale.linearScale.max)]
    }
    return [scale.min, scale.max]
}

function axisSpec(axis: PlotAxis, derived: { name: HumanReadableName | undefined, unit: StoredUnit | undefined } | undefined): AxisSpec {
    return {
        // an axis the script did not name is named after the data drawn against it
        label: axis.label ?? derived?.name,
        unit: axis.unit,
        derivedUnit: derived?.unit,
        kind: axis.scale.kind,
        domain: domainOf(axis.scale),
    }
}

/**
 * `naming` is what the axes are called where the script does not say, one entry per panel in the
 * order the panels are drawn, which is the order `plotPanelExpressions` reads them off the script.
 */
export function plotLayout(plot: Plot, naming: AxisNaming[] = []): PlotLayout {
    return layoutOf(plot, naming, { next: 0 })
}

function layoutOf(plot: Plot, naming: AxisNaming[], position: { next: number }): PlotLayout {
    if (plot.kind === 'stack') {
        return { kind: 'stack', direction: plot.direction, children: plot.plots.map(child => layoutOf(child, naming, position)) }
    }
    // `at` rather than an index: there are fewer namings than panels where the script is shaped in
    // a way the reader does not follow, and then a panel simply goes unnamed
    const derived = naming.at(position.next++)
    return {
        kind: 'panel',
        panel: {
            title: plot.title,
            marks: plot.elements.filter(element => element.kind !== 'colorbar'),
            colorbar: plot.elements.find(element => element.kind === 'colorbar'),
            colorbarLabel: derived?.color.name,
            colorbarUnit: derived?.color.unit,
            x: axisSpec(plot.x, derived?.x),
            y: axisSpec(plot.y, derived?.y),
        },
    }
}
