import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

// imort Observable plot
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { convertPrecipitation, convertTemperature } from '../utils/unit'

import { MonthlyExtraStat } from './load-article'
import { axisAndGrid, computeDashPatterns, manualLegend, multiSeriesTipTitle, ordinalSeriesMarks, PlotComponent, PlotDownloadButton, transposeAwareTip } from './plots-general'

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface MonthlyPlotProps {
    stat: MonthlyExtraStat
    color: string
    shortname: string
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

interface TipDatum {
    monthIdx: number
    names: string[]
    values: number[]
}

export function MonthlyPlot(props: { stats: MonthlyPlotProps[], modeSwitcher?: ReactElement, dashOrder?: string[] }): ReactNode {
    const [temperatureUnit] = useSetting('temperature_unit')
    const [useImperial] = useSetting('use_imperial')
    const colors = useColors()

    const unit = props.stats[0].stat.unit
    const unitSuffix = convertMonthlyValue(props.stats[0].stat.monthlyValues[0], unit, temperatureUnit, useImperial).unit

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
            <PlotDownloadButton makePlot={makePlot} shortnames={props.stats.map(s => s.shortname)} filenameSuffix="monthly" />
            {props.modeSwitcher}
        </div>
    )

    const plotSpec = useCallback(
        (transpose: boolean) => {
            const monthIdxs = Array.from({ length: 12 }, (_, i) => i)
            const seriesData = props.stats.map(stat => ({
                stat,
                values: stat.stat.monthlyValues.map(v => convertMonthlyValue(v, unit, temperatureUnit, useImperial).value),
            }))

            const [axis, grid] = axisAndGrid(transpose)
            const marks: Plot.Markish[] = [
                axis(monthIdxs, { tickFormat: (i: number) => monthLabels[i] }),
                grid(monthIdxs),
            ]

            const dashPatterns = computeDashPatterns(props.stats, props.dashOrder)
            marks.push(
                ...ordinalSeriesMarks(
                    seriesData.map(({ stat, values }) => ({ series: stat, values })),
                    monthIdxs,
                    'monthIdx',
                    transpose,
                    dashPatterns,
                ),
            )

            const tipData: TipDatum[] = monthIdxs.map(i => ({
                monthIdx: i,
                names: seriesData.map(s => s.stat.shortname),
                values: seriesData.map(s => s.values[i]),
            }))
            marks.push(
                transposeAwareTip(
                    tipData,
                    transpose,
                    'monthIdx',
                    d => d.values,
                    d => multiSeriesTipTitle(monthLabels[d.monthIdx], d.names, d.values, v => `${v.toFixed(1)}${unitSuffix}`),
                    colors,
                ),
            )

            const allValues = seriesData.flatMap(s => s.values)
            const maxValue = Math.max(...allValues)
            const minValue = Math.min(...allValues)
            const pad = (maxValue - minValue) * 0.1 || Math.max(Math.abs(maxValue), 1) * 0.1
            const ydomain: [number, number] = [minValue - pad, maxValue + pad]

            const xlabel = null
            const ylabel = unit === 'precipitation'
                ? `Precipitation (rain equivalent ${unitSuffix})`
                : `${props.stats[0].stat.name}${unitSuffix ? ` (${unitSuffix})` : ''}`
            marks.push(...manualLegend(props.stats, transpose, colors, props.dashOrder))

            return { marks, xlabel, ylabel, ydomain }
        },
        [props.stats, unit, temperatureUnit, useImperial, unitSuffix, colors, props.dashOrder],
    )

    return (
        <PlotComponent
            plotSpec={plotSpec}
            settingsElement={settingsElement}
        />
    )
}
