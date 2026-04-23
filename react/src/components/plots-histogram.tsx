import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback, useContext, useMemo, useState } from 'react'

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

import { percentileText } from './display-stats'
import { PlotComponent } from './plots-general'
import { approximateHistogramPercentile, renderHistogramValue, renderNumberHighlyRounded } from './plots-histogram-utils'
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

interface PercentileMarker {
    xidx: number
    color: string
    label: string
    histogram: IHistogram
    universeTotal: number
}

interface PercentileResult {
    shortname: string
    xidx: number
    valueText: string
    color: string
    histogramData: IHistogram
    universeTotal: number
}

function hasMultipleSubseries(histograms: HistogramProps[]): boolean {
    return new Set<string>(histograms.map(h => h.subseriesName)).size > 1
}

function processHistogramType(histogramType: HistogramType, histograms: HistogramProps[]): HistogramType {
    if (histogramType !== 'Bar') {
        return histogramType
    }
    if (hasMultipleSubseries(histograms)) {
        return 'Line'
    }
    return histogramType
}

export function Histogram(props: { histograms: HistogramProps[], statDescription: string, sharedTypeOfAllArticles?: string }): ReactNode {
    const [histogramTypeRaw] = useSetting('histogram_type')
    const histogramType = processHistogramType(histogramTypeRaw, props.histograms)
    const [useImperial] = useSetting('use_imperial')
    const [relative] = useSetting('histogram_relative')
    const [percentileInput, setPercentileInput] = useState('')
    const binMin = props.histograms[0].histogram.binMin!
    const binSize = props.histograms[0].histogram.binSize!
    for (const histogram of props.histograms) {
        if (histogram.histogram.binMin !== binMin || histogram.histogram.binSize !== binSize) {
            throw new Error('histograms have different binMin or binSize')
        }
    }
    const includeSubseriesInSeriesName = hasMultipleSubseries(props.histograms)
    const percentile = percentileInput === '' ? undefined : Number(percentileInput)
    const validPercentile = percentile !== undefined && !Number.isNaN(percentile) && percentile >= 0 && percentile <= 100
    const percentileAnnotation = validPercentile ? percentileText(percentile, false) : undefined
    const percentileMarkers = useMemo(() => {
        if (!validPercentile) {
            return []
        }
        const results = props.histograms
            .map((histogram) => {
                const xidx = approximateHistogramPercentile(histogram.histogram, percentile)
                if (Number.isNaN(xidx)) {
                    return undefined
                }
                return {
                    shortname: seriesDisplayName(histogram, includeSubseriesInSeriesName),
                    xidx,
                    valueText: renderHistogramValue(xidx, binSize, binMin, useImperial),
                    color: histogram.color,
                    histogramData: histogram.histogram,
                    universeTotal: histogram.universeTotal,
                }
            })
            .filter((r): r is PercentileResult => r !== undefined)
        return results.map(result => ({
            xidx: result.xidx,
            color: result.color,
            label: `${result.shortname}: ${result.valueText}`,
            histogram: result.histogramData,
            universeTotal: result.universeTotal,
        }))
    }, [validPercentile, percentile, props.histograms, binSize, binMin, useImperial, includeSubseriesInSeriesName])
    const settingsElement = (makePlot: () => HTMLElement): ReactElement => (
        <HistogramSettings
            makePlot={makePlot}
            shortnames={props.histograms.map(h => h.shortname)}
            longnames={props.histograms.map(h => h.longname)}
            sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
            percentileInput={percentileInput}
            setPercentileInput={setPercentileInput}
        />
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
            marks.push(...createPercentileMarks(percentileMarkers, transpose, systemColors, relative))
            marks.push(
                ...xAxisMarks,
                ...yAxis(maxValue, transpose),
            )
            marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
            const xlabel = `${props.statDescription} (/${useImperial ? 'mi' : 'km'}²)`
            const ylabel = relative ? '% of total' : 'Population'
            const ydomain: [number, number] = [maxValue * (-yPad), maxValue * (1 + yPad)]
            marks.push(...manualLegend(props.histograms, transpose, colors, shortnames, systemColors, percentileAnnotation))
            return { marks, xlabel, ylabel, ydomain }
        },
        [props.histograms, binMin, binSize, relative, histogramType, useImperial, systemColors, props.statDescription, percentileMarkers, percentileAnnotation],
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

function seriesDisplayName(histogram: HistogramProps, includeSubseriesName: boolean): string {
    return includeSubseriesName && histogram.subseriesName !== ''
        ? `${histogram.shortname} ${histogram.subseriesName}`
        : histogram.shortname
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

function manualLegend(
    histograms: HistogramProps[],
    transpose: boolean,
    colors: string[],
    shortnames: string[],
    themeColors: Colors,
    percentileAnnotation?: string,
): Plot.Markish[] {
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

    const percentileLegendRows = percentileAnnotation === undefined ? 0 : 1
    const totalItems = colorItems.length + dashPatternItems.length + percentileLegendRows
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
        const allLabels = [
            ...colorItems.map(item => item.label),
            ...dashPatternItems.map(item => item.label),
            ...(percentileAnnotation === undefined ? [] : [percentileAnnotation]),
        ]
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

        if (percentileAnnotation !== undefined) {
            const row = document.createElementNS(svgNS, 'g')
            row.setAttribute('transform', `translate(${paddingX} ${paddingY + rowHeight * rowIndex})`)

            const centerY = rowHeight / 2
            const lineX = lineLength / 2

            const line = document.createElementNS(svgNS, 'line')
            line.setAttribute('x1', String(lineX))
            line.setAttribute('x2', String(lineX))
            line.setAttribute('y1', String(centerY - 7))
            line.setAttribute('y2', String(centerY + 7))
            line.setAttribute('stroke', themeColors.textMain)
            line.setAttribute('stroke-width', '2')
            row.appendChild(line)

            const dot = document.createElementNS(svgNS, 'circle')
            dot.setAttribute('cx', String(lineX))
            dot.setAttribute('cy', String(centerY))
            dot.setAttribute('r', '3')
            dot.setAttribute('fill', themeColors.textMain)
            dot.setAttribute('stroke', themeColors.slightlyDifferentBackground)
            dot.setAttribute('stroke-width', '1')
            row.appendChild(dot)

            const text = document.createElementNS(svgNS, 'text')
            text.setAttribute('x', String(lineLength + 10))
            text.setAttribute('y', String(centerY))
            text.setAttribute('font-size', `${fontSize}px`)
            text.setAttribute('fill', themeColors.textMain)
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('text-anchor', 'start')
            text.textContent = percentileAnnotation
            row.appendChild(text)

            group.appendChild(row)
        }

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
    percentileInput: string
    setPercentileInput: (value: string) => void
}): ReactNode {
    const universe = useUniverse()
    const [histogramType, setHistogramType] = useSetting('histogram_type')
    const colors = useColors()
    const transpose = useTranspose()
    const navContext = useContext(Navigator.Context)
    const [showSearchBox, setShowSearchBox] = useState(false)
    const [showPercentileBox, setShowPercentileBox] = useState(false)

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
                        () => undefined,
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
            <div style={{ position: 'relative' }}>
                <img
                    src="/percentile.png"
                    onClick={() => { setShowPercentileBox(!showPercentileBox) }}
                    width="20"
                    height="20"
                    style={{ cursor: 'pointer' }}
                    title="Look up percentile"
                />
                {showPercentileBox && (
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
                            minWidth: '180px',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
                            <label htmlFor="histogram-percentile-popup-input" style={{ fontSize: '0.9em' }}>
                                Look up percentile
                            </label>
                            <input
                                id="histogram-percentile-popup-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={props.percentileInput}
                                onChange={(e) => { props.setPercentileInput(e.target.value) }}
                                autoFocus={true}
                                style={{
                                    width: '100%',
                                    backgroundColor: colors.background,
                                    color: colors.textMain,
                                    border: `1px solid ${colors.textMain}`,
                                    borderRadius: '4px',
                                    padding: '0.35em',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
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
    let axis = Plot.axisX
    let grid = Plot.gridX
    if (transpose) {
        axis = Plot.axisY
        grid = Plot.gridY
    }
    return [
        [
            axis(xKeypoints, { tickFormat: d => renderPow10(d * binSize + binMin + (useImperial ? Math.log10(1.60934) * 2 : 0)) }),
            grid(xKeypoints),
        ],
        x => renderHistogramValue(x, binSize, binMin, useImperial),
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

function createPercentileMarks(
    percentileMarkers: PercentileMarker[],
    transpose: boolean,
    themeColors: Colors,
    relative: boolean,
): Plot.Markish[] {
    if (percentileMarkers.length === 0) {
        return []
    }

    // Create marks for each marker
    return percentileMarkers.flatMap((marker) => {
        const xidxFloor = Math.floor(marker.xidx)
        const xidxCeil = Math.ceil(marker.xidx)
        const fraction = marker.xidx - xidxFloor
        const counts = marker.histogram.counts ?? []
        const y1 = counts[xidxFloor] ?? 0
        const y2 = counts[xidxCeil] ?? 0
        const rawYValue = y1 + (y2 - y1) * fraction

        // Normalize y-value using the same formula as histogram marks
        const sumCounts = counts.reduce((a, b) => a + b, 0)
        const normalizedCount = sumCounts > 0 ? rawYValue / sumCounts : 0
        // Scale by universeTotal (absolute) or 100 (relative)
        const yValue = normalizedCount * (relative ? 100 : marker.universeTotal)

        const dotPoint = transpose
            ? { x: yValue, y: marker.xidx }
            : { x: marker.xidx, y: yValue }
        const labelPoint = transpose
            ? { x: yValue, y: marker.xidx, label: marker.label }
            : { x: marker.xidx, y: yValue, label: marker.label }

        return [
            transpose
                ? Plot.ruleY([marker.xidx], { stroke: marker.color, strokeWidth: 2, strokeOpacity: 0.8 })
                : Plot.ruleX([marker.xidx], { stroke: marker.color, strokeWidth: 2, strokeOpacity: 0.8 }),
            Plot.dot([dotPoint], {
                x: 'x',
                y: 'y',
                fill: marker.color,
                stroke: themeColors.background,
                r: 4,
            }),
            Plot.text([labelPoint], {
                x: 'x',
                y: 'y',
                text: 'label',
                fill: marker.color,
                fontSize: 11,
                textAnchor: transpose ? 'start' : 'middle',
                dx: transpose ? 6 : 0,
                dy: transpose ? 0 : -8,
            }),
        ] as Plot.Markish[]
    })
}
