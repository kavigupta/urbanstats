
import React, { useEffect, useRef } from 'react';
import { IExtraStatistic, IHistogram } from '../utils/protos';

// imort Observable plot
import * as Plot from "@observablehq/plot";
import { HistogramType, useSetting } from '../page_template/settings';

interface PlotProps {
    longname?: string;
    extra_stat?: IExtraStatistic;
    color: string;
}

const Y_PAD = 0.1;

export function WithPlot(props: { children: React.ReactNode, plot_props: PlotProps[], expanded: boolean }) {
    return (
        <div className="plot">
            {props.children}
            {props.expanded ? <RenderedPlot plot_props={props.plot_props} /> : null}
        </div>
    )
}

function RenderedPlot({ plot_props }: { plot_props: PlotProps[] }) {
    if (plot_props[0].extra_stat?.histogram) {
        // check all
        for (const props of plot_props) {
            if (!props.extra_stat?.histogram) {
                throw new Error("histogram expected but not found");
            }
        }
        return <Histogram histograms={plot_props.map(
            props => ({ longname: props.longname!, histogram: props.extra_stat!.histogram!, color: props.color })
        )} />
    }
    throw new Error("plot not recognized: " + JSON.stringify(plot_props));
}

interface HistogramProps {
    longname: string;
    histogram: IHistogram;
    color: string;
}

function Histogram(props: { histograms: HistogramProps[] }) {
    const [histogram_type] = useSetting("histogram_type");
    const [use_imperial] = useSetting("use_imperial");
    // series for each histogram. Each series is a list of [x, y] pairs
    // x start at histogram.binMin and goes up by histogram.binSize
    // y is histogram.counts
    console.log("HISTOGRAMS", props.histograms);
    // assert all the histograms have the same binMin and binSize
    const binMin = props.histograms[0].histogram.binMin!;
    const binSize = props.histograms[0].histogram.binSize!;
    for (const histogram of props.histograms) {
        if (histogram.histogram.binMin !== binMin || histogram.histogram.binSize !== binSize) {
            throw new Error("histograms have different binMin or binSize");
        }
    }
    // get the length of the x values
    // get the x values

    const plot_ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (plot_ref.current) {
            const [x_idx_start, x_idx_end] = histogramBounds(props.histograms);
            const xidxs = Array.from({ length: x_idx_end - x_idx_start }, (_, i) => i + x_idx_start);
            const [marks, domain]: [Plot.Markish[], [number, number]] = createHistogramMarks(props.histograms, xidxs, histogram_type);
            marks.push(
                ...x_axis(xidxs, binSize, binMin, use_imperial)
            );
            // y grid marks
            // marks.push(Plot.gridY([0, 25, 50, 75, 100]));
            const plot = Plot.plot({
                marks: marks,
                x: {
                    // ^2
                    label: `Density (/${use_imperial ? "mi" : "km"}²)`,
                },
                y: {
                    label: "% of total",
                    domain: domain,
                    grid: true,
                },
                grid: false,
                width: 1000,
                style: {
                    fontSize: "1em",
                    fontFamily: "Jost"
                },
                marginBottom: 40,
                title: "",
            },
            );
            plot_ref.current.innerHTML = "";
            plot_ref.current.appendChild(plot);
        }
    }, [histogram_type, use_imperial]);
    // put a button panel in the top right corner
    return <div style={{ width: "100%", position: "relative" }} >
        <div ref={plot_ref} style={
            {
                width: "100%",
                // height: "20em"
            }
        }></div>
        <div style={{ zIndex: 1000, position: "absolute", top: 0, right: 0 }}>
            <HistogramSettings />
        </div>
    </div>
}

function HistogramSettings() {
    const [histogram_type, setHistogramType] = useSetting("histogram_type");
    // dropdown for histogram type
    return <select value={histogram_type} onChange={e => setHistogramType(e.target.value as any)} className="serif">
        <option value="Line">Line</option>
        <option value="Line (cumulative)">Line (cumulative)</option>
        <option value="Bar">Bar</option>
    </select>
}

function histogramBounds(histograms: HistogramProps[]): [number, number] {
    var x_idx_end = Math.max(...histograms.map(histogram => histogram.histogram.counts!.length));
    x_idx_end += 1;
    const zeros_at_front = (arr: number[]) => {
        let i = 0;
        while (i < arr.length && arr[i] === 0) {
            i++;
        }
        return i;
    }
    var x_idx_start = Math.min(...histograms.map(histogram => zeros_at_front(histogram.histogram.counts!)));

    if (x_idx_start > 0) {
        x_idx_start--;
    }

    // round x_idx_start down to the nearest number which, when divided by 10, has a remainder of 0, 3, or 7

    while (x_idx_start % 10 !== 0 && x_idx_start % 10 !== 3 && x_idx_start % 10 !== 7) {
        x_idx_start--;
    }

    // same for x_idx_end
    while (x_idx_end % 10 !== 0 && x_idx_end % 10 !== 3 && x_idx_end % 10 !== 7) {
        x_idx_end++;
    }

    return [x_idx_start, x_idx_end];
}

function mulitipleSeriesConsistentLength(histograms: HistogramProps[], xidxs: number[], is_cumulative: boolean) {
    // Create a list of series, each with the same length
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const sum_each = histograms.map(histogram => sum(histogram.histogram.counts!));
    const series = histograms.map((histogram, histogram_idx) => {
        const counts = [...histogram.histogram.counts!];
        let after_val = 0;
        if (is_cumulative) {
            for (let i = counts.length - 2; i >= 0; i--) {
                counts[i] += counts[i + 1];
            }
        }
        return {
            name: histogram.longname,
            values: xidxs.map(xidx => ({
                xidx,
                y: (
                    xidx >= counts.length ?
                        after_val
                        :
                        counts[xidx] / sum_each[histogram_idx]
                ) * 100,
            })),
            color: histogram.color
        };
    });
    return series;
}

function dovetailSequences(series: { name: string, values: { xidx: number, y: number }[], color: string }[]) {
    const series_single: { xidx_left: number, xidx_right: number, y: number, name: string, color: string }[] = [];
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        var width = 1 / (series.length) * 0.8;
        var off = i - (series.length - 1) / 2;
        off *= width;
        series_single.push(...
            s.values
                .map(v => ({
                    xidx_left: v.xidx + off, xidx_right: v.xidx + off + width,
                    y: v.y, name: s.name, color: s.color
                }))
        )
    }
    return series_single;
}

function x_axis(xidxs: number[], binSize: number, binMin: number, use_imperial: boolean) {
    const x_keypoints: number[] = [];
    for (let i = 0; i < xidxs.length; i++) {
        var last_digit = xidxs[i] % 10;
        if (use_imperial) {
            last_digit = (last_digit + 4) % 10;
        }
        if (last_digit == 0 || last_digit == 3 || last_digit == 7) {
            x_keypoints.push(xidxs[i]);
        }
    }
    const adjustment = use_imperial ? Math.log10(1.60934) * 2 : 0;
    return [
        Plot.axisX(x_keypoints, { tickFormat: d => render_pow10(d * binSize + binMin + adjustment) }),
        Plot.gridX(x_keypoints)
    ]
}

function pow10_moral(x: number): number {
    // 10 ** x, but "morally" so, i.e., 10 ** 0.3 = 2
    if (x < 0) {
        return 1 / pow10_moral(-x);
    }
    if (x >= 1) {
        return 10 ** Math.floor(x) * pow10_moral(x - Math.floor(x));
    }
    const x10 = x * 10;
    const error_round = Math.abs(x10 - Math.round(x10));
    if (error_round > 0.2) {
        return 10 ** x;
    }
    if (Math.round(x10) == 0) {
        return 1;
    }
    if (Math.round(x10) == 3) {
        return 2;
    }
    if (Math.round(x10) == 7) {
        return 5;
    }
    return 10 ** x;
}

function render_pow10(x: number) {
    const p10 = pow10_moral(x);

    if (p10 < 1000) {
        return p10.toString();
    }
    if (p10 < 1e6) {
        return (p10 / 1e3).toFixed(0) + "k";
    }
    if (p10 < 1e9) {
        return (p10 / 1e6).toFixed(0) + "M";
    }
    if (p10 < 1e12) {
        return (p10 / 1e9).toFixed(0) + "B";
    }
    return p10.toExponential(1);
}

function createHistogramMarks(histograms: HistogramProps[], xidxs: number[], histogram_type: HistogramType): [Plot.Markish[], [number, number]] {
    const series = mulitipleSeriesConsistentLength(histograms, xidxs, histogram_type === "Line (cumulative)");
    const series_single = dovetailSequences(series);

    const max_value = Math.max(...series.map(s => Math.max(...s.values.map(v => v.y))));
    const marks: Plot.Markish[] = [];
    if (histogram_type === "Line" || histogram_type === "Line (cumulative)") {
        marks.push(
            ...series.map(s => Plot.line(s.values, {
                x: "xidx", y: "y", stroke: s.color
            })),
        );
    } else if (histogram_type === "Bar") {
        marks.push(
            Plot.rectY(series_single, {
                x1: "xidx_left",
                x2: "xidx_right",
                y: "y",
                fx: "name",
                fill: (d) => d.color,
            })
        );
    } else {
        throw new Error("histogram_type not recognized: " + histogram_type);
    }
    const domain: [number, number] = [max_value * (-Y_PAD), max_value * (1 + Y_PAD)];
    return [marks, domain];
}