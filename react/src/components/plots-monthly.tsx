import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { convertPrecipitation, convertTemperature } from '../utils/unit'

import { MonthlyExtraStat } from './load-article'
import { categoricalAxisMarks, computeDashPatterns, DetailedPlotSpec, ordinalSeriesMarks, paddedYDomain, SeriesPlot, seriesTip } from './plots-general'

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface MonthlyPlotProps {
    stat: MonthlyExtraStat
    color: string
    shortname: string
    longname: string
    subseriesName: string
}

// the same value+unit conversion the cell renderer (unit-display.tsx) uses for these stats
function convertMonthlyValue(value: number, unit: MonthlyExtraStat['unit'], temperatureUnit: string, useImperial = false): { value: number, unit: string } {
    switch (unit) {
        case 'temperature':
            return convertTemperature(value, temperatureUnit)
        case 'precipitation':
            return convertPrecipitation(value, useImperial)
    }
}

export function MonthlyPlot(props: { stats: MonthlyPlotProps[], sharedTypeOfAllArticles?: string, modeSwitcher?: ReactElement, dashOrder?: string[], combinedLabel?: (unitSuffix: string) => string }): ReactNode {
    const [temperatureUnit] = useSetting('temperature_unit')
    const [useImperial] = useSetting('use_imperial')
    const colors = useColors()

    const unit = props.stats[0].stat.unit
    const unitSuffix = convertMonthlyValue(props.stats[0].stat.monthlyValues[0], unit, temperatureUnit, useImperial).unit
    const { combinedLabel } = props

    const buildPlot = useCallback(
        (transpose: boolean): DetailedPlotSpec => {
            const monthIdxs = Array.from({ length: 12 }, (_, i) => i)
            const seriesData = props.stats.map(series => ({
                series,
                values: series.stat.monthlyValues.map(v => convertMonthlyValue(v, unit, temperatureUnit, useImperial).value),
            }))

            const marks: Plot.Markish[] = categoricalAxisMarks(monthIdxs, transpose, i => monthLabels[i])

            const dashPatterns = computeDashPatterns(props.stats, props.dashOrder)
            marks.push(
                ...ordinalSeriesMarks(
                    seriesData,
                    monthIdxs,
                    'monthIdx',
                    transpose,
                    dashPatterns,
                ),
            )

            marks.push(
                seriesTip(
                    seriesData,
                    monthIdxs,
                    transpose,
                    i => i,
                    i => monthLabels[i],
                    v => `${v.toFixed(1)}${unitSuffix}`,
                    colors,
                ),
            )

            const ydomain = paddedYDomain(seriesData.flatMap(s => s.values), 0.1)

            const xlabel = null
            const ylabel = combinedLabel !== undefined
                ? combinedLabel(unitSuffix)
                : `${props.stats[0].stat.name} (${unitSuffix})`

            return { marks, xlabel, ylabel, ydomain }
        },
        [props.stats, unit, temperatureUnit, useImperial, unitSuffix, colors, props.dashOrder, combinedLabel],
    )

    return (
        <SeriesPlot
            items={props.stats}
            filenameSuffix="monthly"
            sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
            modeSwitcher={props.modeSwitcher}
            dashOrder={props.dashOrder}
            buildPlot={buildPlot}
        />
    )
}
