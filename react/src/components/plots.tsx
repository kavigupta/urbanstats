import React, { ReactElement, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { plotDisplayModeKey, useSetting } from '../page_template/settings'
import { statParents, StatPath, Year } from '../page_template/statistic-tree'
import { assert } from '../utils/defensive'

import { ArticleRow, ExtraStat } from './load-article'
import { transposeSettingsHeight } from './plots-general'
import { Histogram } from './plots-histogram'
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
    dashOrder?: string[]
    // when set, this entry is only included in the render for the listed extra-stat types
    // (e.g. a cross-stat overlay like high/low temp that only makes sense on some views)
    pairedInFor?: ExtraStat['type'][]
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- availableTypes[0] is undefined when empty
    const relevantPlotProps = selectedType === undefined
        ? plotProps
        : plotProps.filter(p => p.pairedInFor === undefined || p.pairedInFor.includes(selectedType))
    const dashOrder = relevantPlotProps[0]?.dashOrder

    switch (selectedType) {
        case 'histogram':
            return (
                <Histogram
                    statDescription={statDescription}
                    histograms={relevantPlotProps.flatMap(
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
                    sharedTypeOfAllArticles={relevantPlotProps[0]?.sharedTypeOfAllArticles}
                    modeSwitcher={modeSwitcher}
                    dashOrder={dashOrder}
                />
            )
        case 'time_series':
            return (
                <TimeSeriesPlot
                    stats={relevantPlotProps.map(
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
                    stats={relevantPlotProps.flatMap(
                        (props) => {
                            const extraStat = props.extraStats.find(es => es.type === 'monthly_time_series')
                            if (extraStat === undefined) {
                                return []
                            }
                            return [
                                {
                                    shortname: props.shortname,
                                    longname: props.longname,
                                    stat: extraStat,
                                    color: props.color,
                                    subseriesName: props.subseriesName,
                                },
                            ]
                        },
                    )}
                    sharedTypeOfAllArticles={relevantPlotProps[0]?.sharedTypeOfAllArticles}
                    modeSwitcher={modeSwitcher}
                    dashOrder={dashOrder}
                />
            )
        case 'temperature_histogram':
            return (
                <TemperatureHistogramPlot
                    statDescription={statDescription}
                    histograms={relevantPlotProps.flatMap(
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
                    sharedTypeOfAllArticles={relevantPlotProps[0]?.sharedTypeOfAllArticles}
                    modeSwitcher={modeSwitcher}
                    dashOrder={dashOrder}
                />
            )
        case undefined:
            return null
    }
}

export function extraHeaderSpaceForVertical(spec: PlotProps): number {
    if (spec.extraStats.some(es => es.type === 'histogram' || es.type === 'temperature_histogram' || es.type === 'monthly_time_series')) {
        return transposeSettingsHeight
    }
    return 0
}

// cross-stat plot pairings -- combine the two into one chart (like the multi-year overlay)
// whenever both are visible, with the second-listed one dashed
const plotPairPartner: Partial<Record<StatPath, StatPath>> = {
    mean_high_temp_4: 'mean_low_temp',
    mean_low_temp: 'mean_high_temp_4',
    rainfall_4: 'snowfall_4',
    snowfall_4: 'rainfall_4',
}
const plotPairLabel: Partial<Record<StatPath, string>> = {
    mean_high_temp_4: 'High',
    mean_low_temp: 'Low',
    rainfall_4: 'Rain',
    snowfall_4: 'Snow',
}
// dashOrder[0] is dashed, dashOrder[1] is solid -- keyed by either member of the pair
const plotPairDashOrder: Partial<Record<StatPath, string[]>> = {
    mean_high_temp_4: ['Low', 'High'],
    mean_low_temp: ['Low', 'High'],
    rainfall_4: ['Snow', 'Rain'],
    snowfall_4: ['Snow', 'Rain'],
}

export function pullRelevantPlotProps(rows: ArticleRow[], statIndex: number, color: string, shortname: string, longname: string, sharedTypeOfAllArticles: string | undefined): PlotProps[] {
    if (rows[statIndex].kind !== 'statistic' || rows[statIndex].extraStats.length === 0) {
        return []
    }
    const sPs = rows.map(row => statParents.get(row.statpath)!).map((sP, i) => ({ sP, i }))
    const byYear = new Map<Year, number[]>()
    sPs.filter((
        { sP, i }) => sP.group.id === sPs[statIndex].sP.group.id && rows[i].kind === 'statistic' && rows[i].extraStats.length > 0,
    ).forEach(({ sP: { year }, i }) => {
        assert(year !== null, 'Year should not be null for plot data')
        byYear.set(year, [...(byYear.get(year) ?? []), i])
    })
    const bestSourceEach = Array.from(byYear.entries()).map(([, indices]) => {
        if (indices.length === 1) {
            return indices[0]
        }
        const sources = indices.map(i => sPs[i].sP.source)
        const exactMatch = sources.findIndex(source => JSON.stringify(source) === JSON.stringify(sPs[statIndex].sP.source))
        if (exactMatch !== -1) {
            return indices[exactMatch]
        }
        const nullMatch = sources.findIndex(source => source === null)
        if (nullMatch !== -1) {
            return indices[nullMatch]
        }
        return indices[0]
    })
    const statpaths = bestSourceEach.map(i => sPs[i])
    const overOne = statpaths.length > 1
    if (overOne) {
        statpaths.forEach(({ sP: { year } }) => {
            assert(year !== null, 'Year should not be null for plot data')
        })
        assert(statpaths.length === new Set(statpaths.map(({ sP: { year } }) => year)).size, 'All statpaths for plot data should have unique years')
    }
    const pairedPath = plotPairPartner[rows[statIndex].statpath]
    // whether the partner stat is checked/visible at all
    const pairedIdx = pairedPath !== undefined
        ? rows.findIndex(r => r.statpath === pairedPath && r.kind === 'statistic')
        : -1
    const pairActive = pairedIdx !== -1
    // whether *this region's* partner data is actually renderable
    const pairedHasData = pairActive && rows[pairedIdx].extraStats.length > 0
    const dashOrder = pairActive ? plotPairDashOrder[rows[statIndex].statpath] : undefined

    const ownEntries = statpaths.map(({ i: idx, sP: { year } }) => {
        assert(year !== null, 'unreachable, we checked this already')
        return {
            ...rows[idx],
            color,
            shortname,
            longname,
            sharedTypeOfAllArticles,
            subseriesName: pairActive ? plotPairLabel[rows[idx].statpath] ?? year.toString() : year.toString(),
            dashOrder,
        } satisfies PlotProps
    })
    if (!pairedHasData) {
        return ownEntries
    }
    return [
        ...ownEntries,
        {
            ...rows[pairedIdx],
            color,
            shortname,
            longname,
            sharedTypeOfAllArticles,
            subseriesName: plotPairLabel[rows[pairedIdx].statpath]!,
            dashOrder,
            // the overlay only makes sense for the monthly view -- a combined distribution chart
            // doesn't read as "two series", so RenderedPlot excludes this entry from that view
            pairedInFor: ['monthly_time_series'],
        } satisfies PlotProps,
    ]
}
