import React, { ReactElement, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { plotDisplayModeKey, useSetting } from '../page_template/settings'
import { StatPath } from '../page_template/statistic-tree'

import { ExtraStat } from './load-article'
import { Histogram, transposeSettingsHeight } from './plots-histogram'
import { MonthlyPlot } from './plots-monthly'
import { TemperatureHistogramPlot } from './plots-temperature-histogram'
import { TimeSeriesPlot } from './plots-timeseries'

export interface PlotProps {
    shortname: string
    longname: string
    extraStats: ExtraStat[]
    color: string
    sharedTypeOfAllArticles?: string
    subseriesName: string
}

const plotModeLabels: Partial<Record<ExtraStat['type'], string>> = {
    monthly_time_series: 'Monthly',
    temperature_histogram: 'Distribution',
    histogram: 'Distribution',
    time_series: 'Yearly',
}

export function RenderedPlot({ statDescription, statpath, plotProps }: { statDescription: string, statpath: StatPath, plotProps: PlotProps[] }): ReactNode {
    const colors = useColors()
    const availableTypes = Array.from(new Set(plotProps.flatMap(p => p.extraStats.map(es => es.type))))
    const [mode, setMode] = useSetting(plotDisplayModeKey(statpath))
    const selectedType: ExtraStat['type'] | undefined = availableTypes.includes(mode as ExtraStat['type']) ? mode as ExtraStat['type'] : availableTypes[0]

    const modeSwitcher: ReactElement | undefined = availableTypes.length > 1
        ? (
                <select
                    value={selectedType}
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    onChange={(e) => { setMode(e.target.value) }}
                    className="serif"
                    data-test-id="plot_mode"
                >
                    {availableTypes.map(t => <option key={t} value={t}>{plotModeLabels[t] ?? t}</option>)}
                </select>
            )
        : undefined

    switch (selectedType) {
        case 'histogram':
            return (
                <Histogram
                    statDescription={statDescription}
                    histograms={plotProps.flatMap(
                        (props) => {
                            const extraStat = props.extraStats.find(es => es.type === 'histogram')
                            if (extraStat === undefined) {
                                return []
                            }
                            return [
                                {
                                    shortname: props.shortname,
                                    longname: props.longname,
                                    histogram: extraStat,
                                    color: props.color,
                                    universeTotal: extraStat.universeTotal,
                                    subseriesName: props.subseriesName,
                                },
                            ]
                        },
                    )}
                    sharedTypeOfAllArticles={plotProps[0]?.sharedTypeOfAllArticles}
                    modeSwitcher={modeSwitcher}
                />
            )
        case 'time_series':
            return (
                <TimeSeriesPlot
                    stats={plotProps.map(
                        (props) => {
                            const extraStat = props.extraStats.find(es => es.type === 'time_series')
                            if (extraStat === undefined) {
                                throw new Error('expected time_series')
                            }
                            return {
                                shortname: props.shortname,
                                stat: extraStat,
                                color: props.color,
                            }
                        },
                    )}
                />
            )
        case 'monthly_time_series':
            return (
                <MonthlyPlot
                    stats={plotProps.flatMap(
                        (props) => {
                            const extraStat = props.extraStats.find(es => es.type === 'monthly_time_series')
                            if (extraStat === undefined) {
                                return []
                            }
                            return [
                                {
                                    shortname: props.shortname,
                                    stat: extraStat,
                                    color: props.color,
                                },
                            ]
                        },
                    )}
                    modeSwitcher={modeSwitcher}
                />
            )
        case 'temperature_histogram':
            return (
                <TemperatureHistogramPlot
                    statDescription={statDescription}
                    histograms={plotProps.flatMap(
                        (props) => {
                            const extraStat = props.extraStats.find(es => es.type === 'temperature_histogram')
                            if (extraStat === undefined) {
                                return []
                            }
                            return [
                                {
                                    shortname: props.shortname,
                                    longname: props.longname,
                                    histogram: extraStat,
                                    color: props.color,
                                    subseriesName: props.subseriesName,
                                },
                            ]
                        },
                    )}
                    modeSwitcher={modeSwitcher}
                />
            )
        case undefined:
            return null
    }
}

export function extraHeaderSpaceForVertical(spec: PlotProps): number {
    if (spec.extraStats.some(es => es.type === 'histogram' || es.type === 'temperature_histogram')) {
        return transposeSettingsHeight
    }
    return 0
}
