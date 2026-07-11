import React, { ReactNode } from 'react'

import { ExtraStat } from './load-article'
import { Histogram, transposeSettingsHeight } from './plots-histogram'
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
