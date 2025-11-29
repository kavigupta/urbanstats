import * as Plot from '@observablehq/plot'
import React, { ReactElement, useCallback, useEffect, useRef } from 'react'

import { useTranspose } from '../utils/transpose'

import { useScreenshotMode } from './screenshot'

import './plots.css'
import { zIndex } from '../utils/zIndex'

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
}): ReactElement {
    const transpose = useTranspose()

    const plotRef = useRef<HTMLDivElement>(null)

    const plotSpec = props.plotSpec

    const plotConfig = useCallback((transposeConfig: boolean): Plot.PlotOptions => {
        const { marks, xlabel, ylabel, ydomain, legend } = plotSpec(transposeConfig)
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
            width: transposeConfig ? undefined : 1000,
            height: transposeConfig ? 1000 : undefined,
            style: {
                fontSize: transposeConfig ? '2em' : '1em',
                fontFamily: 'Jost, Arial, sans-serif',
            },
            marginTop: 80,
            marginBottom: transposeConfig ? 80 : 40,
            marginLeft: 80,
            color: legend,
        }
        if (transposeConfig) {
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
            const plot = Plot.plot(plotConfig(transpose))
            plotRef.current.innerHTML = ''
            plotRef.current.appendChild(plot)
        }
    }, [props.plotSpec, transpose, plotConfig])

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
                        height: transpose ? `calc(100% - ${transposeTopMargin})` : undefined,
                        position: transpose ? 'relative' : undefined,
                        top: transpose ? transposeTopMargin : undefined,
                    }
                }
            >
            </div>
            {screenshotMode
                ? undefined
                : (
                        <div style={{ zIndex: zIndex.plotSettings, position: 'absolute', top: 0, right: 0, left: transpose ? 0 : undefined }}>
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
