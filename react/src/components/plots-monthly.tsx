import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

// imort Observable plot
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'

import { MonthlyExtraStat } from './load-article'
import { computeDashPatterns, manualLegend, PlotComponent } from './plots-general'
import { createScreenshot } from './screenshot'

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface MonthlyPlotProps {
    stat: MonthlyExtraStat
    color: string
    shortname: string
    subseriesName: string
}

export function convertValue(value: number, unit: MonthlyExtraStat['unit'], temperatureUnit: string): number {
    if (unit === 'temperature' && temperatureUnit === 'celsius') {
        return (value - 32) * (5 / 9)
    }
    return value
}

export function unitSuffixFor(unit: MonthlyExtraStat['unit'], temperatureUnit: string): string {
    if (unit !== 'temperature') {
        return ''
    }
    return temperatureUnit === 'celsius' ? '°C' : '°F'
}

interface TipDatum {
    monthIdx: number
    names: string[]
    values: number[]
}

export function MonthlyPlot(props: { stats: MonthlyPlotProps[], modeSwitcher?: ReactElement, dashOrder?: string[] }): ReactNode {
    const [temperatureUnit] = useSetting('temperature_unit')
    const colors = useColors()
    const universe = useUniverse()

    const unit = props.stats[0].stat.unit
    const unitSuffix = unitSuffixFor(unit, temperatureUnit)

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
            <img
                src="/download.png"
                onClick={async () => {
                    const plot = makePlot()
                    document.body.appendChild(plot)
                    const uniqueShortnames = Array.from(new Set(props.stats.map(s => s.shortname)))
                    await createScreenshot(
                        {
                            path: `${uniqueShortnames.join('_')}_monthly`,
                            overallWidth: plot.offsetWidth * 2,
                            elementsToRender: [plot],
                            heightMultiplier: 1.2,
                        },
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
            {props.modeSwitcher}
        </div>
    )

    const plotSpec = useCallback(
        (transpose: boolean) => {
            const monthIdxs = Array.from({ length: 12 }, (_, i) => i)
            const seriesData = props.stats.map(stat => ({
                stat,
                values: stat.stat.monthlyValues.map(v => convertValue(v, unit, temperatureUnit)),
            }))

            let axis = Plot.axisX
            let grid = Plot.gridX
            if (transpose) {
                axis = Plot.axisY
                grid = Plot.gridY
            }
            const marks: Plot.Markish[] = [
                axis(monthIdxs, { tickFormat: (i: number) => monthLabels[i] }),
                grid(monthIdxs),
            ]

            const dashPatterns = computeDashPatterns(props.stats, props.dashOrder)
            marks.push(
                ...seriesData.map(({ stat, values }) =>
                    Plot.line(
                        monthIdxs.map(i => ({ monthIdx: i, value: values[i] })),
                        {
                            x: transpose ? 'value' : 'monthIdx',
                            y: transpose ? 'monthIdx' : 'value',
                            stroke: stat.color,
                            strokeWidth: 3,
                            strokeDasharray: dashPatterns.size > 1 ? dashPatterns.get(stat.subseriesName)?.pattern : undefined,
                        },
                    ) as Plot.Markish,
                ),
            )
            marks.push(
                ...seriesData.map(({ stat, values }) =>
                    Plot.dot(
                        monthIdxs.map(i => ({ monthIdx: i, value: values[i] })),
                        {
                            x: transpose ? 'value' : 'monthIdx',
                            y: transpose ? 'monthIdx' : 'value',
                            fill: stat.color,
                            r: 3,
                        },
                    ) as Plot.Markish,
                ),
            )

            const tipData: TipDatum[] = monthIdxs.map(i => ({
                monthIdx: i,
                names: seriesData.map(s => s.stat.shortname),
                values: seriesData.map(s => s.values[i]),
            }))
            marks.push(
                Plot.tip(
                    tipData,
                    (transpose ? Plot.pointerY : Plot.pointerX)({
                        x: transpose ? (d: TipDatum) => Math.max(...d.values) : 'monthIdx',
                        y: transpose ? 'monthIdx' : (d: TipDatum) => Math.max(...d.values),
                        title: (d: TipDatum) => {
                            let result = `${monthLabels[d.monthIdx]}\n`
                            if (d.names.length > 1) {
                                result += d.names.map((name, i) => `${name}: ${d.values[i].toFixed(1)}${unitSuffix}`).join('\n')
                            }
                            else {
                                result += `${d.values[0].toFixed(1)}${unitSuffix}`
                            }
                            return result
                        },
                        fill: colors.slightlyDifferentBackground,
                        stroke: colors.borderNonShadow,
                        textColor: colors.textMain,
                    }),
                ),
            )

            const allValues = seriesData.flatMap(s => s.values)
            const maxValue = Math.max(...allValues)
            const minValue = Math.min(...allValues)
            const pad = (maxValue - minValue) * 0.1 || Math.max(Math.abs(maxValue), 1) * 0.1
            const ydomain: [number, number] = [minValue - pad, maxValue + pad]

            const xlabel = null
            const ylabel = `${props.stats[0].stat.name}${unitSuffix ? ` (${unitSuffix})` : ''}`
            marks.push(...manualLegend(props.stats, transpose, colors, props.dashOrder))

            return { marks, xlabel, ylabel, ydomain }
        },
        [props.stats, unit, temperatureUnit, unitSuffix, colors, props.dashOrder],
    )

    return (
        <PlotComponent
            plotSpec={plotSpec}
            settingsElement={settingsElement}
        />
    )
}
