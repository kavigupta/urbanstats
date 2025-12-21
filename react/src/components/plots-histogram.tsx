import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback, useContext, useState } from 'react'

// imort Observable plot
import { Navigator } from '../navigation/Navigator'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { HistogramType, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { IHistogram } from '../utils/protos'
import { useTranspose } from '../utils/transpose'
import { zIndex } from '../utils/zIndex'

import { PlotComponent } from './plots-general'
import { createScreenshot } from './screenshot'
import { SearchBox } from './search'
import { CheckboxSetting } from './sidebar'

const yPad = 0.025

const strokeDasharrays = ['1,0', '10,10', '2,5']

interface HistogramProps {
    shortname: string
    longname: string
    histogram: IHistogram
    color: string
    universeTotal: number
    subseriesName: string
}

function processHistogramType(histogramType: HistogramType, histograms: HistogramProps[]): HistogramType {
    if (histogramType !== 'Bar') {
        return histogramType
    }
    const subseriesNames = new Set<string>(histograms.map(h => h.subseriesName))
    if (subseriesNames.size > 1) {
        return 'Line'
    }
    return histogramType
}

export function Histogram(props: { histograms: HistogramProps[], statDescription: string, sharedTypeOfAllArticles?: string }): ReactNode {
    const [histogramTypeRaw] = useSetting('histogram_type')
    const histogramType = processHistogramType(histogramTypeRaw, props.histograms)
    const [useImperial] = useSetting('use_imperial')
    const [relative] = useSetting('histogram_relative')
    const binMin = props.histograms[0].histogram.binMin!
    const binSize = props.histograms[0].histogram.binSize!
    for (const histogram of props.histograms) {
        if (histogram.histogram.binMin !== binMin || histogram.histogram.binSize !== binSize) {
            throw new Error('histograms have different binMin or binSize')
        }
    }
    const settingsElement = (makePlot: () => HTMLElement): ReactElement => (
        <HistogramSettings makePlot={makePlot} shortnames={props.histograms.map(h => h.shortname)} longnames={props.histograms.map(h => h.longname)} sharedTypeOfAllArticles={props.sharedTypeOfAllArticles} />
    )

    const systemColors = useColors()

    const plotSpec = useCallback(
        (transpose: boolean) => {
            const title = new Set(props.histograms.map(h => h.shortname)).size === 1 ? props.histograms[0].shortname : ''
            const colors = props.histograms.map(h => h.color)
            const shortnames = props.histograms.map(h => h.shortname)
            const renderY = relative ? (y: number) => `${y.toFixed(2)}%` : (y: number) => renderNumberHighlyRounded(y, 2)

            const [xIdxStart, xIdxEnd] = histogramBounds(props.histograms)
            const xidxs = Array.from({ length: xIdxEnd - xIdxStart }, (_, i) => i + xIdxStart)
            const [xAxisMarks, renderX] = xAxis(xidxs, binSize, binMin, useImperial, transpose)
            const [marks, maxValue] = createHistogramMarks(props.histograms, xidxs, histogramType, relative, renderX, renderY, transpose, systemColors)
            marks.push(
                ...xAxisMarks,
                ...yAxis(maxValue, transpose),
            )
            marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
            const xlabel = `${props.statDescription} (/${useImperial ? 'mi' : 'km'}²)`
            const ylabel = relative ? '% of total' : 'Population'
            const ydomain: [number, number] = [maxValue * (-yPad), maxValue * (1 + yPad)]
            marks.push(...manualLegend(props.histograms, transpose, colors, shortnames, systemColors))
            return { marks, xlabel, ylabel, ydomain }
        },
        [props.histograms, binMin, binSize, relative, histogramType, useImperial, systemColors, props.statDescription],
    )

    return (
        <PlotComponent
            plotSpec={plotSpec}
            settingsElement={settingsElement}
        />
    )
}

function computeColorItems(shortnames: string[], colors: string[]): { label: string, color: string }[] {
    const colorItems: { label: string, color: string }[] = []
    for (let i = 0; i < shortnames.length; i++) {
        // handles duplicate names by just putting them all in if they're different colors
        const index = colorItems.findIndex(item => item.label === shortnames[i] && item.color === colors[i])
        if (index === -1) {
            colorItems.push({
                label: shortnames[i],
                color: colors[i],
            })
        }
    }
    if (colorItems.length <= 1) {
        return []
    }
    return colorItems
}

function computeDashPatterns(histograms: HistogramProps[]): Map<string, { pattern: string, name: string }> {
    const dashPatterns = new Map<string, { pattern: string, name: string }>()
    const subseriesNames = new Set<string>()
    histograms.forEach((histogram) => {
        subseriesNames.add(histogram.subseriesName)
    })
    const subseriesNamesOrdered = Array.from(subseriesNames).sort()
    assert(subseriesNamesOrdered.length <= strokeDasharrays.length, 'Too many subseries for dash patterns')
    histograms.forEach((histogram) => {
        const subId = subseriesNamesOrdered.indexOf(histogram.subseriesName)
        if (!dashPatterns.has(histogram.subseriesName)) {
            dashPatterns.set(histogram.subseriesName, {
                pattern: strokeDasharrays[subseriesNamesOrdered.length - 1 - subId],
                name: histogram.subseriesName,
            })
        }
    })
    return dashPatterns
}

function manualLegend(histograms: HistogramProps[], transpose: boolean, colors: string[], shortnames: string[], themeColors: Colors): Plot.Markish[] {
    const colorItems = computeColorItems(shortnames, colors)

    const dashPatterns = computeDashPatterns(histograms)

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

export const transposeSettingsHeight = 30.5

function HistogramSettings(props: {
    shortnames: string[]
    longnames: string[]
    makePlot: () => HTMLElement
    sharedTypeOfAllArticles?: string
}): ReactNode {
    const universe = useUniverse()
    const [histogramType, setHistogramType] = useSetting('histogram_type')
    const colors = useColors()
    const transpose = useTranspose()
    const navContext = useContext(Navigator.Context)
    const [showSearchBox, setShowSearchBox] = useState(false)

    // dropdown for histogram type
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
            <img
                src="/download.png"
                onClick={async () => {
                    const plot = props.makePlot()
                    document.body.appendChild(plot)
                    const uniqueShortnames = deduplicate(props.shortnames)
                    await createScreenshot(
                        {
                            path: `${uniqueShortnames.join('_')}_histogram`,
                            overallWidth: plot.offsetWidth * 2,
                            elementsToRender: [plot],
                            heightMultiplier: 1.2,
                        },
                        universe,
                        colors,
                    )
                    plot.remove()
                }}
                width="20"
                height="20"
            />
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
                            link={(regionName) => {
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
            <select
                value={histogramType}
                style={{ backgroundColor: colors.background, color: colors.textMain }}
                onChange={(e) => { setHistogramType(e.target.value as HistogramType) }}
                className="serif"
                data-test-id="histogram_type"
            >
                <option value="Line">Line</option>
                <option value="Line (cumulative)">Line (cumulative)</option>
                <option value="Bar">Bar</option>
            </select>
            <CheckboxSetting name={transpose ? 'Relative' : 'Relative Histograms'} settingKey="histogram_relative" testId="histogram_relative" />
        </div>
    )
}

function deduplicate(arr: string[]): string[] {
    return Array.from(new Set(arr))
}

function histogramBounds(histograms: HistogramProps[]): [number, number] {
    let xIdxEnd = Math.max(...histograms.map(histogram => histogram.histogram.counts!.length))
    xIdxEnd += 1
    const zerosAtFront = (arr: number[]): number => {
        let i = 0
        while (i < arr.length && arr[i] === 0) {
            i++
        }
        return i
    }
    let xIdxStart = Math.min(...histograms.map(histogram => zerosAtFront(histogram.histogram.counts!)))

    if (xIdxStart > 0) {
        xIdxStart--
    }

    // round x_idx_start down to the nearest number which, when divided by 10, has a remainder of 0, 3, or 7

    while (xIdxStart % 10 !== 0 && xIdxStart % 10 !== 3 && xIdxStart % 10 !== 7) {
        xIdxStart--
    }

    // same for x_idx_end
    while (xIdxEnd % 10 !== 0 && xIdxEnd % 10 !== 3 && xIdxEnd % 10 !== 7) {
        xIdxEnd++
    }

    return [xIdxStart, xIdxEnd]
}

interface Series {
    values: { name: string, xidx: number, y: number }[]
    color: string
    subseriesName: string
}

function mulitipleSeriesConsistentLength(histograms: HistogramProps[], xidxs: number[], relative: boolean, isCumulative: boolean): Series[] {
    // Create a list of series, each with the same length
    const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0)
    const sumEach = histograms.map(histogram => sum(histogram.histogram.counts!))
    const series = histograms.map((histogram, histogramIdx) => {
        const counts = [...histogram.histogram.counts!]
        const afterVal = 0
        if (isCumulative) {
            for (let i = counts.length - 2; i >= 0; i--) {
                counts[i] += counts[i + 1]
            }
        }
        return {
            values: xidxs.map(xidx => ({
                name: histogram.shortname,
                xidx,
                y: (
                    xidx >= counts.length
                        ? afterVal
                        : counts[xidx] / sumEach[histogramIdx]
                ) * (relative ? 100 : histogram.universeTotal),
            })),
            color: histogram.color,
            subseriesName: histogram.subseriesName,
        }
    })
    return series
}

function dovetailSequences(series: { values: { xidx: number, y: number, name: string }[], color: string }[]): { xidxLeft: number, xidxRight: number, y: number, color: string }[] {
    const seriesSingle: { xidxLeft: number, xidxRight: number, y: number, color: string }[] = []
    for (let i = 0; i < series.length; i++) {
        const s = series[i]
        const width = 1 / (series.length) * 0.8
        const off = (i - (series.length - 1) / 2) * width
        seriesSingle.push(...s.values
            .map(v => ({
                xidxLeft: v.xidx + off, xidxRight: v.xidx + off + width,
                y: v.y, color: s.color, name: v.name,
            })),
        )
    }
    return seriesSingle
}

function maxSequences(series: { values: { xidx: number, y: number, name: string }[] }[]): { xidx: number, y: number, names: string[], ys: number[] }[] {
    const seriesMax: { xidx: number, y: number, names: string[], ys: number[] }[] = []
    for (let i = 0; i < series[0].values.length; i++) {
        seriesMax.push({
            xidx: series[0].values[i].xidx,
            y: Math.max(...series.map(s => s.values[i].y)),
            names: series.map(s => s.values[i].name),
            ys: series.map(s => s.values[i].y),
        })
    }
    return seriesMax
}

function xAxis(xidxs: number[], binSize: number, binMin: number, useImperial: boolean, transpose: boolean): [Plot.Markish[], (x: number) => string] {
    const xKeypoints: number[] = []
    for (const xidx of xidxs) {
        let lastDigit = xidx % 10
        if (useImperial) {
            lastDigit = (lastDigit + 4) % 10
        }
        if (lastDigit === 0 || lastDigit === 3 || lastDigit === 7) {
            xKeypoints.push(xidx)
        }
    }
    const adjustment = useImperial ? Math.log10(1.60934) * 2 : 0

    let axis = Plot.axisX
    let grid = Plot.gridX
    if (transpose) {
        axis = Plot.axisY
        grid = Plot.gridY
    }
    return [
        [
            axis(xKeypoints, { tickFormat: d => renderPow10(d * binSize + binMin + adjustment) }),
            grid(xKeypoints),
        ],
        x => `${renderNumberHighlyRounded(Math.pow(10, x * binSize + binMin + adjustment), 2)}/${useImperial ? 'mi' : 'km'}²`,
    ]
}

function yAxis(maxValue: number, transpose: boolean): (Plot.CompoundMark | Plot.RuleY)[] {
    const minNYTicks = 5
    const idealTickGap = maxValue / minNYTicks
    const log10TickGapTimes3 = Math.floor(Math.log10(idealTickGap) * 3)
    const tickGapOom = Math.pow(10, Math.floor(log10TickGapTimes3 / 3))
    const tickGapMantissa = log10TickGapTimes3 % 3 === 0 ? 1 : log10TickGapTimes3 % 3 === 1 ? 2 : 5
    const tickGap = tickGapMantissa * tickGapOom
    const maxValueRounded = Math.ceil(maxValue / tickGap) * tickGap
    const yKeypoints = Array.from({ length: Math.floor(maxValueRounded / tickGap) + 1 }, (_, i) => i * tickGap)
        .filter((_, i) => !transpose || i % 2 === 0) // If transpose, remove every other keypoint

    let axis = Plot.axisY
    let grid = Plot.gridY
    if (transpose) {
        axis = Plot.axisX
        grid = Plot.gridX
    }

    return [
        axis(yKeypoints, { tickFormat: (d: number) => renderNumberHighlyRounded(d, 1) }),
        grid(yKeypoints),
    ]
}

function pow10Moral(x: number): number {
    // 10 ** x, but "morally" so, i.e., 10 ** 0.3 = 2
    if (x < 0) {
        return 1 / pow10Moral(-x)
    }
    if (x >= 1) {
        return 10 ** Math.floor(x) * pow10Moral(x - Math.floor(x))
    }
    const x10 = x * 10
    const errorRound = Math.abs(x10 - Math.round(x10))
    if (errorRound > 0.2) {
        return 10 ** x
    }
    if (Math.round(x10) === 0) {
        return 1
    }
    if (Math.round(x10) === 3) {
        return 2
    }
    if (Math.round(x10) === 7) {
        return 5
    }
    return 10 ** x
}

function renderPow10(x: number): string {
    const p10 = pow10Moral(x)

    return renderNumberHighlyRounded(p10)
}

function renderNumberHighlyRounded(x: number, places = 0): string {
    if (x < 1000) {
        return x.toFixed(0)
    }
    if (x < 1e6) {
        return `${(x / 1e3).toFixed(places)}k`
    }
    if (x < 1e9) {
        return `${(x / 1e6).toFixed(places)}M`
    }
    if (x < 1e12) {
        return `${(x / 1e9).toFixed(places)}B`
    }
    return x.toExponential(1)
}

function createHistogramMarks(
    histograms: HistogramProps[], xidxs: number[],
    histogramType: HistogramType, relative: boolean,
    renderX: (x: number) => string,
    renderY: (y: number) => string,
    transpose: boolean,
    colors: Colors,
): [Plot.Markish[], number] {
    const series = mulitipleSeriesConsistentLength(histograms, xidxs, relative, histogramType === 'Line (cumulative)')
    const seriesSingle = dovetailSequences(series)

    const maxValue = Math.max(...series.map(s => Math.max(...s.values.map(v => v.y))))
    const tip = Plot.tip(
        maxSequences(series),
        (transpose ? Plot.pointerY : Plot.pointerX)({
            x: transpose ? 'y' : 'xidx',
            y: transpose ? 'xidx' : 'y',
            title: (d: { names: string[], xidx: number, ys: number[] }) => {
                let result = `Density: ${renderX(d.xidx)}\n`
                if (d.names.length > 1) {
                    result += d.names.map((name: string, i: number) => `${name}: ${renderY(d.ys[i])}`).join('\n')
                }
                else {
                    result += `Frequency: ${renderY(d.ys[0])}`
                }
                return result
            },
            fill: colors.slightlyDifferentBackground,
            stroke: colors.borderNonShadow,
            textColor: colors.textMain,
        }),
    )
    const marks: Plot.Markish[] = []
    if (histogramType === 'Line' || histogramType === 'Line (cumulative)') {
        const dashPatterns = computeDashPatterns(histograms)
        marks.push(
            ...series.map((s) => {
                const strokeDasharray = dashPatterns.size > 1 ? dashPatterns.get(s.subseriesName)?.pattern : undefined
                return Plot.line(s.values, {
                    x: transpose ? 'y' : 'xidx', y: transpose ? 'xidx' : 'y', stroke: s.color,
                    strokeWidth: strokeDasharray !== undefined ? 2 : 4,
                    strokeDasharray,
                })
            }),
        )
    }
    else {
        marks.push(
            (transpose
                ? Plot.rectX(seriesSingle, {
                    y1: 'xidxLeft',
                    y2: 'xidxRight',
                    x: 'y',
                    fill: 'color',
                })
                : Plot.rectY(seriesSingle, {
                    x1: 'xidxLeft',
                    x2: 'xidxRight',
                    y: 'y',
                    fill: 'color',
                })),
        )
    }
    marks.push(tip)
    return [marks, maxValue]
}
