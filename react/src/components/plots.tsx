import React, { ReactElement, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { PlotMode, useSetting } from '../page_template/settings'
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
    // if set, this entry is only rendered in these modes (a cross-stat overlay valid on some views)
    pairedInFor?: ExtraStat['type'][]
    combinedLabel: (unitSuffix: string) => string
    pairingActive: boolean // the paired partner is actually present
}

const plotModeLabels: Partial<Record<ExtraStat['type'], string>> = {
    monthly_time_series: 'Monthly',
    temperature_histogram: 'Distribution',
    histogram: 'Distribution',
    time_series: 'Yearly',
}

export function RenderedPlot({ statDescription, plotProps }: { statDescription: string, plotProps: PlotProps[] }): ReactNode {
    const colors = useColors()
    const availableTypes = Array.from(new Set(plotProps.flatMap(p => p.extraStats.map(es => es.type))))
    // one setting across all plots, not keyed per-stat, so a stat's paired partner stays in sync
    const [mode, setMode] = useSetting('plot_mode')
    const selectedType: ExtraStat['type'] | undefined = availableTypes.includes(mode) ? mode : availableTypes[0]

    const modeSwitcher: ReactElement | undefined = availableTypes.length > 1
        ? (
                <select
                    value={selectedType}
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    onChange={(e) => { setMode(e.target.value as PlotMode) }}
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
    // prefer a genuinely-paired region's label ("Precipitation") over a solo one ("Rain")
    const combinedLabel = relevantPlotProps.find(p => p.pairingActive)?.combinedLabel ?? relevantPlotProps[0]?.combinedLabel

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
                    combinedLabel={combinedLabel}
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

// cross-stat pairings: combine the two into one chart whenever both are visible
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
// monthly axis label, keyed by either member -- solo when only this stat renders, paired when both do
const plotPairAxisLabel: Partial<Record<StatPath, { solo: (unitSuffix: string) => string, paired: (unitSuffix: string) => string }>> = {
    mean_high_temp_4: {
        solo: unitSuffix => `Mean high temp by month (${unitSuffix})`,
        paired: unitSuffix => `Mean Temp by Month (${unitSuffix})`,
    },
    mean_low_temp: {
        solo: unitSuffix => `Mean low temp by month (${unitSuffix})`,
        paired: unitSuffix => `Mean Temp by Month (${unitSuffix})`,
    },
    rainfall_4: {
        solo: unitSuffix => `Rain (${unitSuffix})`,
        paired: unitSuffix => `Precipitation (rain equivalent ${unitSuffix})`,
    },
    snowfall_4: {
        solo: unitSuffix => `Snow (rain equivalent ${unitSuffix})`,
        paired: unitSuffix => `Precipitation (rain equivalent ${unitSuffix})`,
    },
}
const noAxisLabel = (): string => ''

export function pullRelevantPlotProps(rows: ArticleRow[], statIndex: number, color: string, shortname: string, longname: string, sharedTypeOfAllArticles: string | undefined): PlotProps[] {
    if (rows[statIndex].kind !== 'statistic') {
        return []
    }
    if (rows[statIndex].extraStats.length === 0) {
        // own data invalid here (e.g. Singapore's snowfall): fall back to the partner's data styled
        // as if the partner were requested directly, rather than dropping the region entirely
        const pairedPath = plotPairPartner[rows[statIndex].statpath]
        const pairedIdx = pairedPath !== undefined
            ? rows.findIndex(r => r.statpath === pairedPath && r.kind === 'statistic')
            : -1
        if (pairedIdx === -1 || rows[pairedIdx].extraStats.length === 0) {
            return []
        }
        const axisLabel = plotPairAxisLabel[rows[pairedIdx].statpath]
        return [{
            ...rows[pairedIdx],
            color,
            shortname,
            longname,
            sharedTypeOfAllArticles,
            subseriesName: plotPairLabel[rows[pairedIdx].statpath]!,
            dashOrder: plotPairDashOrder[rows[pairedIdx].statpath],
            combinedLabel: axisLabel !== undefined ? axisLabel.solo : noAxisLabel,
            pairingActive: false,
            pairedInFor: ['monthly_time_series'],
        } satisfies PlotProps]
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
    const pairedIdx = pairedPath !== undefined
        ? rows.findIndex(r => r.statpath === pairedPath && r.kind === 'statistic')
        : -1
    const pairActive = pairedIdx !== -1 // partner stat checked/visible
    const pairedHasData = pairActive && rows[pairedIdx].extraStats.length > 0 // and has data for this region
    const dashOrder = pairActive ? plotPairDashOrder[rows[statIndex].statpath] : undefined
    const axisLabel = plotPairAxisLabel[rows[statIndex].statpath]
    const combinedLabel = axisLabel !== undefined ? (pairedHasData ? axisLabel.paired : axisLabel.solo) : noAxisLabel

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
            combinedLabel,
            pairingActive: pairedHasData,
        } satisfies PlotProps
    })
    if (!pairedHasData) {
        return ownEntries
    }
    const entries = [
        ...ownEntries,
        {
            ...rows[pairedIdx],
            color,
            shortname,
            longname,
            sharedTypeOfAllArticles,
            subseriesName: plotPairLabel[rows[pairedIdx].statpath]!,
            dashOrder,
            combinedLabel,
            pairingActive: true,
            // the overlay only reads as "two series" in the monthly view, not the distribution one
            pairedInFor: ['monthly_time_series'],
        } satisfies PlotProps,
    ]
    // order the pair solid-first (reversed dashOrder), not expanded-stat-first, so dashes/legend/
    // tooltip read the same regardless of which member was expanded and consumers need no re-sort
    if (dashOrder !== undefined) {
        const displayOrder = [...dashOrder].reverse()
        entries.sort((a, b) => displayOrder.indexOf(a.subseriesName) - displayOrder.indexOf(b.subseriesName))
    }
    return entries
}
