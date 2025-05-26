import * as Plot from '@observablehq/plot'
import React, { ReactElement, useEffect, useRef } from 'react'

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
    plotSpec: DetailedPlotSpec
    settingsElement: (plotRef: React.RefObject<HTMLDivElement>) => ReactElement
    transpose: boolean
}): ReactElement {
    const plotRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (plotRef.current) {
            const { marks, xlabel, ylabel, ydomain, legend } = props.plotSpec
            const plotConfig: Plot.PlotOptions = {
                marks,
                x: {
                    label: xlabel,
                },
                y: {
                    label: ylabel,
                    domain: ydomain,
                },
                grid: false,
                width: props.transpose ? undefined : 1000,
                height: props.transpose ? 800 : undefined,
                style: {
                    fontSize: '1em',
                    fontFamily: 'Jost|Arial|sans-serif',
                },
                marginTop: props.transpose ? 40 : 80,
                marginBottom: 40,
                marginLeft: props.transpose ? 40 : 80,
                color: legend,
            }
            if (props.transpose) {
                plotConfig.x = {
                    label: ylabel,
                    domain: ydomain,
                }
                plotConfig.y = {
                    label: xlabel,
                    reverse: true,
                }
            }
            const plot = Plot.plot(plotConfig)
            plotRef.current.innerHTML = ''
            plotRef.current.appendChild(plot)
        }
    }, [props.plotSpec, props.transpose])

    const screenshotMode = useScreenshotMode()

    const transposeTopMargin = '35px'

    // put a button panel in the top right corner
    return (
        <>
            <div
                className="histogram-svg-panel" // tied to CSS
                ref={plotRef}
                style={
                    {
                        width: '100%',
                        height: props.transpose ? `calc(100% - ${transposeTopMargin})` : undefined,
                        position: props.transpose ? 'relative' : undefined,
                        top: props.transpose ? transposeTopMargin : undefined,
                    }
                }
            >
            </div>
            {screenshotMode
                ? undefined
                : (
                        <div style={{ zIndex: 1000, position: 'absolute', top: 0, right: 0, left: props.transpose ? 0 : undefined }}>
                            {props.settingsElement(plotRef)}
                        </div>
                    )}
        </>
    )
}
