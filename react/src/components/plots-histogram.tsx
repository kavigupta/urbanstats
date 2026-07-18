import * as Plot from '@observablehq/plot'
import React, { ReactNode, useCallback } from 'react'

// imort Observable plot
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { HistogramType, useSetting } from '../page_template/settings'
import { IHistogram } from '../utils/protos'
import { useTranspose } from '../utils/transpose'

import { axisAndGrid, computeDashPatterns, DetailedPlotSpec, multiSeriesTipTitle, paddedYDomain, SeriesPlot, transposeAwareTip } from './plots-general'
import { CheckboxSetting } from './sidebar'

const yPad = 0.025

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

export function Histogram(props: { histograms: HistogramProps[], statDescription: string, sharedTypeOfAllArticles?: string, dashOrder?: string[] }): ReactNode {
    const [histogramTypeRaw, setHistogramType] = useSetting('histogram_type')
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
    const systemColors = useColors()
    const isTransposed = useTranspose()

    const buildPlot = useCallback(
        (transpose: boolean): DetailedPlotSpec => {
            const renderY = relative ? (y: number) => `${y.toFixed(2)}%` : (y: number) => renderNumberHighlyRounded(y, 2)

            const [xIdxStart, xIdxEnd] = histogramBounds(props.histograms)
            const xidxs = Array.from({ length: xIdxEnd - xIdxStart }, (_, i) => i + xIdxStart)
            const [xAxisMarks, renderX] = xAxis(xidxs, binSize, binMin, useImperial, transpose)
            const [marks, values] = createHistogramMarks(props.histograms, xidxs, histogramType, relative, renderX, renderY, transpose, systemColors, props.dashOrder)
            const maxValue = Math.max(...values)
            marks.push(
                ...xAxisMarks,
                ...yAxis(maxValue, transpose),
            )
            const xlabel = `${props.statDescription} (/${useImperial ? 'mi' : 'km'}²)`
            const ylabel = relative ? '% of total' : 'Population'
            const ydomain = paddedYDomain(values, yPad)
            return { marks, xlabel, ylabel, ydomain }
        },
        [props.histograms, binMin, binSize, relative, histogramType, useImperial, systemColors, props.statDescription, props.dashOrder],
    )

    const extraSettingsControls = (
        <>
            <select
                value={histogramTypeRaw}
                style={{ backgroundColor: systemColors.background, color: systemColors.textMain }}
                onChange={(e) => { setHistogramType(e.target.value as HistogramType) }}
                className="serif"
                data-test-id="histogram_type"
            >
                <option value="Line">Line</option>
                <option value="Line (cumulative)">Line (cumulative)</option>
                <option value="Bar">Bar</option>
            </select>
            <CheckboxSetting name={isTransposed ? 'Relative' : 'Relative Histograms'} settingKey="histogram_relative" testId="histogram_relative" />
        </>
    )

    return (
        <SeriesPlot
            items={props.histograms}
            filenameSuffix="histogram"
            sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
            dashOrder={props.dashOrder}
            extraSettingsControls={extraSettingsControls}
            buildPlot={buildPlot}
        />
    )
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

    const [axis, grid] = axisAndGrid(transpose)
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

    // yAxis picks the visual-y-axis constructors, the inverse of xAxis's visual-x-axis pairing
    const [axis, grid] = axisAndGrid(!transpose)

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
    dashOrder?: string[],
): [Plot.Markish[], number[]] {
    const series = mulitipleSeriesConsistentLength(histograms, xidxs, relative, histogramType === 'Line (cumulative)')
    const seriesSingle = dovetailSequences(series)

    const values = series.flatMap(s => s.values.map(v => v.y))
    const tip = transposeAwareTip(
        maxSequences(series),
        transpose,
        'xidx',
        d => d.ys,
        d => multiSeriesTipTitle(`Density: ${renderX(d.xidx)}`, d.names, d.ys, renderY, 'Frequency'),
        colors,
    )
    const marks: Plot.Markish[] = []
    if (histogramType === 'Line' || histogramType === 'Line (cumulative)') {
        const dashPatterns = computeDashPatterns(histograms, dashOrder)
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
    return [marks, values]
}
