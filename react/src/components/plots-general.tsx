import * as Plot from '@observablehq/plot'
import React, { ReactElement, useCallback, useEffect, useRef } from 'react'

import { useScreenshotMode } from './screenshot'

import './plots.css'

interface DetailedPlotSpec {
    marks: Plot.Markish[]
    xlabel: string
    ylabel: string
    ydomain?: [number, number]
    legend?: { legend: boolean, range: string[], domain: string[] }
}

export function PlotComponent(props: {
    plotSpec: () => DetailedPlotSpec
    settingsElement: (makePlot: () => HTMLElement) => ReactElement
}): ReactElement {
    const plotRef = useRef<HTMLDivElement>(null)

    const plotSpec = props.plotSpec

    const plotConfig = useCallback((): Plot.PlotOptions => {
        const { marks, xlabel, ylabel, ydomain, legend } = plotSpec()
        const result: Plot.PlotOptions = {
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
                fontFamily: 'Jost, Arial, sans-serif',
            },
            marginTop: 80,
            marginBottom: 40,
            marginLeft: 80,
            color: legend,
        }
        return result
    }, [plotSpec])

    useEffect(() => {
        if (plotRef.current) {
            const plot = Plot.plot(plotConfig())
            plotRef.current.innerHTML = ''
            plotRef.current.appendChild(plot)
        }
    }, [props.plotSpec, plotConfig])

    const screenshotMode = useScreenshotMode()

    // put a button panel in the top right corner
    return (
        <>
            <div
                className="histogram-svg-panel" // tied to CSS
                ref={plotRef}
                style={
                    {
                        width: '100%',
                    }
                }
            >
            </div>
            {screenshotMode
                ? undefined
                : (
                        <div style={{ zIndex: 1000, position: 'absolute', top: 0, right: 0 }}>
                            {props.settingsElement(() => {
                                const plot = Plot.plot(plotConfig())
                                const div = document.createElement('div')
                                div.style.width = '1000px'
                                div.style.height = '500px'
                                div.appendChild(plot)
                                return div
                            })}
                        </div>
                    )}
        </>
    )
}
