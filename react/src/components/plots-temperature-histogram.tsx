import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { convertTemperature } from '../utils/unit'

import { TemperatureHistogramExtraStat } from './load-article'
import { axisAndGrid, computeDashPatterns, manualLegend, multiSeriesTipTitle, ordinalSeriesMarks, PlotComponent, PlotSettingsBar, transposeAwareTip, valueGrid } from './plots-general'
import { boundaryLabel, bucketRangeLabel, temperatureHistogramBounds } from './plots-temperature-histogram-bins'

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

export function TemperatureHistogramPlot(props: { histograms: TemperatureHistogramPlotProps[], statDescription: string, sharedTypeOfAllArticles?: string, modeSwitcher?: ReactElement, dashOrder?: string[] }): ReactNode {
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
    const unitSuffix = convertTemperature(binMin, temperatureUnit).unit

    const settingsElement = (makePlot: () => HTMLElement): ReactElement => (
        <PlotSettingsBar
            makePlot={makePlot}
            shortnames={props.histograms.map(h => h.shortname)}
            longnames={props.histograms.map(h => h.longname)}
            sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
            filenameSuffix="temperature_distribution"
            modeSwitcher={props.modeSwitcher}
        />
    )

    const plotSpec = useCallback(
        (transpose: boolean) => {
            // drop the open-ended "below min"/"above max" catch-all buckets (indices 0 and numBins - 1) --
            // they don't have a clean two-sided interval like the rest, which is confusing to plot as a point --
            // and clip further to the bins that actually have data (plus one bin of padding)
            const [binIdxStart, binIdxEnd] = temperatureHistogramBounds(props.histograms.map(h => h.histogram.counts), numBins)
            const binIdxs = Array.from({ length: binIdxEnd - binIdxStart + 1 }, (_, i) => i + binIdxStart)
            const pointX = (binIdx: number): number => binIdx - 0.5
            const boundaryIdxs = Array.from({ length: binIdxEnd - binIdxStart + 2 }, (_, i) => i + binIdxStart - 1)
            const title = new Set(props.histograms.map(h => h.shortname)).size === 1 ? props.histograms[0].shortname : ''
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
                axis(boundaryIdxs, { tickFormat: (j: number) => boundaryLabel(j, binMin, binSize, v => convertTemperature(v, temperatureUnit).value, unitSuffix) }),
                grid(boundaryIdxs),
                valueGrid(transpose)(),
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
                label: bucketRangeLabel(i, binMin, binSize, v => convertTemperature(v, temperatureUnit).value, unitSuffix),
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

            marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
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
