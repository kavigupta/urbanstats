import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useMemo } from 'react'

// imort Observable plot
import { useColors } from '../page_template/colors'
import { HistogramType, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { IHistogram } from '../utils/protos'

import { PlotComponent } from './plots-general'
import { createScreenshot } from './screenshot'
import { CheckboxSetting } from './sidebar'

const yPad = 0.025

interface HistogramProps {
    shortname: string
    histogram: IHistogram
    color: string
    universeTotal: number
}

export function Histogram(props: { histograms: HistogramProps[] }): ReactNode {
    const [histogramType] = useSetting('histogram_type')
    const [useImperial] = useSetting('use_imperial')
    const [relative] = useSetting('histogram_relative')
    const binMin = props.histograms[0].histogram.binMin!
    const binSize = props.histograms[0].histogram.binSize!
    for (const histogram of props.histograms) {
        if (histogram.histogram.binMin !== binMin || histogram.histogram.binSize !== binSize) {
            throw new Error('histograms have different binMin or binSize')
        }
    }
    const settingsElement = (plotRef: React.RefObject<HTMLDivElement>): ReactElement => (
        <HistogramSettings plotRef={plotRef} shortnames={props.histograms.map(h => h.shortname)} />
    )

    const plotSpec = useMemo(
        () => {
            const title = props.histograms.length === 1 ? props.histograms[0].shortname : ''
            const colors = props.histograms.map(h => h.color)
            const shortnames = props.histograms.map(h => h.shortname)
            const renderY = relative ? (y: number) => `${y.toFixed(2)}%` : (y: number) => renderNumberHighlyRounded(y, 2)

            const [xIdxStart, xIdxEnd] = histogramBounds(props.histograms)
            const xidxs = Array.from({ length: xIdxEnd - xIdxStart }, (_, i) => i + xIdxStart)
            const [xAxisMarks, renderX] = xAxis(xidxs, binSize, binMin, useImperial)
            const [marks, maxValue] = createHistogramMarks(props.histograms, xidxs, histogramType, relative, renderX, renderY)
            marks.push(
                ...xAxisMarks,
                ...yAxis(maxValue),
            )
            marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
            const xlabel = `Density (/${useImperial ? 'mi' : 'km'}²)`
            const ylabel = relative ? '% of total' : 'Population'
            const ydomain: [number, number] = [maxValue * (-yPad), maxValue * (1 + yPad)]
            const legend = props.histograms.length === 1
                ? undefined
                : { legend: true, range: colors, domain: shortnames }
            return { marks, xlabel, ylabel, ydomain, legend }
        },
        [props.histograms, binMin, binSize, relative, histogramType, useImperial],
    )

    return (
        <PlotComponent
            plotSpec={plotSpec}
            settingsElement={settingsElement}
        />
    )
}

function HistogramSettings(props: {
    shortnames: string[]
    plotRef: React.RefObject<HTMLDivElement>
}): ReactNode {
    const universe = useUniverse()
    const [histogramType, setHistogramType] = useSetting('histogram_type')
    const colors = useColors()
    // dropdown for histogram type
    return (
        <div
            className="serif"
            style={{
                backgroundColor: colors.background, padding: '0.5em', border: `1px solid ${colors.textMain}`,
                display: 'flex', gap: '0.5em',
            }}
        >
            <img
                src="/download.png"
                onClick={() => {
                    if (props.plotRef.current) {
                        void createScreenshot(
                            {
                                path: `${props.shortnames.join('_')}_histogram`,
                                overallWidth: props.plotRef.current.offsetWidth * 2,
                                elementsToRender: [props.plotRef.current],
                                heightMultiplier: 1.2,
                            },
                            universe,
                            colors,
                        )
                    }
                }}
                width="20"
                height="20"
            />
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
            <CheckboxSetting name="Relative Histograms" settingKey="histogram_relative" testId="histogram_relative" />
        </div>
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

function xAxis(xidxs: number[], binSize: number, binMin: number, useImperial: boolean): [Plot.Markish[], (x: number) => string] {
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
    return [
        [
            Plot.axisX(xKeypoints, { tickFormat: d => renderPow10(d * binSize + binMin + adjustment) }),
            Plot.gridX(xKeypoints),
        ],
        x => `${renderNumberHighlyRounded(Math.pow(10, x * binSize + binMin + adjustment), 2)}/${useImperial ? 'mi' : 'km'}²`,
    ]
}

function yAxis(maxValue: number): (Plot.CompoundMark | Plot.RuleY)[] {
    const minNYTicks = 5
    const idealTickGap = maxValue / minNYTicks
    const log10TickGapTimes3 = Math.floor(Math.log10(idealTickGap) * 3)
    const tickGapOom = Math.pow(10, Math.floor(log10TickGapTimes3 / 3))
    const tickGapMantissa = log10TickGapTimes3 % 3 === 0 ? 1 : log10TickGapTimes3 % 3 === 1 ? 2 : 5
    const tickGap = tickGapMantissa * tickGapOom
    const maxValueRounded = Math.ceil(maxValue / tickGap) * tickGap
    const yKeypoints = Array.from({ length: Math.floor(maxValueRounded / tickGap) + 1 }, (_, i) => i * tickGap)

    return [
        Plot.axisY(yKeypoints, { tickFormat: (d: number) => renderNumberHighlyRounded(d, 1) }),
        Plot.gridY(yKeypoints),
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
): [Plot.Markish[], number] {
    const series = mulitipleSeriesConsistentLength(histograms, xidxs, relative, histogramType === 'Line (cumulative)')
    const seriesSingle = dovetailSequences(series)

    const maxValue = Math.max(...series.map(s => Math.max(...s.values.map(v => v.y))))
    const tip = Plot.tip(maxSequences(series), Plot.pointerX({
        x: 'xidx', y: 'y',
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
    }))
    const color = histograms.length === 1 ? histograms[0].color : 'name'
    const marks: Plot.Markish[] = []
    if (histogramType === 'Line' || histogramType === 'Line (cumulative)') {
        marks.push(
            ...series.map(s => Plot.line(s.values, {
                x: 'xidx', y: 'y', stroke: color, strokeWidth: 4,
            })),
        )
    }
    else {
        marks.push(
            Plot.rectY(seriesSingle, {
                x1: 'xidx_left',
                x2: 'xidx_right',
                y: 'y',
                fill: color,
            }),
        )
    }
    marks.push(tip)
    return [marks, maxValue]
}
