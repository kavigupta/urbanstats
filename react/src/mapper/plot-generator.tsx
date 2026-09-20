/*
 * Drawing what a USS script plots. The marks come from the script, so unlike the article page's
 * charts nothing here knows what a statistic is; it lays out the panels a plot asks for and hands
 * each one's marks to the shared plotting shell.
 */

import * as ObservablePlot from '@observablehq/plot'
import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { DetailedPlotSpec, PlotComponent } from '../components/plots-general'
import { screencapElement } from '../components/screenshot'
import { useColors } from '../page_template/colors'
import { useUnitSettings } from '../page_template/settings'
import { LineFit, Plot, PlotBars, PlotColorbar, PlotElement, PlotHistogram, PlotLine, PlotPoints } from '../urban-stats-script/constants/plot'
import { instantiate } from '../urban-stats-script/constants/scale'
import { AxisNaming } from '../urban-stats-script/derive-unit'
import { atom, HumanReadableElement, HumanReadableName } from '../utils/human-readable-element'
import { reifyReact, reifyString, writtenPlainly } from '../utils/human-readable-name'
import { StoredUnit, UnitSettings, unitProduct, writeQuantity } from '../utils/quantity'
import { formatToSignificantFigures, separateNumber, trimTrailingZeros } from '../utils/text'
import { plainNumber } from '../utils/unit'

import { Colorbar, RampToDisplay } from './components/Colorbar'
import { rampTicks } from './map-rendering'
import { AxisSpec, PanelSpec, PlotLayout, plotLayout } from './plot-spec'

/** The width a plot is laid out at before it is scaled to its container, as a map has one. */
const plotWidth = 1000

/** How many ticks fit along a side once each of them is written with its unit. */
const ticksForUnitLabels = 6

function indices(length: number): number[] {
    return Array.from({ length }, (_, i) => i)
}

/**
 * A value as a tick or a tooltip writes it: with a unit, the way the site writes a quantity
 * anywhere it is plain text; without one, just the number.
 */
function formatValue(value: number, unit: StoredUnit | undefined, settings: UnitSettings): string {
    return unit === undefined ? separateNumber(formatToSignificantFigures(value)) : writtenPlainly(value, unit, settings)
}

function elementsOf(name: HumanReadableName): HumanReadableElement[] {
    return typeof name === 'string' ? atom(name) : name
}

function label(name: HumanReadableName | undefined, settings: UnitSettings): string {
    return name === undefined ? '' : reifyString(name, settings)
}

/** A bar named rather than placed sits on a categorical axis, which has no numeric domain. */
function isCategorical(mark: PlotElement): boolean {
    return mark.kind === 'bars' && typeof mark.x[0] === 'string'
}

interface AxisUnits {
    x: StoredUnit | undefined
    y: StoredUnit | undefined
    settings: UnitSettings
}

function pointsMarks(mark: PlotPoints, units: AxisUnits): ObservablePlot.Markish[] {
    const title = (i: number): string => {
        const position = `${formatValue(mark.x[i], units.x, units.settings)}, ${formatValue(mark.y[i], units.y, units.settings)}`
        const name = mark.names?.[i]
        return name === undefined ? position : `${name}\n${position}`
    }
    return [ObservablePlot.dot(indices(mark.x.length), {
        x: (i: number) => mark.x[i],
        y: (i: number) => mark.y[i],
        r: (i: number) => mark.sizes[i],
        fill: (i: number) => mark.colors[i],
        fillOpacity: (i: number) => mark.opacities[i],
        title,
        tip: true,
        ariaLabel: label(mark.label, units.settings),
    })]
}

function lineMarks(mark: PlotLine): ObservablePlot.Markish[] {
    return [ObservablePlot.line(indices(mark.x.length), {
        x: (i: number) => mark.x[i],
        y: (i: number) => mark.y[i],
        // a line's colour varies along it, but its thickness and dashing are of the line as a whole
        stroke: (i: number) => mark.colors[i],
        strokeWidth: mark.widths[0],
        strokeDasharray: mark.dashes[0] === 0 ? undefined : `${mark.dashes[0]},${mark.dashes[0]}`,
    })]
}

function barsMarks(mark: PlotBars, units: AxisUnits): ObservablePlot.Markish[] {
    const options = {
        y: (i: number) => mark.y[i],
        fill: (i: number) => mark.colors[i],
        title: (i: number) => `${mark.x[i]}\n${formatValue(mark.y[i], units.y, units.settings)}`,
        tip: true,
    }
    if (typeof mark.x[0] === 'string') {
        return [ObservablePlot.barY(indices(mark.y.length), { x: (i: number) => mark.x[i] as string, ...options })]
    }
    return [ObservablePlot.rectY(indices(mark.y.length), { x: (i: number) => mark.x[i] as number, ...options })]
}

function histogramMarks(mark: PlotHistogram, units: AxisUnits): ObservablePlot.Markish[] {
    return [ObservablePlot.rectY(indices(mark.counts.length), {
        x1: (i: number) => mark.edges[i],
        x2: (i: number) => mark.edges[i + 1],
        y: (i: number) => mark.counts[i],
        fill: (i: number) => mark.colors[i],
        title: (i: number) => `${formatValue(mark.edges[i], units.x, units.settings)} to ${formatValue(mark.edges[i + 1], units.x, units.settings)}\n${separateNumber(String(mark.counts[i]))}`,
        tip: true,
    })]
}

function marksOf(mark: Exclude<PlotElement, { kind: 'colorbar' }>, units: AxisUnits): ObservablePlot.Markish[] {
    switch (mark.kind) {
        case 'points':
            return pointsMarks(mark, units)
        case 'line':
            return lineMarks(mark)
        case 'bars':
            return barsMarks(mark, units)
        case 'histogram':
            return histogramMarks(mark, units)
    }
}

/** A categorical axis is laid out by the categories themselves, so it is given no domain. */
function axisOptions(axis: AxisSpec, categorical: boolean): { domain?: [number, number], type?: 'linear' | 'log' } {
    if (categorical) {
        return {}
    }
    return { domain: axis.domain, type: axis.kind }
}

/** An axis's ticks are written in the unit its data works out to, as a colourbar's are. */
function tickFormat(axis: AxisSpec, settings: UnitSettings): ((value: number) => string) | undefined {
    return axis.derivedUnit === undefined ? undefined : value => formatValue(value, axis.derivedUnit, settings)
}

/**
 * The height to draw at so the chart fills the box it is given. Plot lays a chart out `plotWidth`
 * across whatever the box is and the browser scales it to fit, so the height has to be in that same
 * scale rather than in pixels.
 */
function heightFilling(box: { width: number, height: number } | undefined): number | undefined {
    if (box === undefined || box.width === 0 || box.height === 0) {
        return undefined
    }
    return plotWidth * box.height / box.width
}

/** What the box a panel is given measures, as the layout sizes it. */
function useMeasuredBox(): [React.RefObject<HTMLDivElement>, { width: number, height: number } | undefined] {
    const ref = useRef<HTMLDivElement>(null)
    const [box, setBox] = useState<{ width: number, height: number } | undefined>(undefined)
    useEffect(() => {
        const element = ref.current
        if (element === null) {
            return
        }
        const observer = new ResizeObserver(() => {
            setBox({ width: element.offsetWidth, height: element.offsetHeight })
        })
        observer.observe(element)
        return () => { observer.disconnect() }
    }, [])
    return [ref, box]
}

function panelSpec(panel: PanelSpec, settings: UnitSettings, height: number | undefined): DetailedPlotSpec {
    const categorical = panel.marks.some(isCategorical)
    const x = axisOptions(panel.x, categorical)
    const y = axisOptions(panel.y, false)
    const units: AxisUnits = { x: panel.x.derivedUnit, y: panel.y.derivedUnit, settings }
    return {
        marks: [
            ObservablePlot.gridX(),
            ObservablePlot.gridY(),
            ObservablePlot.ruleY([0], { strokeOpacity: 0.3 }),
            ...panel.marks.flatMap(mark => marksOf(mark, units)),
        ],
        xlabel: label(panel.x.label, settings),
        ylabel: label(panel.y.label, settings),
        xdomain: x.domain,
        xtype: x.type,
        ydomain: y.domain,
        ytype: y.type,
        xtickFormat: tickFormat(panel.x, settings),
        ytickFormat: tickFormat(panel.y, settings),
        // a tick carrying a unit takes several times the room of the bare number Plot counts on
        xticks: panel.x.derivedUnit === undefined ? undefined : ticksForUnitLabels,
        yticks: panel.y.derivedUnit === undefined ? undefined : ticksForUnitLabels,
        // a mark's size is the pixels it is drawn at, having been worked out from the data already
        identityRadius: true,
        height,
    }
}

/** The colourbar a plot draws is the one a map draws, given the ramp and scale the script chose. */
function instantiateColorbar(colorbar: PlotColorbar, fallbackLabel: HumanReadableName | undefined, unit: StoredUnit | undefined): RampToDisplay {
    const scale = instantiate(colorbar.scale)
    return {
        type: 'ramp',
        value: {
            ramp: colorbar.ramp,
            scale,
            interpolations: rampTicks(scale),
            label: colorbar.label ?? fallbackLabel ?? '',
            unit: unit ?? plainNumber,
            hasValuesClampedToStart: false,
            hasValuesClampedToEnd: false,
        },
    }
}

/**
 * What a fitted line says, in the units of the two axes: a step along x is worth this much y, the
 * line crosses at this much y, and it accounts for this much of the variation. The slope's unit is
 * one over the other, as a regression's own `m` is.
 */
function fitLegend(fit: LineFit, panel: PanelSpec, settings: UnitSettings): HumanReadableElement[] {
    const perX = panel.y.derivedUnit === undefined || panel.x.derivedUnit === undefined
        ? undefined
        : unitProduct(panel.y.derivedUnit, panel.x.derivedUnit, -1)
    const named = (axis: AxisSpec, fallback: string): HumanReadableElement[] =>
        axis.label === undefined ? atom(fallback) : elementsOf(axis.label)
    // written as a quantity is written anywhere else, so that a squared unit reads as one
    const quantity = (value: number, unit: StoredUnit | undefined): HumanReadableElement[] => {
        if (unit === undefined) {
            return atom(separateNumber(formatToSignificantFigures(value)))
        }
        const { renderedValue, unitName } = writeQuantity(value, unit, settings, 'afterNumber')
        return [...atom(trimTrailingZeros(renderedValue)), ...unitName]
    }
    // the sign is written between the terms, so what follows it is the size of the intercept
    const sign = fit.intercept < 0 ? '\u2212' : '+'
    return [
        ...named(panel.y, 'y'),
        ...atom(' = '),
        ...quantity(fit.slope, perX),
        ...atom(' × '),
        ...named(panel.x, 'x'),
        ...atom(` ${sign} `),
        ...quantity(Math.abs(fit.intercept), panel.y.derivedUnit),
        ...atom(` (R² = ${formatToSignificantFigures(fit.r2, 2)})`),
    ]
}

/** A line of the legend: the colour something is drawn in, and what it stands for. */
function LegendEntry({ color, text }: { color: string, text: HumanReadableElement[] }): ReactNode {
    const settings = useUnitSettings()
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', fontSize: '14px' }}>
            <span style={{ width: '1.5em', height: '3px', backgroundColor: color, flexShrink: 0 }} />
            <span>{reifyReact(text, settings)}</span>
        </div>
    )
}

/** Every mark that says what it is: the ones the script labelled, and any fitted line. */
function legendEntries(panel: PanelSpec, settings: UnitSettings): { color: string, text: HumanReadableElement[] }[] {
    return panel.marks.flatMap((mark) => {
        const color = mark.colors[0]
        if (mark.kind === 'line' && mark.label === undefined && mark.fit !== undefined) {
            return [{ color, text: fitLegend(mark.fit, panel, settings) }]
        }
        return mark.label === undefined ? [] : [{ color, text: elementsOf(mark.label) }]
    })
}

function Panel({ panel }: { panel: PanelSpec }): ReactNode {
    const settings = useUnitSettings()
    const colors = useColors()
    const [chartRef, box] = useMeasuredBox()
    const entries = legendEntries(panel, settings)
    const colorbar: RampToDisplay | undefined = panel.colorbar === undefined
        ? undefined
        : instantiateColorbar(panel.colorbar, panel.colorbarLabel, panel.colorbarUnit)
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }} data-test-id="plot-panel">
            {panel.title !== undefined && (
                <div className="centered_text user_input">{label(panel.title, settings)}</div>
            )}
            {/* the chart takes whatever height the panel's other parts leave it */}
            <div ref={chartRef} style={{ flex: 1, minHeight: 0 }}>
                <PlotComponent
                    plotSpec={() => panelSpec(panel, settings, heightFilling(box))}
                    settingsElement={() => <></>}
                    transpose={false}
                />
            </div>
            {entries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25em', margin: '0.25em 0 0.5em 0' }} data-test-id="plot-legend">
                    {entries.map((entry, i) => <LegendEntry key={i} color={entry.color} text={entry.text} />)}
                </div>
            )}
            {colorbar !== undefined && (
                <Colorbar ramp={colorbar} basemap={{ type: 'none', backgroundColor: colors.background, textColor: colors.textMain }} />
            )}
        </div>
    )
}

function Layout({ layout }: { layout: PlotLayout }): ReactNode {
    if (layout.kind === 'panel') {
        return <Panel panel={layout.panel} />
    }
    return (
        <div style={{
            display: 'flex',
            flexDirection: layout.direction === 'horizontal' ? 'row' : 'column',
            gap: '1em',
            width: '100%',
            height: '100%',
            minHeight: 0,
        }}
        >
            {layout.children.map((child, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                    <Layout layout={child} />
                </div>
            ))}
        </div>
    )
}

function PlotView({ plot, naming, exportImageRef }: {
    plot: Plot
    naming: AxisNaming[]
    exportImageRef: (fn: () => Promise<HTMLCanvasElement>) => void
}): ReactNode {
    const ref = useRef<HTMLDivElement>(null)
    exportImageRef(async () => {
        if (ref.current === null) {
            throw new Error('the plot has not been drawn yet')
        }
        return await screencapElement(ref.current, plotWidth * 2)
    })
    return (
        <div ref={ref} style={{ width: '100%', height: '100%', padding: '1em 0', minHeight: 0 }}>
            <Layout layout={plotLayout(plot, naming)} />
        </div>
    )
}

/** Every number a plot draws, so that what is plotted can be taken away as a table. */
export function plotCSVData(plot: Plot): string[][] {
    const columns: { header: string, cells: string[] }[] = []
    const addMark = (mark: PlotElement, index: number): void => {
        const name = mark.kind === 'colorbar' ? 'Colorbar' : `${mark.kind} ${index + 1}`
        switch (mark.kind) {
            case 'points':
            case 'line':
                if (mark.kind === 'points' && mark.names !== undefined) {
                    columns.push({ header: `${name}: name`, cells: mark.names })
                }
                columns.push({ header: `${name}: x`, cells: mark.x.map(String) })
                columns.push({ header: `${name}: y`, cells: mark.y.map(String) })
                break
            case 'bars':
                columns.push({ header: `${name}: x`, cells: mark.x.map(String) })
                columns.push({ header: `${name}: y`, cells: mark.y.map(String) })
                break
            case 'histogram':
                columns.push({ header: `${name}: from`, cells: mark.edges.slice(0, -1).map(String) })
                columns.push({ header: `${name}: to`, cells: mark.edges.slice(1).map(String) })
                columns.push({ header: `${name}: count`, cells: mark.counts.map(String) })
                break
            case 'colorbar':
                break
        }
    }
    const walk = (value: Plot): void => {
        if (value.kind === 'stack') {
            value.plots.forEach(walk)
            return
        }
        value.elements.forEach(addMark)
    }
    walk(plot)
    const rows = Math.max(0, ...columns.map(column => column.cells.length))
    return [
        columns.map(column => column.header),
        ...indices(rows).map(row => columns.map(column => column.cells[row] ?? '')),
    ]
}

export function plotUI(plot: Plot, naming: AxisNaming[]): (props: { loading: boolean }) => { node: ReactNode, exportImage?: () => Promise<HTMLCanvasElement> } {
    return () => {
        let exportImage: () => Promise<HTMLCanvasElement>
        return {
            node: <PlotView plot={plot} naming={naming} exportImageRef={(fn) => { exportImage = fn }} />,
            exportImage: async () => await exportImage(),
        }
    }
}
