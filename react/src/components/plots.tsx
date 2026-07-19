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

// for each plot prop carrying an extra stat of `type`, the series' shared fields plus that stat
function seriesOfType<T extends ExtraStat['type']>(props: PlotProps[], type: T): { shortname: string, longname: string, color: string, subseriesName: string, stat: Extract<ExtraStat, { type: T }> }[] {
    return props.flatMap((p) => {
        const stat = p.extraStats.find(es => es.type === type)
        return stat === undefined ? [] : [{ shortname: p.shortname, longname: p.longname, color: p.color, subseriesName: p.subseriesName, stat: stat as Extract<ExtraStat, { type: T }> }]
    })
}

export function RenderedPlot({ statDescription, plotProps }: { statDescription: string, plotProps: PlotProps[] }): ReactNode {
    const colors = useColors()
    const availableTypes = Array.from(new Set(plotProps.flatMap(p => p.extraStats.map(es => es.type))))
    // one setting across all plots, not keyed per-stat, so a stat's paired partner stays in sync
    const [mode, setMode] = useSetting('plot_mode')
    const selectedType: ExtraStat['type'] | undefined = availableTypes.includes(mode)
        ? mode
        : availableTypes.length > 0 ? availableTypes[0] : undefined

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

    const relevantPlotProps = selectedType === undefined
        ? plotProps
        : plotProps.filter(p => p.pairedInFor === undefined || p.pairedInFor.includes(selectedType))
    const dashOrder = relevantPlotProps[0]?.dashOrder
    // prefer a genuinely-paired region's label ("Precipitation") over a solo one ("Rain")
    const combinedLabel = relevantPlotProps.find(p => p.pairingActive)?.combinedLabel ?? relevantPlotProps[0]?.combinedLabel

    const sharedTypeOfAllArticles = relevantPlotProps[0]?.sharedTypeOfAllArticles
    switch (selectedType) {
        case 'histogram':
            return (
                <Histogram
                    statDescription={statDescription}
                    histograms={seriesOfType(relevantPlotProps, 'histogram').map(({ stat, ...series }) => ({ ...series, histogram: stat, universeTotal: stat.universeTotal }))}
                    sharedTypeOfAllArticles={sharedTypeOfAllArticles}
                    modeSwitcher={modeSwitcher}
                    dashOrder={dashOrder}
                />
            )
        case 'time_series':
            return (
                <TimeSeriesPlot
                    stats={seriesOfType(relevantPlotProps, 'time_series').map(({ shortname, color, stat }) => ({ shortname, color, stat }))}
                />
            )
        case 'monthly_time_series':
            return (
                <MonthlyPlot
                    stats={seriesOfType(relevantPlotProps, 'monthly_time_series')}
                    sharedTypeOfAllArticles={sharedTypeOfAllArticles}
                    modeSwitcher={modeSwitcher}
                    dashOrder={dashOrder}
                    combinedLabel={combinedLabel}
                />
            )
        case 'temperature_histogram':
            return (
                <TemperatureHistogramPlot
                    statDescription={statDescription}
                    histograms={seriesOfType(relevantPlotProps, 'temperature_histogram').map(({ stat, ...series }) => ({ ...series, histogram: stat }))}
                    sharedTypeOfAllArticles={sharedTypeOfAllArticles}
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

// cross-stat pairings: two stats drawn as one chart when both are visible (High/Low, Rain/Snow).
// each pair is declared once; members are ordered dashed-first, matching the stroke-dash assignment.
interface PairMember {
    statpath: StatPath
    label: string
    soloAxisLabel: (unitSuffix: string) => string
}
interface Pairing {
    members: readonly [PairMember, PairMember]
    pairedAxisLabel: (unitSuffix: string) => string
}
const pairings: readonly Pairing[] = [
    {
        members: [
            { statpath: 'mean_low_temp', label: 'Low', soloAxisLabel: u => `Mean low temp by month (${u})` },
            { statpath: 'mean_high_temp_4', label: 'High', soloAxisLabel: u => `Mean high temp by month (${u})` },
        ],
        pairedAxisLabel: u => `Mean Temp by Month (${u})`,
    },
    {
        members: [
            { statpath: 'snowfall_4', label: 'Snow', soloAxisLabel: u => `Snow (rain equivalent ${u})` },
            { statpath: 'rainfall_4', label: 'Rain', soloAxisLabel: u => `Rain (${u})` },
        ],
        pairedAxisLabel: u => `Precipitation (rain equivalent ${u})`,
    },
]

function pairMemberOf(statpath: StatPath): { pairing: Pairing, self: PairMember, partner: PairMember } | undefined {
    for (const pairing of pairings) {
        const self = pairing.members.find(m => m.statpath === statpath)
        if (self !== undefined) {
            return { pairing, self, partner: pairing.members.find(m => m !== self)! }
        }
    }
    return undefined
}

// the requested stat's pairing resolved against the rows actually on the page
interface ResolvedPairing {
    self: PairMember
    partner: PairMember
    partnerIdx: number // -1 if the partner stat isn't present in rows
    partnerHasData: boolean
    dashOrder: string[] // members' labels, dashed-first
    combinedLabel: (unitSuffix: string) => string // paired wording if the partner has data, else self's solo
}
function resolvePairing(rows: ArticleRow[], statpath: StatPath): ResolvedPairing | undefined {
    const m = pairMemberOf(statpath)
    if (m === undefined) {
        return undefined
    }
    const partnerIdx = rows.findIndex(r => r.statpath === m.partner.statpath && r.kind === 'statistic')
    const partnerHasData = partnerIdx !== -1 && rows[partnerIdx].extraStats.length > 0
    return {
        self: m.self,
        partner: m.partner,
        partnerIdx,
        partnerHasData,
        dashOrder: m.pairing.members.map(member => member.label),
        combinedLabel: partnerHasData ? m.pairing.pairedAxisLabel : m.self.soloAxisLabel,
    }
}

// which rows to plot for the stat at statIndex: one per year, choosing the best source per year
function resolveStatYears(rows: ArticleRow[], statIndex: number): { idx: number, year: Year }[] {
    const sPs = rows.map(row => statParents.get(row.statpath)!).map((sP, i) => ({ sP, i }))
    const byYear = new Map<Year, number[]>()
    sPs.filter(({ sP, i }) => sP.group.id === sPs[statIndex].sP.group.id && rows[i].kind === 'statistic' && rows[i].extraStats.length > 0)
        .forEach(({ sP: { year }, i }) => {
            assert(year !== null, 'Year should not be null for plot data')
            byYear.set(year, [...(byYear.get(year) ?? []), i])
        })
    const chosen = Array.from(byYear.entries()).map(([year, indices]) => {
        if (indices.length === 1) {
            return { idx: indices[0], year }
        }
        const sources = indices.map(i => sPs[i].sP.source)
        const exactMatch = sources.findIndex(source => JSON.stringify(source) === JSON.stringify(sPs[statIndex].sP.source))
        const nullMatch = sources.findIndex(source => source === null)
        return { idx: indices[exactMatch !== -1 ? exactMatch : nullMatch !== -1 ? nullMatch : 0], year }
    })
    if (chosen.length > 1) {
        assert(chosen.length === new Set(chosen.map(c => c.year)).size, 'All statpaths for plot data should have unique years')
    }
    return chosen
}

export function pullRelevantPlotProps(rows: ArticleRow[], statIndex: number, color: string, shortname: string, longname: string, sharedTypeOfAllArticles: string | undefined): PlotProps[] {
    const requested = rows[statIndex]
    if (requested.kind !== 'statistic') {
        return []
    }
    const pairing = resolvePairing(rows, requested.statpath)
    const entry = (row: ArticleRow, fields: Omit<PlotProps, keyof ArticleRow | 'color' | 'shortname' | 'longname' | 'sharedTypeOfAllArticles'>): PlotProps =>
        ({ ...row, color, shortname, longname, sharedTypeOfAllArticles, ...fields })

    if (requested.extraStats.length === 0) {
        // own data invalid here (e.g. Singapore's snowfall): fall back to the partner's data styled
        // as if the partner were requested directly, rather than dropping the region entirely
        if (!pairing?.partnerHasData) {
            return []
        }
        return [entry(rows[pairing.partnerIdx], {
            subseriesName: pairing.partner.label,
            dashOrder: pairing.dashOrder,
            combinedLabel: pairing.partner.soloAxisLabel,
            pairingActive: false,
            pairedInFor: ['monthly_time_series'],
        })]
    }

    const paired = pairing !== undefined && pairing.partnerIdx !== -1 // partner stat checked/visible
    const dashOrder = paired ? pairing.dashOrder : undefined
    const combinedLabel = pairing?.combinedLabel ?? (() => '')

    const ownEntries = resolveStatYears(rows, statIndex).map(({ idx, year }) => entry(rows[idx], {
        subseriesName: paired ? pairMemberOf(rows[idx].statpath)?.self.label ?? year.toString() : year.toString(),
        dashOrder,
        combinedLabel,
        pairingActive: pairing?.partnerHasData ?? false,
    }))
    if (!pairing?.partnerHasData) {
        return ownEntries
    }

    const entries = [
        ...ownEntries,
        entry(rows[pairing.partnerIdx], {
            subseriesName: pairing.partner.label,
            dashOrder,
            combinedLabel,
            pairingActive: true,
            // the overlay only reads as "two series" in the monthly view, not the distribution one
            pairedInFor: ['monthly_time_series'],
        }),
    ]
    // order the pair solid-first (reversed dashOrder), not expanded-stat-first, so dashes/legend/
    // tooltip read the same regardless of which member was expanded and consumers need no re-sort
    const displayOrder = [...pairing.dashOrder].reverse()
    entries.sort((a, b) => displayOrder.indexOf(a.subseriesName) - displayOrder.indexOf(b.subseriesName))
    return entries
}
