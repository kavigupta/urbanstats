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
    plotSpec: (transpose: boolean) => DetailedPlotSpec
    settingsElement: (makePlot: () => HTMLElement) => ReactElement
    transpose: boolean
}): ReactElement {
    const plotRef = useRef<HTMLDivElement>(null)

    const plotSpec = props.plotSpec

    const plotConfig = useCallback((transpose: boolean): Plot.PlotOptions => {
        const { marks, xlabel, ylabel, ydomain, legend } = plotSpec(transpose)
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
            width: transpose ? undefined : 1000,
            height: transpose ? 1000 : undefined,
            style: {
                fontSize: transpose ? '2em' : '1em',
                fontFamily: 'Jost, Arial, sans-serif',
            },
            marginTop: 80,
            marginBottom: transpose ? 80 : 40,
            marginLeft: 80,
            color: legend,
        }
        if (transpose) {
            result.x = {
                label: ylabel,
                domain: ydomain,
            }
            result.y = {
                label: xlabel,
                reverse: true,
            }
        }
        return result
    }, [plotSpec])

    useEffect(() => {
        if (plotRef.current) {
            const plot = Plot.plot(plotConfig(props.transpose))
            plotRef.current.innerHTML = ''
            plotRef.current.appendChild(plot)
        }
    }, [props.plotSpec, props.transpose, plotConfig])

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
                            {props.settingsElement(() => {
                                const plot = Plot.plot(plotConfig(false))
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
