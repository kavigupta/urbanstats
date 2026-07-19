import React, { ReactNode } from 'react'

import { statParents, Year } from '../page_template/statistic-tree'
import { assert } from '../utils/defensive'

import { ArticleRow, ExtraStat } from './load-article'
import { transposeSettingsHeight } from './plots-general'
import { Histogram } from './plots-histogram'
import { TimeSeriesPlot } from './plots-timeseries'

export interface PlotProps {
    shortname: string
    longname: string
    extraStats: ExtraStat[]
    color: string
    sharedTypeOfAllArticles?: string
    subseriesName: string
}

// for each plot prop carrying an extra stat of `type`, the series' shared fields plus that stat
function seriesOfType<T extends ExtraStat['type']>(props: PlotProps[], type: T): { shortname: string, longname: string, color: string, subseriesName: string, stat: Extract<ExtraStat, { type: T }> }[] {
    return props.flatMap((p) => {
        const stat = p.extraStats.find(es => es.type === type)
        return stat === undefined ? [] : [{ shortname: p.shortname, longname: p.longname, color: p.color, subseriesName: p.subseriesName, stat: stat as Extract<ExtraStat, { type: T }> }]
    })
}

export function RenderedPlot({ statDescription, plotProps }: { statDescription: string, plotProps: PlotProps[] }): ReactNode {
    const type = plotProps.flatMap(p => p.extraStats.map(es => es.type)).reduce<undefined | 'histogram' | 'time_series'>((result, t) => {
        if (result === undefined) {
            return t
        }
        else if (t !== result) {
            throw new Error('Rendering plots of differing types')
        }
        return result
    }, undefined)
    switch (type) {
        case 'histogram':
            return (
                <Histogram
                    statDescription={statDescription}
                    histograms={seriesOfType(plotProps, 'histogram').map(({ stat, ...series }) => ({ ...series, histogram: stat, universeTotal: stat.universeTotal }))}
                    sharedTypeOfAllArticles={plotProps[0]?.sharedTypeOfAllArticles}
                />
            )
        case 'time_series':
            return (
                <TimeSeriesPlot
                    stats={seriesOfType(plotProps, 'time_series').map(({ shortname, color, stat }) => ({ shortname, color, stat }))}
                />
            )
        case undefined:
            return null
    }
}

export function extraHeaderSpaceForVertical(spec: PlotProps): number {
    if (spec.extraStats.some(es => es.type === 'histogram')) {
        return transposeSettingsHeight
    }
    return 0
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
    if (rows[statIndex].kind !== 'statistic' || rows[statIndex].extraStats.length === 0) {
        return []
    }
    return resolveStatYears(rows, statIndex).map(({ idx, year }) => ({
        ...rows[idx],
        color,
        shortname,
        longname,
        sharedTypeOfAllArticles,
        subseriesName: year.toString(),
    } satisfies PlotProps))
}
