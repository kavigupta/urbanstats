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
    const settings_element = (): ReactElement => <div></div>

    const plot_spec = useMemo(
        () => {
            // const title = props.histograms.length === 1 ? props.histograms[0].shortname : ''
            // const colors = props.histograms.map(h => h.color)
            // const shortnames = props.histograms.map(h => h.shortname)
            // const render_y = relative ? (y: number) => `${y.toFixed(2)}%` : (y: number) => render_number_highly_rounded(y, 2)

            // const [x_idx_start, x_idx_end] = histogramBounds(props.histograms)
            // const xidxs = Array.from({ length: x_idx_end - x_idx_start }, (_, i) => i + x_idx_start)
            // const [x_axis_marks, render_x] = x_axis(xidxs, binSize, binMin, use_imperial)
            // const [marks, max_value] = createHistogramMarks(props.histograms, xidxs, histogram_type, relative, render_x, render_y)
            // marks.push(
            //     ...x_axis_marks,
            //     ...y_axis(max_value),
            // )
            // marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
            // const xlabel = `Density (/${use_imperial ? 'mi' : 'km'}²)`
            // const ylabel = relative ? '% of total' : 'Population'
            // const ydomain: [number, number] = [max_value * (-Y_PAD), max_value * (1 + Y_PAD)]
            // const legend = props.histograms.length === 1
            //     ? undefined
            //     : { legend: true, range: colors, domain: shortnames }
            const marks = props.stats.map((stat) => {
                const x = stat.stat.years
                const y = stat.stat.time_series
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
            plot_spec={plot_spec}
            settings_element={settings_element}
        />
    )
}
