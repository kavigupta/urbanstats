
import React from 'react';
import { IExtraStatistic } from '../utils/protos';

interface PlotProps {
    longname?: string;
    extra_stat?: IExtraStatistic;
}

export function WithPlot(props: { children: React.ReactNode, plot_props: PlotProps[], expanded: boolean }) {
    return (
        <div className="plot">
            {props.children}
            {props.expanded ? props.plot_props.map((plot_prop, idx) => <Plot key={idx} {...plot_prop} />) : null}
        </div>
    )
}

function Plot(props: PlotProps) {
    return (
        <div className="plot">
            <h3>{props.longname}</h3>
            <p>{JSON.stringify(props.extra_stat?.histogram)}</p>
        </div>
    )
}