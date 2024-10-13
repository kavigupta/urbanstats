import React, { ReactNode } from 'react'

import { ExtraStat } from './load-article'
import { Histogram } from './plots-histogram'

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
    if (plot_props.some(p => p.extra_stat?.type === 'histogram')) {
        plot_props = plot_props.filter(p => p.extra_stat?.type === 'histogram')
        return (
            <Histogram
                histograms={plot_props.map(
                    props => ({
                        shortname: props.shortname!,
                        histogram: props.extra_stat!,
                        color: props.color,
                        universe_total: props.extra_stat!.universe_total,
                    }),
                )}
                screenshot_mode={screenshot_mode}
            />
        )
    }
    throw new Error(`plot not recognized: ${JSON.stringify(plot_props)}`)
}
