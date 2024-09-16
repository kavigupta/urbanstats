import * as Plot from '@observablehq/plot'
import React, { ReactNode, useEffect, useRef } from 'react'

// imort Observable plot
import { HistogramType, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { IHistogram } from '../utils/protos'

import { ExtraStat } from './load-article'
import { create_screenshot } from './screenshot'
import { CheckboxSetting } from './sidebar'

interface PlotProps {
    shortname?: string
    extra_stat?: ExtraStat
    color: string
}

const Y_PAD = 0.025

export function WithPlot(props: { children: React.ReactNode, plot_props: PlotProps[], expanded: boolean, screenshot_mode: boolean }): ReactNode {
    return (
        <div className="plot">
            {props.children}
            {props.expanded ? <RenderedPlot plot_props={props.plot_props} screenshot_mode={props.screenshot_mode} /> : null}
        </div>
    )
}

function RenderedPlot({ plot_props, screenshot_mode }: { plot_props: PlotProps[], screenshot_mode: boolean }): ReactNode {
    if (plot_props.some(p => p.extra_stat?.stat.histogram)) {
        plot_props = plot_props.filter(p => p.extra_stat?.stat.histogram)
        return (
            <Histogram
                histograms={plot_props.map(
                    props => ({
                        shortname: props.shortname!,
                        histogram: props.extra_stat!.stat.histogram!,
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

interface HistogramProps {
    shortname: string
    histogram: IHistogram
    color: string
    universe_total: number
}

function Histogram(props: { histograms: HistogramProps[], screenshot_mode: boolean }): ReactNode {
    const [histogram_type] = useSetting('histogram_type')
    const [use_imperial] = useSetting('use_imperial')
    const [relative] = useSetting('histogram_relative')
    // series for each histogram. Each series is a list of [x, y] pairs
    // x start at histogram.binMin and goes up by histogram.binSize
    // y is histogram.counts
    // assert all the histograms have the same binMin and binSize
    const binMin = props.histograms[0].histogram.binMin!
    const binSize = props.histograms[0].histogram.binSize!
    for (const histogram of props.histograms) {
        if (histogram.histogram.binMin !== binMin || histogram.histogram.binSize !== binSize) {
            throw new Error('histograms have different binMin or binSize')
        }
    }
    // get the length of the x values
    // get the x values

    const plot_ref = useRef<HTMLDivElement>(null)
    const title = props.histograms.length === 1 ? props.histograms[0].shortname : ''
    useEffect(() => {
        if (plot_ref.current) {
            const colors = props.histograms.map(h => h.color)
            const shortnames = props.histograms.map(h => h.shortname)
            const render_y = relative ? (y: number) => `${y.toFixed(2)}%` : (y: number) => render_number_highly_rounded(y, 2)

            const [x_idx_start, x_idx_end] = histogramBounds(props.histograms)
            const xidxs = Array.from({ length: x_idx_end - x_idx_start }, (_, i) => i + x_idx_start)
            const [x_axis_marks, render_x] = x_axis(xidxs, binSize, binMin, use_imperial)
            const [marks, max_value] = createHistogramMarks(props.histograms, xidxs, histogram_type, relative, render_x, render_y)
            marks.push(
                ...x_axis_marks,
                ...y_axis(max_value),
                Plot.text([title], { frameAnchor: 'top', dy: -40 }),
            )
            // y grid marks
            // marks.push(Plot.gridY([0, 25, 50, 75, 100]));
            const plot_config = {
                marks,
                x: {
                    label: `Density (/${use_imperial ? 'mi' : 'km'}²)`,
                },
                y: {
                    label: relative ? '% of total' : 'Population',
                    domain: [max_value * (-Y_PAD), max_value * (1 + Y_PAD)],
                },
                grid: false,
                width: 1000,
                style: {
                    fontSize: '1em',
                    // font-family: 'Jost', 'Arial', sans-serif;
                    fontFamily: 'Jost Arial sans-serif',
                },
                marginTop: 80,
                marginBottom: 40,
                marginLeft: 80,
                color: props.histograms.length === 1
                    ? undefined
                    : { legend: true, range: colors, domain: shortnames },
            }
            const plot = Plot.plot(plot_config)
            plot_ref.current.innerHTML = ''
            plot_ref.current.appendChild(plot)
        }
    }, [histogram_type, use_imperial, relative, binMin, binSize, props.histograms, title])
    // put a button panel in the top right corner
    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <div
                className="histogram-svg-panel"
                ref={plot_ref}
                style={
                    {
                        width: '100%',
                        // height: "20em"
                    }
                }
            >
            </div>
            {props.screenshot_mode
                ? undefined
                : (
                        <div style={{ zIndex: 1000, position: 'absolute', top: 0, right: 0 }}>
                            <HistogramSettings plot_ref={plot_ref} shortnames={props.histograms.map(h => h.shortname)} />
                        </div>
                    )}
        </div>
    )
}

function HistogramSettings(props: {
    shortnames: string[]
    plot_ref: React.RefObject<HTMLDivElement>
}): ReactNode {
    const universe = useUniverse()
    const [histogram_type, setHistogramType] = useSetting('histogram_type')
    // dropdown for histogram type
    return (
        <div
            className="serif"
            style={{
                backgroundColor: '#fff8f0', padding: '0.5em', border: '1px solid black',
                display: 'flex', gap: '0.5em',
            }}
        >
            <img
                src="/download.png"
                onClick={() => {
                    if (props.plot_ref.current) {
                        void create_screenshot(
                            {
                                path: `${props.shortnames.join('_')}_histogram`,
                                overall_width: props.plot_ref.current.offsetWidth * 2,
                                elements_to_render: [props.plot_ref.current],
                                height_multiplier: 1.2,
                            },
                            universe,
                        )
                    }
                }}
                width="20"
                height="20"
            />
            <select value={histogram_type} onChange={(e) => { setHistogramType(e.target.value as HistogramType) }} className="serif">
                <option value="Line">Line</option>
                <option value="Line (cumulative)">Line (cumulative)</option>
                <option value="Bar">Bar</option>
            </select>
            <CheckboxSetting name="Relative Histograms" setting_key="histogram_relative" />
        </div>
    )
}

function histogramBounds(histograms: HistogramProps[]): [number, number] {
    let x_idx_end = Math.max(...histograms.map(histogram => histogram.histogram.counts!.length))
    x_idx_end += 1
    const zeros_at_front = (arr: number[]): number => {
        let i = 0
        while (i < arr.length && arr[i] === 0) {
            i++
        }
        return i
    }
    let x_idx_start = Math.min(...histograms.map(histogram => zeros_at_front(histogram.histogram.counts!)))

    if (x_idx_start > 0) {
        x_idx_start--
    }

    // round x_idx_start down to the nearest number which, when divided by 10, has a remainder of 0, 3, or 7

    while (x_idx_start % 10 !== 0 && x_idx_start % 10 !== 3 && x_idx_start % 10 !== 7) {
        x_idx_start--
    }

    // same for x_idx_end
    while (x_idx_end % 10 !== 0 && x_idx_end % 10 !== 3 && x_idx_end % 10 !== 7) {
        x_idx_end++
    }

    return [x_idx_start, x_idx_end]
}

interface Series {
    values: { name: string, xidx: number, y: number }[]
    color: string
}

function mulitipleSeriesConsistentLength(histograms: HistogramProps[], xidxs: number[], relative: boolean, is_cumulative: boolean): Series[] {
    // Create a list of series, each with the same length
    const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0)
    const sum_each = histograms.map(histogram => sum(histogram.histogram.counts!))
    const series = histograms.map((histogram, histogram_idx) => {
        const counts = [...histogram.histogram.counts!]
        const after_val = 0
        if (is_cumulative) {
            for (let i = counts.length - 2; i >= 0; i--) {
                counts[i] += counts[i + 1]
            }
        }
        return {
            values: xidxs.map(xidx => ({
                name: histogram.shortname,
                xidx,
                y: (
                    xidx >= counts.length
                        ? after_val
                        : counts[xidx] / sum_each[histogram_idx]
                ) * (relative ? 100 : histogram.universe_total),
            })),
            color: histogram.color,
        }
    })
    return series
}

function dovetailSequences(series: { values: { xidx: number, y: number, name: string }[], color: string }[]): { xidx_left: number, xidx_right: number, y: number, color: string }[] {
    const series_single: { xidx_left: number, xidx_right: number, y: number, color: string }[] = []
    for (let i = 0; i < series.length; i++) {
        const s = series[i]
        const width = 1 / (series.length) * 0.8
        const off = (i - (series.length - 1) / 2) * width
        series_single.push(...s.values
            .map(v => ({
                xidx_left: v.xidx + off, xidx_right: v.xidx + off + width,
                y: v.y, color: s.color, name: v.name,
            })),
        )
    }
    return series_single
}

function maxSequences(series: { values: { xidx: number, y: number, name: string }[] }[]): { xidx: number, y: number, names: string[], ys: number[] }[] {
    const series_max: { xidx: number, y: number, names: string[], ys: number[] }[] = []
    for (let i = 0; i < series[0].values.length; i++) {
        series_max.push({
            xidx: series[0].values[i].xidx,
            y: Math.max(...series.map(s => s.values[i].y)),
            names: series.map(s => s.values[i].name),
            ys: series.map(s => s.values[i].y),
        })
    }
    return series_max
}

function x_axis(xidxs: number[], binSize: number, binMin: number, use_imperial: boolean): [Plot.Markish[], (x: number) => string] {
    const x_keypoints: number[] = []
    for (const xidx of xidxs) {
        let last_digit = xidx % 10
        if (use_imperial) {
            last_digit = (last_digit + 4) % 10
        }
        if (last_digit === 0 || last_digit === 3 || last_digit === 7) {
            x_keypoints.push(xidx)
        }
    }
    const adjustment = use_imperial ? Math.log10(1.60934) * 2 : 0
    return [
        [
            Plot.axisX(x_keypoints, { tickFormat: d => render_pow10(d * binSize + binMin + adjustment) }),
            Plot.gridX(x_keypoints),
        ],
        x => `${render_number_highly_rounded(Math.pow(10, x * binSize + binMin + adjustment), 2)}/${use_imperial ? 'mi' : 'km'}²`,
    ]
}

function y_axis(max_value: number): (Plot.CompoundMark | Plot.RuleY)[] {
    const MIN_N_Y_TICKS = 5
    const ideal_tick_gap = max_value / MIN_N_Y_TICKS
    const log10_tick_gap_times_3 = Math.floor(Math.log10(ideal_tick_gap) * 3)
    const tick_gap_oom = Math.pow(10, Math.floor(log10_tick_gap_times_3 / 3))
    const tick_gap_mantissa = log10_tick_gap_times_3 % 3 === 0 ? 1 : log10_tick_gap_times_3 % 3 === 1 ? 2 : 5
    const tick_gap = tick_gap_mantissa * tick_gap_oom
    const max_value_rounded = Math.ceil(max_value / tick_gap) * tick_gap
    const y_keypoints = Array.from({ length: Math.floor(max_value_rounded / tick_gap) + 1 }, (_, i) => i * tick_gap)

    return [
        Plot.axisY(y_keypoints, { tickFormat: (d: number) => render_number_highly_rounded(d, 1) }),
        Plot.gridY(y_keypoints),
    ]
}

function pow10_moral(x: number): number {
    // 10 ** x, but "morally" so, i.e., 10 ** 0.3 = 2
    if (x < 0) {
        return 1 / pow10_moral(-x)
    }
    if (x >= 1) {
        return 10 ** Math.floor(x) * pow10_moral(x - Math.floor(x))
    }
    const x10 = x * 10
    const error_round = Math.abs(x10 - Math.round(x10))
    if (error_round > 0.2) {
        return 10 ** x
    }
    if (Math.round(x10) === 0) {
        return 1
    }
    if (Math.round(x10) === 3) {
        return 2
    }
    if (Math.round(x10) === 7) {
        return 5
    }
    return 10 ** x
}

function render_pow10(x: number): string {
    const p10 = pow10_moral(x)

    return render_number_highly_rounded(p10)
}

function render_number_highly_rounded(x: number, places = 0): string {
    if (x < 1000) {
        return x.toFixed(0)
    }
    if (x < 1e6) {
        return `${(x / 1e3).toFixed(places)}k`
    }
    if (x < 1e9) {
        return `${(x / 1e6).toFixed(places)}M`
    }
    if (x < 1e12) {
        return `${(x / 1e9).toFixed(places)}B`
    }
    return x.toExponential(1)
}

function createHistogramMarks(
    histograms: HistogramProps[], xidxs: number[],
    histogram_type: HistogramType, relative: boolean,
    render_x: (x: number) => string,
    render_y: (y: number) => string,
): [Plot.Markish[], number] {
    const series = mulitipleSeriesConsistentLength(histograms, xidxs, relative, histogram_type === 'Line (cumulative)')
    const series_single = dovetailSequences(series)

    const max_value = Math.max(...series.map(s => Math.max(...s.values.map(v => v.y))))
    const tip = Plot.tip(maxSequences(series), Plot.pointerX({
        x: 'xidx', y: 'y',
        title: (d: { names: string[], xidx: number, ys: number[] }) => {
            let result = `Density: ${render_x(d.xidx)}\n`
            if (d.names.length > 1) {
                result += d.names.map((name: string, i: number) => `${name}: ${render_y(d.ys[i])}`).join('\n')
            }
            else {
                result += `Frequency: ${render_y(d.ys[0])}`
            }
            return result
        },
    }))
    const color = histograms.length === 1 ? histograms[0].color : 'name'
    const marks: Plot.Markish[] = []
    if (histogram_type === 'Line' || histogram_type === 'Line (cumulative)') {
        marks.push(
            ...series.map(s => Plot.line(s.values, {
                x: 'xidx', y: 'y', stroke: color, strokeWidth: 4,
            })),
        )
    }
    else {
        marks.push(
            Plot.rectY(series_single, {
                x1: 'xidx_left',
                x2: 'xidx_right',
                y: 'y',
                fill: color,
            }),
        )
    }
    marks.push(tip)
    return [marks, max_value]
}
