import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { useTranspose } from '../utils/transpose'
import { zIndex } from '../utils/zIndex'

import { createScreenshot, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'

import './plots.css'

const strokeDasharrays = ['1,0', '10,10', '2,5']

// Plot's default placement for the bottom-axis label
// is `marginBottom - 3` which pins it to the very bottom
// edge and clips e.g., "g" keeping the offset smaller than the
// bottom margin leaves headroom below the text.
export const bottomLabelOffset = 50
export const bottomLabelOffsetTranspose = 70

// The left-axis label needs a strip of the left margin to itself, next to
// however much room the tick labels happen to take.
// To estimate this, we render the plot once, measure the left axis, and rerender
// These are the provisional values for the first pass.
const provisionalMarginLeft = 80
const provisionalMarginLeftTranspose = 140

// gap between the frame's left edge and the rotated label
const labelEdgePad = 8
// gap between the rotated label and the tick labels
const labelTickGap = 10
// Plot insets left tick labels from the frame by tickSize + tickPadding
const tickLabelInset = 9

interface LeftAxisLayout {
    marginLeft: number
    labelOffset: number
}

function provisionalLeftAxisLayout(transpose: boolean): LeftAxisLayout {
    const margin = transpose ? provisionalMarginLeftTranspose : provisionalMarginLeft
    return { marginLeft: margin, labelOffset: margin - labelEdgePad }
}

// measures a rendered plot's left axis and works out the margin that fits its tick labels and its
// rotated label side by side. The label is rotated, so it is its bbox *height* that eats into the
// margin; the ticks are horizontal, so it is their width.
function measureLeftAxisLayout(plot: SVGSVGElement | HTMLElement): LeftAxisLayout {
    const widthOf = (selector: string, dimension: 'width' | 'height'): number => {
        const elements = Array.from(plot.querySelectorAll<SVGGraphicsElement>(`g[aria-label="${selector}"] text`))
        return Math.max(0, ...elements.map(element => element.getBBox()[dimension]))
    }
    const tickWidth = widthOf('y-axis tick label', 'width')
    const labelThickness = widthOf('y-axis label', 'height')
    // no label means no strip to reserve for it, and hence no gap either
    const labelStrip = labelThickness === 0 ? 0 : labelEdgePad + labelThickness + labelTickGap
    return {
        marginLeft: labelStrip + tickWidth + tickLabelInset,
        labelOffset: labelStrip + tickWidth + tickLabelInset - labelEdgePad,
    }
}

function renderMeasuredPlot(container: HTMLElement, config: (leftAxis: LeftAxisLayout) => Plot.PlotOptions, transpose: boolean): SVGSVGElement | HTMLElement {
    const probe = Plot.plot(config(provisionalLeftAxisLayout(transpose)))
    container.replaceChildren(probe)
    const layout = measureLeftAxisLayout(probe)
    const plot = Plot.plot(config(layout))
    container.replaceChildren(plot)
    return plot
}

// picks the axis/grid mark constructors for whichever side is currently the visual x-axis
export function axisAndGrid(transpose: boolean): [typeof Plot.axisX, typeof Plot.gridX] {
    return transpose ? [Plot.axisY, Plot.gridY] : [Plot.axisX, Plot.gridX]
}

function valueGrid(transpose: boolean): typeof Plot.gridY {
    return transpose ? Plot.gridX : Plot.gridY
}

export function paddedYDomain(values: number[], pad: number, anchoredBottom?: number): [number, number] {
    const maxValue = Math.max(...values)
    const minValue = anchoredBottom ?? Math.min(...values)
    const p = (maxValue - minValue) * pad || Math.max(Math.abs(maxValue), 1) * pad
    return [anchoredBottom ?? minValue - p, maxValue + p]
}

export function categoricalAxisMarks(tickIdxs: number[], transpose: boolean, tickFormat: (idx: number) => string, leftLabelOffset: number): Plot.Markish[] {
    const [axis, grid] = axisAndGrid(transpose)
    // this axis is the horizontal (bottom) one unless transposed, in which case it is the left one
    const labelOffset = transpose ? leftLabelOffset : bottomLabelOffset
    return [
        axis(tickIdxs, { tickFormat, labelAnchor: 'center', labelArrow: 'none', labelOffset }),
        grid(tickIdxs),
        valueGrid(transpose)(),
    ]
}

// entries sharing a name (a region's multiple years, or its High/Low pair) stack onto one line in
// the order given; a lone entry drops the name (or uses singleLabel, e.g. Histogram's "Frequency")
export function groupedTipTitle(prefix: string, entries: { name: string, value: number }[], formatValue: (v: number) => string, singleLabel?: string): string {
    const groups = new Map<string, number[]>()
    const nameOrder: string[] = []
    for (const entry of entries) {
        if (!groups.has(entry.name)) {
            groups.set(entry.name, [])
            nameOrder.push(entry.name)
        }
        groups.get(entry.name)!.push(entry.value)
    }
    if (nameOrder.length === 1 && groups.get(nameOrder[0])!.length === 1) {
        const value = groups.get(nameOrder[0])![0]
        return singleLabel !== undefined ? `${prefix}\n${singleLabel}: ${formatValue(value)}` : `${prefix}\n${formatValue(value)}`
    }
    const lines = nameOrder.map(name => `${name}: ${groups.get(name)!.map(formatValue).join(' / ')}`)
    return `${prefix}\n${lines.join('\n')}`
}

export function ordinalSeriesMarks(
    seriesData: { series: { color: string, subseriesName: string }, values: number[] }[],
    idxs: number[],
    idxKey: string,
    transpose: boolean,
    dashPatterns: Map<string, { pattern: string, name: string }>,
    xFor: (i: number) => number = i => i,
): Plot.Markish[] {
    const marks: Plot.Markish[] = []
    marks.push(
        ...seriesData.map(({ series, values }) =>
            Plot.line(
                idxs.map(i => ({ [idxKey]: xFor(i), value: values[i] })),
                {
                    x: transpose ? 'value' : idxKey,
                    y: transpose ? idxKey : 'value',
                    stroke: series.color,
                    strokeWidth: 3,
                    strokeDasharray: dashPatterns.size > 1 ? dashPatterns.get(series.subseriesName)?.pattern : undefined,
                },
            ),
        ),
    )
    marks.push(
        ...seriesData.map(({ series, values }) =>
            Plot.dot(
                idxs.map(i => ({ [idxKey]: xFor(i), value: values[i] })),
                {
                    x: transpose ? 'value' : idxKey,
                    y: transpose ? idxKey : 'value',
                    fill: series.color,
                    r: 3,
                },
            ),
        ),
    )
    return marks
}

// unlike the density histogram, these are centered between bins
export function ordinalSeriesBarMarks(
    seriesData: { series: { color: string }, values: number[] }[],
    idxs: number[],
    transpose: boolean,
    xFor: (i: number) => number = i => i,
): Plot.Markish {
    const width = 1 / seriesData.length * 0.8
    const bars = seriesData.flatMap(({ series, values }, seriesIdx) => {
        const centerOffset = (seriesIdx - (seriesData.length - 1) / 2) * width
        return idxs.map(i => ({
            left: xFor(i) + centerOffset - width / 2,
            right: xFor(i) + centerOffset + width / 2,
            value: values[i],
            color: series.color,
        }))
    })
    return transpose
        ? Plot.rectX(bars, { y1: 'left', y2: 'right', x: 'value', fill: 'color' })
        : Plot.rectY(bars, { x1: 'left', x2: 'right', y: 'value', fill: 'color' })
}

export function seriesTip(
    seriesData: { series: PlotSeriesItem, values: number[] }[],
    idxs: number[],
    transpose: boolean,
    xFor: (i: number) => number,
    prefixFor: (idx: number) => string,
    formatValue: (v: number) => string,
    colors: Colors,
    pinnedTip: PinnedTipIndex,
): Plot.Markish[] {
    const tipData = idxs.map(i => ({
        x: xFor(i),
        prefix: prefixFor(i),
        entries: seriesData.map(s => ({ name: s.series.shortname, value: s.values[i] })),
    }))
    return transposeAwareTip(
        tipData,
        transpose,
        d => d.x,
        d => d.entries.map(e => e.value),
        d => groupedTipTitle(d.prefix, d.entries, formatValue),
        colors,
        pinnedTip,
    )
}

// The tooltip the user has clicked on, identified by its position in the tip mark's data. An index
// rather than the datum itself because the data is rebuilt from scratch whenever the plot
// re-renders, and it means the same point stays pinned across a transpose or a settings change.
export type PinnedTipIndex = number | null

// each tip datum is wrapped so that the plot's `value` (which Plot sets to the pointed-at datum)
// tells us which tooltip a click would pin
interface TipRow<T> { datum: T, tipIndex: number }

// the index of the tooltip the pointer is currently over, or null if it isn't over the plot
function pointedTipIndex(plot: HTMLElement | SVGSVGElement): PinnedTipIndex {
    const value: unknown = (plot as { value?: unknown }).value
    if (typeof value !== 'object' || value === null || !('tipIndex' in value)) {
        return null
    }
    const { tipIndex } = value as TipRow<unknown>
    return tipIndex
}

// a Plot.tip anchored at the tallest series' value at each point, swapping x/y when transposed,
// styled with the theme's tooltip colors. Comes in two flavors: the one that follows the pointer,
// and, if the user has pinned one, an ordinary (non-interactive) mark drawn at the pinned point.
export function transposeAwareTip<T>(
    data: T[],
    transpose: boolean,
    getX: (d: T) => number,
    getValues: (d: T) => number[],
    title: (d: T) => string,
    colors: Colors,
    pinnedTip: PinnedTipIndex,
): Plot.Markish[] {
    const rows: TipRow<T>[] = data.map((datum, tipIndex) => ({ datum, tipIndex }))
    const position = (row: TipRow<T>): number => getX(row.datum)
    const value = (row: TipRow<T>): number => Math.max(...getValues(row.datum))
    const options = {
        x: transpose ? value : position,
        y: transpose ? position : value,
        title: (row: TipRow<T>) => title(row.datum),
        fill: colors.slightlyDifferentBackground,
        stroke: colors.borderNonShadow,
        textColor: colors.textMain,
    }
    const marks: Plot.Markish[] = [Plot.tip(rows, (transpose ? Plot.pointerY : Plot.pointerX)(options))]
    // being a plain mark rather than a pointer-driven one, the pinned tooltip stays put when the
    // mouse leaves, and is drawn into the plot we re-render for the downloaded image
    if (pinnedTip !== null && pinnedTip < rows.length) {
        marks.push(Plot.tip([rows[pinnedTip]], { ...options, className: pinnedTipClassName }))
    }
    return marks
}

const pinnedTipClassName = 'plot-pinned-tip'
// tied to CSS (plots.css), which hides the button while a screenshot of the page is being taken
const dismissButtonClassName = 'plot-tip-dismiss'

const dismissIconSrc = '/close.png'
// SVG masks are referenced by id, and there is one dismiss button per plot on the page
let dismissIconCount = 0

// the little "x" that dismisses a pinned tooltip. Drawn into the plot's SVG rather than overlaid as
// HTML, so that it stays glued to the tooltip when the plot is scaled down to fit a narrow screen.
function createDismissButton(colors: Colors, scale: number, onDismiss: () => void): SVGElement {
    const svgNS = 'http://www.w3.org/2000/svg'
    const group = document.createElementNS(svgNS, 'g')
    group.setAttribute('class', dismissButtonClassName)
    group.setAttribute('data-test-id', 'dismiss_pinned_tooltip')
    group.setAttribute('role', 'button')
    group.setAttribute('tabindex', '0')
    group.setAttribute('aria-label', 'Dismiss tooltip')

    const radius = 8 * scale
    const background = document.createElementNS(svgNS, 'circle')
    background.setAttribute('r', String(radius))
    background.setAttribute('fill', colors.slightlyDifferentBackground)
    background.setAttribute('stroke', colors.textMain)
    group.appendChild(background)

    // the icon is white with transparency, like the rest of the icon set, so it is used as a mask
    // for the theme's text color rather than drawn directly -- the same trick as <Icon />
    const size = radius * 1.1
    const maskId = `${dismissButtonClassName}-mask-${dismissIconCount++}`
    const mask = document.createElementNS(svgNS, 'mask')
    mask.setAttribute('id', maskId)
    const image = document.createElementNS(svgNS, 'image')
    image.setAttribute('href', dismissIconSrc)
    image.setAttribute('x', String(-size / 2))
    image.setAttribute('y', String(-size / 2))
    image.setAttribute('width', String(size))
    image.setAttribute('height', String(size))
    mask.appendChild(image)
    group.appendChild(mask)

    const cross = document.createElementNS(svgNS, 'rect')
    cross.setAttribute('x', String(-size / 2))
    cross.setAttribute('y', String(-size / 2))
    cross.setAttribute('width', String(size))
    cross.setAttribute('height', String(size))
    cross.setAttribute('fill', colors.textMain)
    cross.setAttribute('mask', `url(#${maskId})`)
    group.appendChild(cross)

    // clicks are handled by the plot-wide pointerdown listener, which sees this button's class;
    // the keyboard has no such listener to piggyback on
    group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onDismiss()
        }
    })
    return group
}

function isDismissButton(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(`.${dismissButtonClassName}`) !== null
}

// Plot sizes and places a tooltip asynchronously, once it can measure the rendered text, so where
// the tooltip's corner is -- and hence where the dismiss button goes -- is only known a frame later.
function attachDismissButton(plot: Element, colors: Colors, transpose: boolean, onDismiss: () => void): void {
    const tip = plot.querySelector(`g.${pinnedTipClassName}`)
    if (!(tip instanceof SVGGraphicsElement)) {
        return
    }
    const box = tip.getBBox()
    // hung half in and half out of the tooltip's top right corner, where the rounded corner leaves
    // a gap in the text. Transposed plots draw at double the font size, so scale to match.
    const button = createDismissButton(colors, transpose ? 2 : 1, onDismiss)
    button.setAttribute('transform', `translate(${box.x + box.width} ${box.y})`)
    tip.appendChild(button)
}

// the screenshot-download icon shared by every plot type's settings bar
function PlotDownloadButton(props: { makePlot: () => HTMLElement, shortnames: string[], filenameSuffix: string }): ReactNode {
    const universe = useUniverse()
    const colors = useColors()
    return (
        <img
            src="/download.png"
            onClick={async () => {
                const plot = props.makePlot()
                document.body.appendChild(plot)
                // a pinned tooltip is laid out on the frame after the plot is rendered, so wait for
                // it; otherwise the capture below can catch the tooltip before it is placed
                await new Promise<void>((resolve) => { requestAnimationFrame(() => { resolve() }) })
                const uniqueShortnames = Array.from(new Set(props.shortnames))
                await createScreenshot(
                    () => ({
                        path: `${uniqueShortnames.join('_')}_${props.filenameSuffix}`,
                        overallWidth: plot.offsetWidth * 2,
                        elementsToRender: [plot],
                    }),
                    universe,
                    colors,
                    { render: new Set(), wait: new Set() },
                )
                plot.remove()
            }}
            width="20"
            height="20"
            style={{ cursor: 'pointer' }}
        />
    )
}

function deduplicate(arr: string[]): string[] {
    return Array.from(new Set(arr))
}

export const transposeSettingsHeight = 30.5

// shared settings bar: download, "add region" search, and optional mode switcher / extra controls
function PlotSettingsBar(props: {
    makePlot: () => HTMLElement
    shortnames: string[]
    longnames: string[]
    sharedTypeOfAllArticles?: string
    filenameSuffix: string
    modeSwitcher?: ReactElement
    children?: ReactNode
}): ReactNode {
    const colors = useColors()
    const universe = useUniverse()
    const transpose = useTranspose()
    const navContext = useContext(Navigator.Context)
    const [showSearchBox, setShowSearchBox] = useState(false)

    return (
        <div
            className="serif"
            style={{
                backgroundColor: transpose ? undefined : colors.background,
                padding: transpose ? undefined : '0.5em',
                border: transpose ? undefined : `1px solid ${colors.textMain}`,
                display: 'flex',
                gap: '0.5em',
                height: transpose ? `${transposeSettingsHeight}px` : undefined,
                alignItems: transpose ? 'center' : undefined,
                justifyContent: transpose ? 'center' : undefined,
                position: 'relative',
            }}
        >
            <PlotDownloadButton makePlot={props.makePlot} shortnames={props.shortnames} filenameSuffix={props.filenameSuffix} />
            <div style={{ position: 'relative' }}>
                <img
                    src="/add.png"
                    onClick={() => { setShowSearchBox(!showSearchBox) }}
                    width="20"
                    height="20"
                    style={{ cursor: 'pointer' }}
                />
                {showSearchBox && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '25px',
                            left: '0px',
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.textMain}`,
                            borderRadius: '4px',
                            padding: '0.5em',
                            zIndex: zIndex.plotSettings,
                            minWidth: '200px',
                        }}
                    >
                        <SearchBox
                            style={{ width: '100%' }}
                            placeholder="Add region..."
                            autoFocus={true}
                            prioritizeArticleType={props.sharedTypeOfAllArticles}
                            onChange={() => {
                                setShowSearchBox(false)
                            }}
                            articleLink={(regionName) => {
                                return navContext.link({
                                    kind: 'comparison',
                                    universe,
                                    longnames: [...deduplicate(props.longnames), regionName],
                                }, { scroll: { kind: 'none' } })
                            }}
                        />
                    </div>
                )}
            </div>
            {props.children}
            {props.modeSwitcher}
        </div>
    )
}

interface LegendItem {
    shortname: string
    color: string
    subseriesName: string
}

function computeColorItems<T extends LegendItem>(items: T[]): { label: string, color: string }[] {
    const colorItems: { label: string, color: string }[] = []
    for (const item of items) {
        // handles duplicate names by just putting them all in if they're different colors
        const index = colorItems.findIndex(existing => existing.label === item.shortname && existing.color === item.color)
        if (index === -1) {
            colorItems.push({
                label: item.shortname,
                color: item.color,
            })
        }
    }
    if (colorItems.length <= 1) {
        return []
    }
    return colorItems
}

export function computeDashPatterns<T extends LegendItem>(items: T[], order?: string[]): Map<string, { pattern: string, name: string }> {
    const dashPatterns = new Map<string, { pattern: string, name: string }>()
    const subseriesNames = new Set<string>()
    items.forEach((item) => {
        subseriesNames.add(item.subseriesName)
    })
    const subseriesNamesOrdered = order ?? Array.from(subseriesNames).sort()
    assert(subseriesNamesOrdered.length <= strokeDasharrays.length, 'Too many subseries for dash patterns')
    items.forEach((item) => {
        const subId = subseriesNamesOrdered.indexOf(item.subseriesName)
        assert(subId !== -1, `subseriesName ${item.subseriesName} missing from dash order`)
        if (!dashPatterns.has(item.subseriesName)) {
            dashPatterns.set(item.subseriesName, {
                pattern: strokeDasharrays[subseriesNamesOrdered.length - 1 - subId],
                name: item.subseriesName,
            })
        }
    })
    return dashPatterns
}

function manualLegend<T extends LegendItem>(items: T[], transpose: boolean, themeColors: Colors, dashOrder?: string[]): Plot.Markish[] {
    const colorItems = computeColorItems(items)

    const dashPatterns = computeDashPatterns(items, dashOrder)

    const dashPatternItems: { label: string, dashPattern: string }[] = []
    if (dashPatterns.size > 1) {
        const dashPatternsEnumerated = Array.from(dashPatterns.values()).sort((a, b) => a.name.localeCompare(b.name))
        dashPatternsEnumerated.forEach(({ pattern, name }) => {
            dashPatternItems.push({
                label: name,
                dashPattern: pattern,
            })
        })
    }

    const totalItems = colorItems.length + dashPatternItems.length
    if (totalItems === 0) {
        return []
    }

    const createLegend = (): SVGElement => {
        const svgNS = 'http://www.w3.org/2000/svg'
        const group = document.createElementNS(svgNS, 'g')
        // Position on the left side, but offset enough to avoid the y-axis
        const translateX = transpose ? 200 : 100
        const translateY = 70
        group.setAttribute('transform', `translate(${translateX} ${translateY})`)

        const paddingX = 12
        const paddingY = 10
        const rowHeight = 22
        const squareSize = 14
        const lineLength = 36
        const fontSize = 13
        const textSpacing = 10

        // Calculate width based on longest label
        const allLabels = [...colorItems.map(item => item.label), ...dashPatternItems.map(item => item.label)]
        let maxTextWidth = 0
        if (allLabels.length > 0) {
            // Use canvas to measure text width accurately
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            if (context) {
                context.font = `${fontSize}px serif`
                allLabels.forEach((label) => {
                    const textWidth = context.measureText(label).width
                    if (textWidth > maxTextWidth) {
                        maxTextWidth = textWidth
                    }
                })
            }
        }

        // Width = paddingX (left) + max(squareSize/lineLength) + textSpacing + textWidth + paddingX (right)
        const maxSymbolWidth = Math.max(squareSize, lineLength)
        const width = paddingX + maxSymbolWidth + textSpacing + maxTextWidth + paddingX
        const height = paddingY * 2 + rowHeight * totalItems

        const background = document.createElementNS(svgNS, 'rect')
        background.setAttribute('width', String(width))
        background.setAttribute('height', String(height))
        background.setAttribute('rx', '6')
        background.setAttribute('fill', themeColors.slightlyDifferentBackground)
        background.setAttribute('stroke', themeColors.borderNonShadow)
        group.appendChild(background)

        let rowIndex = 0

        // Render color squares
        colorItems.forEach((item) => {
            const row = document.createElementNS(svgNS, 'g')
            row.setAttribute('transform', `translate(${paddingX} ${paddingY + rowHeight * rowIndex})`)

            const centerY = rowHeight / 2
            const square = document.createElementNS(svgNS, 'rect')
            square.setAttribute('x', '0')
            square.setAttribute('y', String(centerY - squareSize / 2))
            square.setAttribute('width', String(squareSize))
            square.setAttribute('height', String(squareSize))
            square.setAttribute('fill', item.color)
            row.appendChild(square)

            const text = document.createElementNS(svgNS, 'text')
            text.setAttribute('x', String(squareSize + 10))
            text.setAttribute('y', String(centerY))
            text.setAttribute('font-size', `${fontSize}px`)
            text.setAttribute('fill', themeColors.textMain)
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('text-anchor', 'start')
            text.textContent = item.label
            row.appendChild(text)

            group.appendChild(row)
            rowIndex++
        })

        // Render dash pattern lines
        dashPatternItems.forEach((item) => {
            const row = document.createElementNS(svgNS, 'g')
            row.setAttribute('transform', `translate(${paddingX} ${paddingY + rowHeight * rowIndex})`)

            const centerY = rowHeight / 2
            const line = document.createElementNS(svgNS, 'line')
            line.setAttribute('x1', '0')
            line.setAttribute('x2', String(lineLength))
            line.setAttribute('y1', String(centerY))
            line.setAttribute('y2', String(centerY))
            line.setAttribute('stroke', themeColors.textMain)
            line.setAttribute('stroke-width', '3')
            if (item.dashPattern !== '1,0') {
                line.setAttribute('stroke-dasharray', item.dashPattern)
            }
            row.appendChild(line)

            const text = document.createElementNS(svgNS, 'text')
            text.setAttribute('x', String(lineLength + 10))
            text.setAttribute('y', String(centerY))
            text.setAttribute('font-size', `${fontSize}px`)
            text.setAttribute('fill', themeColors.textMain)
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('text-anchor', 'start')
            text.textContent = item.label
            row.appendChild(text)

            group.appendChild(row)
            rowIndex++
        })

        return group
    }

    return [createLegend]
}

export interface DetailedPlotSpec {
    marks: Plot.Markish[]
    xlabel: string | null
    ylabel: string
    ydomain?: [number, number]
    legend?: { legend: boolean, range: string[], domain: string[] }
}

export function PlotComponent(props: {
    plotSpec: (transpose: boolean, leftLabelOffset: number, pinnedTip: PinnedTipIndex) => DetailedPlotSpec
    settingsElement: (makePlot: () => HTMLElement) => ReactElement
}): ReactElement {
    const transpose = useTranspose()
    const colors = useColors()

    const plotRef = useRef<HTMLDivElement>(null)

    // clicking a point pins its tooltip in place. Deliberately component state rather than a
    // setting: it should survive clicking elsewhere on the page, but not a navigation or a reload.
    const [pinnedTip, setPinnedTip] = useState<PinnedTipIndex>(null)
    // the tooltip the pointer is over, which is the one a click pins. Read at click time rather
    // than rendered from, so it doesn't need to be state.
    const pointedTip = useRef<PinnedTipIndex>(null)

    const plotSpec = props.plotSpec

    const plotConfig = useCallback((transposeConfig: boolean, leftAxis: LeftAxisLayout): Plot.PlotOptions => {
        const { marks, xlabel, ylabel, ydomain, legend } = plotSpec(transposeConfig, leftAxis.labelOffset, pinnedTip)
        const result: Plot.PlotOptions = {
            marks,
            x: {
                label: xlabel,
                labelAnchor: 'center',
                labelArrow: 'none',
                labelOffset: transposeConfig ? bottomLabelOffsetTranspose : bottomLabelOffset,
            },
            y: {
                label: ylabel,
                domain: ydomain,
                labelAnchor: 'center',
                labelArrow: 'none',
                labelOffset: leftAxis.labelOffset,
            },
            grid: false,
            width: transposeConfig ? undefined : 1000,
            height: transposeConfig ? 1000 : undefined,
            style: {
                fontSize: transposeConfig ? '2em' : '1em',
                fontFamily: 'Jost, Arial, sans-serif',
            },
            marginTop: 80,
            marginBottom: transposeConfig ? 90 : 62,
            marginLeft: leftAxis.marginLeft,
            color: legend,
        }
        if (transposeConfig) {
            result.x = {
                label: ylabel,
                domain: ydomain,
                labelAnchor: 'center',
                labelArrow: 'none',
                labelOffset: bottomLabelOffsetTranspose,
            }
            result.y = {
                label: xlabel,
                reverse: true,
                labelAnchor: 'center',
                labelArrow: 'none',
                labelOffset: leftAxis.labelOffset,
            }
        }
        return result
    }, [plotSpec, pinnedTip])

    useEffect(() => {
        const container = plotRef.current
        if (container === null) {
            return
        }
        const plot = renderMeasuredPlot(container, leftAxis => plotConfig(transpose, leftAxis), transpose)

        const recordPointedTip = (): void => {
            pointedTip.current = pointedTipIndex(plot)
        }
        const handlePointerDown = (event: PointerEvent): void => {
            // Plot has a click-to-stick tooltip of its own, which would double up with the pinned
            // one we draw; suppressing it here (before the event reaches the plot) leaves us in
            // sole charge of what a click does
            event.stopPropagation()
            if (isDismissButton(event.target)) {
                setPinnedTip(null)
                return
            }
            const pointed = pointedTip.current
            if (pointed !== null) {
                // clicking the already-pinned point unpins it, like clicking a toggle
                setPinnedTip(current => current === pointed ? null : pointed)
            }
        }
        plot.addEventListener('input', recordPointedTip)
        container.addEventListener('pointerdown', handlePointerDown, true)
        const frame = requestAnimationFrame(() => {
            attachDismissButton(plot, colors, transpose, () => { setPinnedTip(null) })
        })

        return () => {
            cancelAnimationFrame(frame)
            plot.removeEventListener('input', recordPointedTip)
            container.removeEventListener('pointerdown', handlePointerDown, true)
        }
    }, [transpose, plotConfig, colors])

    const screenshotMode = useScreenshotMode()

    const transposeTopMargin = '35px'

    // put a button panel in the top right corner
    return (
        <>
            <div
                // both tied to CSS; the screenshot class hides the pinned tooltip's dismiss button,
                // which is interactive chrome rather than part of the chart
                className={screenshotMode ? 'histogram-svg-panel screenshot-mode' : 'histogram-svg-panel'}
                ref={plotRef}
                style={
                    {
                        width: '100%',
                        height: transpose ? `calc(100% - ${transposeTopMargin})` : undefined,
                        position: transpose ? 'relative' : undefined,
                        top: transpose ? transposeTopMargin : undefined,
                    }
                }
            >
            </div>
            {screenshotMode
                ? undefined
                : (
                        <div style={{ zIndex: zIndex.plotSettings, position: 'absolute', top: 0, right: 0, left: transpose ? 0 : undefined }}>
                            {props.settingsElement(() => {
                                const div = document.createElement('div')
                                // the exported image is sized from this div, so it has to hug the plot exactly
                                div.style.width = 'fit-content'
                                // measuring needs layout, so render while attached, then hand the
                                // finished element back for the caller to place
                                document.body.appendChild(div)
                                const plot = renderMeasuredPlot(div, leftAxis => plotConfig(false, leftAxis), false)
                                div.remove()
                                // `display: block` drops the descender gap an inline <svg> would leave underneath
                                plot.style.display = 'block'
                                return div
                            })}
                        </div>
                    )}
        </>
    )
}

export interface PlotSeriesItem {
    shortname: string
    longname: string
    color: string
    subseriesName: string
}

// shared plot shell: title, legend and settings bar from `items`; buildPlot supplies the rest
export function SeriesPlot<T extends PlotSeriesItem>(props: {
    items: T[]
    filenameSuffix: string
    sharedTypeOfAllArticles?: string
    modeSwitcher?: ReactElement
    dashOrder?: string[]
    extraSettingsControls?: ReactNode
    buildPlot: (transpose: boolean, leftLabelOffset: number, pinnedTip: PinnedTipIndex) => DetailedPlotSpec
}): ReactElement {
    const colors = useColors()
    const { items, dashOrder, buildPlot } = props

    const settingsElement = (makePlot: () => HTMLElement): ReactElement => (
        <PlotSettingsBar
            makePlot={makePlot}
            shortnames={props.items.map(i => i.shortname)}
            longnames={props.items.map(i => i.longname)}
            sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
            filenameSuffix={props.filenameSuffix}
            modeSwitcher={props.modeSwitcher}
        >
            {props.extraSettingsControls}
        </PlotSettingsBar>
    )

    const plotSpec = useCallback(
        (transpose: boolean, leftLabelOffset: number, pinnedTip: PinnedTipIndex): DetailedPlotSpec => {
            const title = new Set(items.map(i => i.shortname)).size === 1 ? items[0].shortname : ''
            const { marks, xlabel, ylabel, ydomain, legend } = buildPlot(transpose, leftLabelOffset, pinnedTip)
            marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
            marks.push(...manualLegend(items, transpose, colors, dashOrder))
            return { marks, xlabel, ylabel, ydomain, legend }
        },
        [items, buildPlot, colors, dashOrder],
    )

    return (
        <PlotComponent
            plotSpec={plotSpec}
            settingsElement={settingsElement}
        />
    )
}
