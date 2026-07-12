import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'

import { TemperatureHistogramExtraStat } from './load-article'
import { axisAndGrid, computeDashPatterns, manualLegend, multiSeriesTipTitle, ordinalSeriesMarks, PlotComponent, PlotDownloadButton, transposeAwareTip } from './plots-general'
import { convertValue, unitSuffixFor } from './plots-monthly'

export interface TemperatureHistogramPlotProps {
    shortname: string
    longname: string
    histogram: TemperatureHistogramExtraStat
    color: string
    subseriesName: string
}

interface TipDatum {
    x: number
    label: string
    names: string[]
    values: number[]
}

// boundary j (0 <= j < numBins - 1) sits at temperature binMin + j*binSize. Bucket i's point is
// plotted at x = i - 0.5, i.e. between boundary (i-1) and boundary i -- so the axis only needs to
// label each boundary once (a single temperature), instead of repeating it in adjacent bucket-range labels.
function boundaryLabel(boundaryIdx: number, binMin: number, binSize: number, convert: (v: number) => number, unitSuffix: string): string {
    return `${Math.round(convert(binMin + boundaryIdx * binSize))}${unitSuffix}`
}

// descriptive range for a bucket, used only in the hover tooltip (not on the axis, where
// adjacent buckets' ranges would redundantly repeat the shared boundary value)
function bucketRangeLabel(binIdx: number, binMin: number, binSize: number, convert: (v: number) => number, unitSuffix: string): string {
    const round = (v: number): string => Math.round(convert(v)).toString()
    const lo = binMin + (binIdx - 1) * binSize
    const hi = lo + binSize
    return `${round(lo)}-${round(hi)}${unitSuffix}`
}

export function TemperatureHistogramPlot(props: { histograms: TemperatureHistogramPlotProps[], statDescription: string, modeSwitcher?: ReactElement, dashOrder?: string[] }): ReactNode {
    const [temperatureUnit] = useSetting('temperature_unit')
    const colors = useColors()

    const binMin = props.histograms[0].histogram.binMin
    const binSize = props.histograms[0].histogram.binSize
    const numBins = props.histograms[0].histogram.counts.length
    for (const h of props.histograms) {
        if (h.histogram.binMin !== binMin || h.histogram.binSize !== binSize || h.histogram.counts.length !== numBins) {
            throw new Error('temperature histograms have different binning')
        }
    }
    const unitSuffix = unitSuffixFor('temperature', temperatureUnit)

    const settingsElement = (makePlot: () => HTMLElement): ReactElement => (
        <div
            className="serif"
            style={{
                backgroundColor: colors.background,
                padding: '0.5em',
                border: `1px solid ${colors.textMain}`,
                display: 'flex',
                gap: '0.5em',
            }}
        >
            <PlotDownloadButton makePlot={makePlot} shortnames={props.histograms.map(h => h.shortname)} filenameSuffix="temperature_distribution" />
            {props.modeSwitcher}
        </div>
    )

    const plotSpec = useCallback(
        (transpose: boolean) => {
            // drop the open-ended "below min"/"above max" catch-all buckets (indices 0 and numBins - 1) --
            // they don't have a clean two-sided interval like the rest, which is confusing to plot as a point
            const binIdxs = Array.from({ length: numBins - 2 }, (_, i) => i + 1)
            const pointX = (binIdx: number): number => binIdx - 0.5
            const boundaryIdxs = Array.from({ length: numBins - 1 }, (_, i) => i)
            const boundaryLabels = boundaryIdxs.map(j => boundaryLabel(j, binMin, binSize, v => convertValue(v, 'temperature', temperatureUnit), unitSuffix))
            const seriesData = props.histograms.map((h) => {
                // counts are normalize_to_uint16-scaled (sum to ~2^16), not already-percentages
                const sum = h.histogram.counts.reduce((a, b) => a + b, 0)
                return {
                    h,
                    values: h.histogram.counts.map(c => sum === 0 ? 0 : (c / sum) * 100),
                }
            })

            const [axis, grid] = axisAndGrid(transpose)
            const marks: Plot.Markish[] = [
                axis(boundaryIdxs, { tickFormat: (j: number) => boundaryLabels[j] }),
                grid(boundaryIdxs),
            ]

            const dashPatterns = computeDashPatterns(props.histograms, props.dashOrder)
            marks.push(
                ...ordinalSeriesMarks(
                    seriesData.map(({ h, values }) => ({ series: h, values })),
                    binIdxs,
                    'binIdx',
                    transpose,
                    dashPatterns,
                    pointX,
                ),
            )

            const tipData: TipDatum[] = binIdxs.map(i => ({
                x: pointX(i),
                label: bucketRangeLabel(i, binMin, binSize, v => convertValue(v, 'temperature', temperatureUnit), unitSuffix),
                names: seriesData.map(s => s.h.shortname),
                values: seriesData.map(s => s.values[i]),
            }))
            marks.push(
                transposeAwareTip(
                    tipData,
                    transpose,
                    'x',
                    d => d.values,
                    d => multiSeriesTipTitle(d.label, d.names, d.values, v => `${v.toFixed(1)}%`),
                    colors,
                ),
            )

            const allValues = seriesData.flatMap(s => binIdxs.map(i => s.values[i]))
            const maxValue = Math.max(...allValues)
            const ydomain: [number, number] = [0, maxValue * 1.1]

            const xlabel = `${props.statDescription} (${unitSuffix})`
            const ylabel = '% of days'
            marks.push(...manualLegend(props.histograms, transpose, colors, props.dashOrder))

            return { marks, xlabel, ylabel, ydomain }
        },
        [props.histograms, props.statDescription, binMin, binSize, numBins, temperatureUnit, unitSuffix, colors, props.dashOrder],
    )

    return (
        <PlotComponent
            plotSpec={plotSpec}
            settingsElement={settingsElement}
        />
    )
}
