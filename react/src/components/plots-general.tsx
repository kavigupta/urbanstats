import * as Plot from '@observablehq/plot'
import React, { ReactElement, useEffect, useRef } from 'react'

interface DetailedPlotSpec {
    marks: Plot.Markish[]
    xlabel: string
    ylabel: string
    ydomain?: [number, number]
    legend?: { legend: boolean, range: string[], domain: string[] }
}

export function PlotComponent(props: {
    plot_spec: DetailedPlotSpec
    screenshot_mode: boolean
    settings_element: (plot_ref: React.RefObject<HTMLDivElement>) => ReactElement
}): ReactElement {
    const plot_ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (plot_ref.current) {
            const { marks, xlabel, ylabel, ydomain, legend } = props.plot_spec
            // y grid marks
            // marks.push(Plot.gridY([0, 25, 50, 75, 100]));
            const plot_config = {
                marks,
                x: {
                    label: xlabel,
                },
                y: {
                    label: ylabel,
                    domain: ydomain,
                },
                grid: false,
                width: 1000,
                style: {
                    fontSize: '1em',
                    // font-family: 'Jost', 'Arial', sans-serif;
                    fontFamily: 'Jost|Arial|sans-serif',
                },
                marginTop: 80,
                marginBottom: 40,
                marginLeft: 80,
                color: legend,
            }
            const plot = Plot.plot(plot_config)
            plot_ref.current.innerHTML = ''
            plot_ref.current.appendChild(plot)
        }
    }, [props.plot_spec])
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
                            {props.settings_element(plot_ref)}
                        </div>
                    )}
        </div>
    )
}
