import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'

import { TemperatureHistogramExtraStat } from './load-article'
import { computeDashPatterns, manualLegend, PlotComponent } from './plots-general'
import { convertValue, unitSuffixFor } from './plots-monthly'
import { createScreenshot } from './screenshot'

export interface TemperatureHistogramPlotProps {
    shortname: string
    longname: string
    histogram: TemperatureHistogramExtraStat
    color: string
    subseriesName: string
}

interface TipDatum {
    binIdx: number
    names: string[]
    values: number[]
}

// counts[0] is "below binMin", counts[n-1] is "at or above binMin + (n-2)*binSize",
// everything in between is a normal [binMin + (i-1)*binSize, binMin + i*binSize) bucket
function binLabel(binIdx: number, binMin: number, binSize: number, numBins: number, convert: (v: number) => number, unitSuffix: string): string {
    const round = (v: number): string => Math.round(convert(v)).toString()
    if (binIdx === 0) {
        return `<${round(binMin)}${unitSuffix}`
    }
    if (binIdx === numBins - 1) {
        return `${round(binMin + (numBins - 2) * binSize)}+${unitSuffix}`
    }
    const lo = binMin + (binIdx - 1) * binSize
    const hi = lo + binSize
    return `${round(lo)}-${round(hi)}${unitSuffix}`
}

export function TemperatureHistogramPlot(props: { histograms: TemperatureHistogramPlotProps[], statDescription: string, modeSwitcher?: ReactElement, dashOrder?: string[] }): ReactNode {
    const [temperatureUnit] = useSetting('temperature_unit')
    const colors = useColors()
    const universe = useUniverse()

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
            <img
                src="/download.png"
                onClick={async () => {
                    const plot = makePlot()
                    document.body.appendChild(plot)
                    const uniqueShortnames = Array.from(new Set(props.histograms.map(h => h.shortname)))
                    await createScreenshot(
                        {
                            path: `${uniqueShortnames.join('_')}_temperature_distribution`,
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
            const binIdxs = Array.from({ length: numBins }, (_, i) => i)
            const labels = binIdxs.map(i => binLabel(i, binMin, binSize, numBins, v => convertValue(v, 'temperature', temperatureUnit), unitSuffix))
            const seriesData = props.histograms.map(h => ({
                h,
                values: h.histogram.counts.map(c => c * 100),
            }))

            let axis = Plot.axisX
            let grid = Plot.gridX
            if (transpose) {
                axis = Plot.axisY
                grid = Plot.gridY
            }
            const marks: Plot.Markish[] = [
                axis(binIdxs, { tickFormat: (i: number) => labels[i] }),
                grid(binIdxs),
            ]

            const dashPatterns = computeDashPatterns(props.histograms, props.dashOrder)
            marks.push(
                ...seriesData.map(({ h, values }) =>
                    Plot.line(
                        binIdxs.map(i => ({ binIdx: i, value: values[i] })),
                        {
                            x: transpose ? 'value' : 'binIdx',
                            y: transpose ? 'binIdx' : 'value',
                            stroke: h.color,
                            strokeWidth: 3,
                            strokeDasharray: dashPatterns.size > 1 ? dashPatterns.get(h.subseriesName)?.pattern : undefined,
                        },
                    ) as Plot.Markish,
                ),
            )
            marks.push(
                ...seriesData.map(({ h, values }) =>
                    Plot.dot(
                        binIdxs.map(i => ({ binIdx: i, value: values[i] })),
                        {
                            x: transpose ? 'value' : 'binIdx',
                            y: transpose ? 'binIdx' : 'value',
                            fill: h.color,
                            r: 3,
                        },
                    ) as Plot.Markish,
                ),
            )

            const tipData: TipDatum[] = binIdxs.map(i => ({
                binIdx: i,
                names: seriesData.map(s => s.h.shortname),
                values: seriesData.map(s => s.values[i]),
            }))
            marks.push(
                Plot.tip(
                    tipData,
                    (transpose ? Plot.pointerY : Plot.pointerX)({
                        x: transpose ? (d: TipDatum) => Math.max(...d.values) : 'binIdx',
                        y: transpose ? 'binIdx' : (d: TipDatum) => Math.max(...d.values),
                        title: (d: TipDatum) => {
                            let result = `${labels[d.binIdx]}\n`
                            if (d.names.length > 1) {
                                result += d.names.map((name, i) => `${name}: ${d.values[i].toFixed(1)}%`).join('\n')
                            }
                            else {
                                result += `${d.values[0].toFixed(1)}%`
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
