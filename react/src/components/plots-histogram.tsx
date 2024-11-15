import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useMemo } from 'react'

// imort Observable plot
import { useColors } from '../page_template/colors'
import { HistogramType, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { IHistogram } from '../utils/protos'

import { PlotComponent } from './plots-general'
import { create_screenshot } from './screenshot'
import { CheckboxSetting } from './sidebar'

const Y_PAD = 0.025

interface HistogramProps {
    shortname: string
    histogram: IHistogram
    color: string
    universe_total: number
}

export function Histogram(props: { histograms: HistogramProps[] }): ReactNode {
    const [histogram_type] = useSetting('histogram_type')
    const [use_imperial] = useSetting('use_imperial')
    const [relative] = useSetting('histogram_relative')
    const binMin = props.histograms[0].histogram.binMin!
    const binSize = props.histograms[0].histogram.binSize!
    for (const histogram of props.histograms) {
        if (histogram.histogram.binMin !== binMin || histogram.histogram.binSize !== binSize) {
            throw new Error('histograms have different binMin or binSize')
        }
    }
    const settings_element = (plot_ref: React.RefObject<HTMLDivElement>): ReactElement => (
        <HistogramSettings plot_ref={plot_ref} shortnames={props.histograms.map(h => h.shortname)} />
    )

    const plot_spec = useMemo(
        () => {
            const title = props.histograms.length === 1 ? props.histograms[0].shortname : ''
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
            )
            marks.push(Plot.text([title], { frameAnchor: 'top', dy: -40 }))
            const xlabel = `Density (/${use_imperial ? 'mi' : 'km'}²)`
            const ylabel = relative ? '% of total' : 'Population'
            const ydomain: [number, number] = [max_value * (-Y_PAD), max_value * (1 + Y_PAD)]
            const legend = props.histograms.length === 1
                ? undefined
                : { legend: true, range: colors, domain: shortnames }
            return { marks, xlabel, ylabel, ydomain, legend }
        },
        [props.histograms, binMin, binSize, relative, histogram_type, use_imperial],
    )

    return (
        <PlotComponent
            plot_spec={plot_spec}
            settings_element={settings_element}
        />
    )
}

function HistogramSettings(props: {
    shortnames: string[]
    plot_ref: React.RefObject<HTMLDivElement>
}): ReactNode {
    const universe = useUniverse()
    const [histogram_type, setHistogramType] = useSetting('histogram_type')
    const colors = useColors()
    // dropdown for histogram type
    return (
        <div
            className="serif"
            style={{
                backgroundColor: colors.background, padding: '0.5em', border: `1px solid ${colors.textMain}`,
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
                            colors,
                        )
                    }
                }}
                width="20"
                height="20"
            />
            <select
                value={histogram_type}
                style={{ backgroundColor: colors.background, color: colors.textMain }}
                onChange={(e) => { setHistogramType(e.target.value as HistogramType) }}
                className="serif"
                data-test-id="histogram_type"
            >
                <option value="Line">Line</option>
                <option value="Line (cumulative)">Line (cumulative)</option>
                <option value="Bar">Bar</option>
            </select>
            <CheckboxSetting name="Relative Histograms" setting_key="histogram_relative" testId="histogram_relative" />
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
