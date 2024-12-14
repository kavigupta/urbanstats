import * as Plot from '@observablehq/plot'
import React, { ReactElement, useEffect, useRef } from 'react'

import { useScreenshotMode } from './screenshot'

interface DetailedPlotSpec {
    marks: Plot.Markish[]
    xlabel: string
    ylabel: string
    ydomain?: [number, number]
    legend?: { legend: boolean, range: string[], domain: string[] }
}

export function PlotComponent(props: {
    plotSpec: DetailedPlotSpec
    settingsElement: (plot_ref: React.RefObject<HTMLDivElement>) => ReactElement
}): ReactElement {
    const plotRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (plotRef.current) {
            const { marks, xlabel, ylabel, ydomain, legend } = props.plotSpec
            // y grid marks
            // marks.push(Plot.gridY([0, 25, 50, 75, 100]));
            const plotConfig = {
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
            const plot = Plot.plot(plotConfig)
            plotRef.current.innerHTML = ''
            plotRef.current.appendChild(plot)
        }
    }, [props.plotSpec])

    const screenshotMode = useScreenshotMode()

    // put a button panel in the top right corner
    return (
        <div style={{ width: '100%', position: 'relative' }}>
            <div
                className="histogram-svg-panel"
                ref={plotRef}
                style={
                    {
                        width: '100%',
                        // height: "20em"
                    }
                }
            >
            </div>
            {screenshotMode
                ? undefined
                : (
                        <div style={{ zIndex: 1000, position: 'absolute', top: 0, right: 0 }}>
                            {props.settingsElement(plotRef)}
                        </div>
                    )}
        </div>
    )
}
