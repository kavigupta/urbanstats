import React, { ReactNode } from 'react'

import { ExtraStat } from './load-article'
import { Histogram } from './plots-histogram'
import { TimeSeriesPlot } from './plots-timeseries'

interface PlotProps {
    shortname?: string
    extra_stat?: ExtraStat
    color: string
}

export function WithPlot(props: { children: React.ReactNode, plot_props: PlotProps[], expanded: boolean, screenshot_mode: boolean }): ReactNode {
    return (
        <div className="plot">
            {props.children}
            {props.expanded ? <RenderedPlot plot_props={props.plot_props} screenshot_mode={props.screenshot_mode} /> : null}
        </div>
    )
}

function RenderedPlot({ plot_props, screenshot_mode }: { plot_props: PlotProps[], screenshot_mode: boolean }): ReactNode {
    const type = plot_props[0].extra_stat?.type
    if (type === 'histogram') {
        return (
            <Histogram
                histograms={plot_props.flatMap(
                    (props) => {
                        if (props.extra_stat?.type !== 'histogram') {
                            return []
                        }
                        return [
                            {
                                shortname: props.shortname!,
                                histogram: props.extra_stat,
                                color: props.color,
                                universe_total: props.extra_stat.universe_total,
                            },
                        ]
                    },
                )}
                screenshot_mode={screenshot_mode}
            />
        )
    }
    else if (type === 'time_series') {
        return (
            <TimeSeriesPlot
                stats={plot_props.map(
                    (props) => {
                        if (props.extra_stat?.type !== 'time_series') {
                            throw new Error('expected time_series')
                        }
                        return {
                            shortname: props.shortname!,
                            stat: props.extra_stat,
                            color: props.color,
                        }
                    },
                )}
                screenshot_mode={screenshot_mode}
            />
        )
    }
    throw new Error(`plot not recognized: ${JSON.stringify(plot_props)}`)
}
