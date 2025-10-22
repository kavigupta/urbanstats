import React, { ReactNode } from 'react'

import { ExtraStat } from './load-article'
import { Histogram, transposeSettingsHeight } from './plots-histogram'
import { TimeSeriesPlot } from './plots-timeseries'

export interface PlotProps {
    shortname: string
    longname: string
    extraStat?: ExtraStat
    color: string
    sharedTypeOfAllArticles?: string
}

export function RenderedPlot({ statDescription, plotProps }: { statDescription: string, plotProps: PlotProps[] }): ReactNode {
    const type = plotProps.reduce<undefined | 'histogram' | 'time_series'>((result, plot) => {
        if (result === undefined) {
            return plot.extraStat?.type
        }
        else if (plot.extraStat?.type !== undefined && plot.extraStat.type !== result) {
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
                            if (props.extraStat?.type !== 'histogram') {
                                return []
                            }
                            return [
                                {
                                    shortname: props.shortname,
                                    longname: props.longname,
                                    histogram: props.extraStat,
                                    color: props.color,
                                    universeTotal: props.extraStat.universeTotal,
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
                            if (props.extraStat?.type !== 'time_series') {
                                throw new Error('expected time_series')
                            }
                            return {
                                shortname: props.shortname,
                                stat: props.extraStat,
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
    switch (spec.extraStat?.type) {
        case 'histogram':
            return transposeSettingsHeight
        case 'time_series':
            return 0
        case undefined:
            return 0
    }
}
