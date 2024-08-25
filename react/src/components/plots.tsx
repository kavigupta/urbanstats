
import React, { useEffect, useRef } from 'react';
import { IExtraStatistic, IHistogram } from '../utils/protos';

// imort Observable plot
import * as Plot from "@observablehq/plot";
import { useSetting } from '../page_template/settings';

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
    const [x_idx_start, x_idx_end] = histogramBounds(props.histograms);
    const x = Array.from({ length: x_idx_end - x_idx_start }, (_, i) => binMin + (i + x_idx_start) * binSize);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const sum_each = props.histograms.map(histogram => sum(histogram.histogram.counts!));
    const series = props.histograms.map((histogram, histogram_idx) => {
        // return { name: histogram.longname, values: x.map((x, i) => [x, histogram.histogram.counts![i]]) };
        const counts = histogram.histogram.counts!;
        let after_val = 0;
        if (histogram_type === "Line (cumulative)") {
            for (let i = counts.length - 2; i >= 0; i--) {
                counts[i] += counts[i + 1];
            }
            // after_val = counts[counts.length - 1] / sum_each[histogram_idx];
        }
        return {
            name: histogram.longname,
            values: x.map((x, i) => ({
                x,
                y: (
                    i + x_idx_start >= counts.length ?
                        after_val
                        :
                        counts[i + x_idx_start] / sum_each[histogram_idx]
                ) * 100,
            })),
            color: histogram.color
        };
    });
    const series_single: { x: number, y: number, name: string, color: string }[] = [];
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        var off = i;
        off /= series.length - 1;
        off -= 0.5;
        off *= 0.9;
        off *= binSize;
        series_single.push(...
            s.values
                .map(v => ({ x: v.x + off, y: v.y, name: s.name, color: s.color }))
        )
    }
    console.log("SERIES", series);
    console.log(series.map(s => Math.max(...s.values.map(v => v.y))))
    const max_value = Math.max(...series.map(s => Math.max(...s.values.map(v => v.y))));
    console.log("MAX VALUE", max_value);
    const x_keypoints: number[] = [];
    for (let i = 0; i < x.length; i++) {
        const last_digit = (i + x_idx_start) % 10;
        if (last_digit == 0 || last_digit == 3 || last_digit == 7) {
            x_keypoints.push(x[i]);
        }
    }
    console.log(series);
    const marks: Plot.Markish[] = [];
    if (histogram_type === "Line" || histogram_type === "Line (cumulative)") {
        marks.push(
            ...series.map(s => Plot.line(s.values, {
                x: "x", y: "y", stroke: s.color, title: s.name
            })),
        );
    } else if (histogram_type === "Bar") {
        marks.push(
            Plot.barY(series_single, {
                x: "x",
                y: "y",
                fx: (d) => d.name,
                fill: (d) => d.color,
            })
        );
    } else {
        throw new Error("histogram_type not recognized: " + histogram_type);
    }

    marks.push(
        Plot.axisX(x_keypoints, { tickFormat: d => Math.pow(10, d).toFixed(0) }),
    );

    const plot_ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (plot_ref.current) {
            // add a line graph for each series
            // LINE GRAPH! NOT BAR GRAPH!
            const plot = Plot.plot({
                marks: marks,
                x: {
                    label: "Density",
                    grid: true
                },
                y: {
                    label: "% of total",
                    // padding: 0.1 * max_value,
                    domain: [max_value * (-Y_PAD), max_value * (1 + Y_PAD)]
                },
                grid: true,
                width: 1000,
                // set x labels to 
            },
            );
            plot_ref.current.innerHTML = "";
            plot_ref.current.appendChild(plot);
        }
    }, [histogram_type]);
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