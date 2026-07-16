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
    return statpaths.map(({ i: idx, sP: { year } }) => {
        assert(year !== null, 'unreachable, we checked this already')
        return {
            ...rows[idx],
            color,
            shortname,
            longname,
            sharedTypeOfAllArticles,
            subseriesName: year.toString(),
        } satisfies PlotProps
    })
}
