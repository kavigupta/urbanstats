import React, { ReactNode } from 'react'

import { ExtraStat } from './load-article'
import { Histogram } from './plots-histogram'
import { TimeSeriesPlot } from './plots-timeseries'

interface PlotProps {
    shortname: string
    extraStat?: ExtraStat
    color: string
}

export function WithPlot(props: { children: React.ReactNode, plotProps: PlotProps[], expanded: boolean }): ReactNode {
    return (
        <div className="plot">
            {props.children}
            {props.expanded ? <RenderedPlot plotProps={props.plotProps} /> : null}
        </div>
    )
}

function RenderedPlot({ plotProps }: { plotProps: PlotProps[] }): ReactNode {
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
                    histograms={plotProps.flatMap(
                        (props) => {
                            if (props.extraStat?.type !== 'histogram') {
                                return []
                            }
                            return [
                                {
                                    shortname: props.shortname,
                                    histogram: props.extraStat,
                                    color: props.color,
                                    universeTotal: props.extraStat.universeTotal,
                                },
                            ]
                        },
                    )}
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
