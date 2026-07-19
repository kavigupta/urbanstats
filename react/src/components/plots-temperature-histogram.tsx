import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { convertTemperature } from '../utils/unit'

import { TemperatureHistogramExtraStat } from './load-article'
import { categoricalAxisMarks, DetailedPlotSpec, ordinalSeriesBarMarks, paddedYDomain, SeriesPlot, seriesTip } from './plots-general'
import { boundaryLabel, bucketRangeLabel, temperatureHistogramBounds } from './plots-temperature-histogram-bins'

export interface TemperatureHistogramPlotProps {
    shortname: string
    longname: string
    histogram: TemperatureHistogramExtraStat
    color: string
    subseriesName: string
}

export function TemperatureHistogramPlot(props: { histograms: TemperatureHistogramPlotProps[], statDescription: string, sharedTypeOfAllArticles?: string, modeSwitcher?: ReactElement }): ReactNode {
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

    const buildPlot = useCallback(
        (transpose: boolean): DetailedPlotSpec => {
            // excludes the open-ended below-min/above-max buckets (0 and numBins-1, no two-sided
            // interval) and clips to the bins with data, plus one bin of padding
            const [binIdxStart, binIdxEnd] = temperatureHistogramBounds(props.histograms.map(h => h.histogram.counts), numBins)
            const binIdxs = Array.from({ length: binIdxEnd - binIdxStart + 1 }, (_, i) => i + binIdxStart)
            const pointX = (binIdx: number): number => binIdx - 0.5
            const boundaryIdxs = Array.from({ length: binIdxEnd - binIdxStart + 2 }, (_, i) => i + binIdxStart - 1)
            const seriesData = props.histograms.map((series) => {
                // counts are normalize_to_uint16-scaled (sum to ~2^16), not already-percentages
                const sum = series.histogram.counts.reduce((a, b) => a + b, 0)
                return {
                    series,
                    values: series.histogram.counts.map(c => sum === 0 ? 0 : (c / sum) * 100),
                }
            })

            const marks: Plot.Markish[] = categoricalAxisMarks(
                boundaryIdxs,
                transpose,
                j => boundaryLabel(j, binMin, binSize, v => convertTemperature(v, temperatureUnit).value, unitSuffix),
            )

            marks.push(
                ordinalSeriesBarMarks(
                    seriesData,
                    binIdxs,
                    transpose,
                    pointX,
                ),
            )

            marks.push(
                seriesTip(
                    seriesData,
                    binIdxs,
                    transpose,
                    pointX,
                    i => bucketRangeLabel(i, binMin, binSize, v => convertTemperature(v, temperatureUnit).value, unitSuffix),
                    v => `${v.toFixed(1)}%`,
                    colors,
                ),
            )

            const ydomain = paddedYDomain(seriesData.flatMap(s => binIdxs.map(i => s.values[i])), 0.1, 0)

            const xlabel = `${props.statDescription} (${unitSuffix})`
            const ylabel = '% of days'

            return { marks, xlabel, ylabel, ydomain }
        },
        [props.histograms, props.statDescription, binMin, binSize, numBins, temperatureUnit, unitSuffix, colors],
    )

    return (
        <SeriesPlot
            items={props.histograms}
            filenameSuffix="temperature_distribution"
            sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
            modeSwitcher={props.modeSwitcher}
            buildPlot={buildPlot}
        />
    )
}
