import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useMemo } from 'react'

// imort Observable plot

import { TimeSeriesExtraStat } from './load-article'
import { PlotComponent } from './plots-general'

export interface TimeSeriesPlotProps {
    stat: TimeSeriesExtraStat
    color: string
    shortname: string
}

export function TimeSeriesPlot(props: { stats: TimeSeriesPlotProps[] }): ReactNode {
    // TODO this is largely unfinished. We need to make several improvements to this component
    // for it to be production-ready.
    // Including working with transposed comparisons
    const settingsElement = (): ReactElement => <div></div>

    const plotSpec = useMemo(
        () => {
            const marks = props.stats.map((stat) => {
                const x = stat.stat.years
                const y = stat.stat.timeSeries
                return Plot.line(
                    x.map((xval, i) => [xval, y[i]]),
                    { stroke: stat.color, strokeWidth: 2 },
                ) as Plot.Markish
            })
            marks.push(
                Plot.axisX({
                    label: 'Year',
                    tickFormat: (d: number) => d.toString(),
                }),
            )
            const xlabel = 'Year'
            const ylabel = props.stats[0].stat.name
            const ydomain = undefined
            const legend = { legend: true, range: props.stats.map(stat => stat.color), domain: props.stats.map(stat => stat.shortname) }
            return { marks, xlabel, ylabel, ydomain, legend }
        },
        [props.stats],
    )

    return (
        <PlotComponent
            plotSpec={() => plotSpec}
            settingsElement={settingsElement}
        />
    )
}
