import * as Plot from '@observablehq/plot'
import React, { ReactElement, ReactNode, useCallback, useEffect, useRef } from 'react'

import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { useTranspose } from '../utils/transpose'
import { zIndex } from '../utils/zIndex'

import { createScreenshot, useScreenshotMode } from './screenshot'

import './plots.css'

const strokeDasharrays = ['1,0', '10,10', '2,5']

// picks the axis/grid mark constructors for whichever side is currently the visual x-axis
export function axisAndGrid(transpose: boolean): [typeof Plot.axisX, typeof Plot.gridX] {
    return transpose ? [Plot.axisY, Plot.gridY] : [Plot.axisX, Plot.gridX]
}

// "<prefix>\n<name1>: <value1>\n<name2>: <value2>..." when there's more than one series at this
// point, else just the single value (optionally labeled, e.g. Histogram's "Frequency: X")
export function multiSeriesTipTitle(prefix: string, names: string[], values: number[], formatValue: (v: number) => string, singleLabel?: string): string {
    let result = `${prefix}\n`
    if (names.length > 1) {
        result += names.map((name, i) => `${name}: ${formatValue(values[i])}`).join('\n')
    }
    else {
        result += singleLabel !== undefined ? `${singleLabel}: ${formatValue(values[0])}` : formatValue(values[0])
    }
    return result
}

// a line+dot series over an ordinal x-axis (e.g. months, temperature buckets), dash-aware,
// swapping x/y when transposed -- for the simple case where every series shares the same set
// of ordinal x positions, unlike Histogram's log-scale/relative/cumulative rendering
export function ordinalSeriesMarks(
    seriesData: { series: { color: string, subseriesName: string }, values: number[] }[],
    idxs: number[],
    idxKey: string,
    transpose: boolean,
    dashPatterns: Map<string, { pattern: string, name: string }>,
    xFor: (i: number) => number = i => i,
): Plot.Markish[] {
    const marks: Plot.Markish[] = []
    marks.push(
        ...seriesData.map(({ series, values }) =>
            Plot.line(
                idxs.map(i => ({ [idxKey]: xFor(i), value: values[i] })),
                {
                    x: transpose ? 'value' : idxKey,
                    y: transpose ? idxKey : 'value',
                    stroke: series.color,
                    strokeWidth: 3,
                    strokeDasharray: dashPatterns.size > 1 ? dashPatterns.get(series.subseriesName)?.pattern : undefined,
                },
            ) as Plot.Markish,
        ),
    )
    marks.push(
        ...seriesData.map(({ series, values }) =>
            Plot.dot(
                idxs.map(i => ({ [idxKey]: xFor(i), value: values[i] })),
                {
                    x: transpose ? 'value' : idxKey,
                    y: transpose ? idxKey : 'value',
                    fill: series.color,
                    r: 3,
                },
            ) as Plot.Markish,
        ),
    )
    return marks
}

// a Plot.tip anchored at the tallest series' value at each point, swapping x/y when transposed,
// styled with the theme's tooltip colors
export function transposeAwareTip<T>(
    data: T[],
    transpose: boolean,
    xKey: string,
    getValues: (d: T) => number[],
    title: (d: T) => string,
    colors: Colors,
): Plot.Markish {
    return Plot.tip(
        data,
        (transpose ? Plot.pointerY : Plot.pointerX)({
            x: transpose ? (d: T) => Math.max(...getValues(d)) : xKey,
            y: transpose ? xKey : (d: T) => Math.max(...getValues(d)),
            title,
            fill: colors.slightlyDifferentBackground,
            stroke: colors.borderNonShadow,
            textColor: colors.textMain,
        }),
    )
}

// the screenshot-download icon shared by every plot type's settings bar
export function PlotDownloadButton(props: { makePlot: () => HTMLElement, shortnames: string[], filenameSuffix: string }): ReactNode {
    const universe = useUniverse()
    const colors = useColors()
    return (
        <img
            src="/download.png"
            onClick={async () => {
                const plot = props.makePlot()
                document.body.appendChild(plot)
                const uniqueShortnames = Array.from(new Set(props.shortnames))
                await createScreenshot(
                    {
                        path: `${uniqueShortnames.join('_')}_${props.filenameSuffix}`,
                        overallWidth: plot.offsetWidth * 2,
                        elementsToRender: [plot],
                        heightMultiplier: 1.2,
                    },
                    universe,
                    colors,
                    { render: new Set(), wait: new Set() },
                )
                plot.remove()
            }}
            width="20"
            height="20"
            style={{ cursor: 'pointer' }}
        />
    )
}

interface LegendItem {
    shortname: string
    color: string
    subseriesName: string
}

function computeColorItems<T extends LegendItem>(items: T[]): { label: string, color: string }[] {
    const colorItems: { label: string, color: string }[] = []
    for (const item of items) {
        // handles duplicate names by just putting them all in if they're different colors
        const index = colorItems.findIndex(existing => existing.label === item.shortname && existing.color === item.color)
        if (index === -1) {
            colorItems.push({
                label: item.shortname,
                color: item.color,
            })
        }
    }
    if (colorItems.length <= 1) {
        return []
    }
    return colorItems
}

export function computeDashPatterns<T extends LegendItem>(items: T[], order?: string[]): Map<string, { pattern: string, name: string }> {
    const dashPatterns = new Map<string, { pattern: string, name: string }>()
    const subseriesNames = new Set<string>()
    items.forEach((item) => {
        subseriesNames.add(item.subseriesName)
    })
    const subseriesNamesOrdered = order ?? Array.from(subseriesNames).sort()
    assert(subseriesNamesOrdered.length <= strokeDasharrays.length, 'Too many subseries for dash patterns')
    items.forEach((item) => {
        const subId = subseriesNamesOrdered.indexOf(item.subseriesName)
        assert(subId !== -1, `subseriesName ${item.subseriesName} missing from dash order`)
        if (!dashPatterns.has(item.subseriesName)) {
            dashPatterns.set(item.subseriesName, {
                pattern: strokeDasharrays[subseriesNamesOrdered.length - 1 - subId],
                name: item.subseriesName,
            })
        }
    })
    return dashPatterns
}

export function manualLegend<T extends LegendItem>(items: T[], transpose: boolean, themeColors: Colors, dashOrder?: string[]): Plot.Markish[] {
    const colorItems = computeColorItems(items)

    const dashPatterns = computeDashPatterns(items, dashOrder)

    const dashPatternItems: { label: string, dashPattern: string }[] = []
    if (dashPatterns.size > 1) {
        const dashPatternsEnumerated = Array.from(dashPatterns.values()).sort((a, b) => a.name.localeCompare(b.name))
        dashPatternsEnumerated.forEach(({ pattern, name }) => {
            dashPatternItems.push({
                label: name,
                dashPattern: pattern,
            })
        })
    }

    const totalItems = colorItems.length + dashPatternItems.length
    if (totalItems === 0) {
        return []
    }

    const createLegend = (): SVGElement => {
        const svgNS = 'http://www.w3.org/2000/svg'
        const group = document.createElementNS(svgNS, 'g')
        // Position on the left side, but offset enough to avoid the y-axis
        const translateX = transpose ? 200 : 100
        const translateY = 70
        group.setAttribute('transform', `translate(${translateX} ${translateY})`)

        const paddingX = 12
        const paddingY = 10
        const rowHeight = 22
        const squareSize = 14
        const lineLength = 36
        const fontSize = 13
        const textSpacing = 10

        // Calculate width based on longest label
        const allLabels = [...colorItems.map(item => item.label), ...dashPatternItems.map(item => item.label)]
        let maxTextWidth = 0
        if (allLabels.length > 0) {
            // Use canvas to measure text width accurately
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            if (context) {
                context.font = `${fontSize}px serif`
                allLabels.forEach((label) => {
                    const textWidth = context.measureText(label).width
                    if (textWidth > maxTextWidth) {
                        maxTextWidth = textWidth
                    }
                })
            }
        }

        // Width = paddingX (left) + max(squareSize/lineLength) + textSpacing + textWidth + paddingX (right)
        const maxSymbolWidth = Math.max(squareSize, lineLength)
        const width = paddingX + maxSymbolWidth + textSpacing + maxTextWidth + paddingX
        const height = paddingY * 2 + rowHeight * totalItems

        const background = document.createElementNS(svgNS, 'rect')
        background.setAttribute('width', String(width))
        background.setAttribute('height', String(height))
        background.setAttribute('rx', '6')
        background.setAttribute('fill', themeColors.slightlyDifferentBackground)
        background.setAttribute('stroke', themeColors.borderNonShadow)
        group.appendChild(background)

        let rowIndex = 0

        // Render color squares
        colorItems.forEach((item) => {
            const row = document.createElementNS(svgNS, 'g')
            row.setAttribute('transform', `translate(${paddingX} ${paddingY + rowHeight * rowIndex})`)

            const centerY = rowHeight / 2
            const square = document.createElementNS(svgNS, 'rect')
            square.setAttribute('x', '0')
            square.setAttribute('y', String(centerY - squareSize / 2))
            square.setAttribute('width', String(squareSize))
            square.setAttribute('height', String(squareSize))
            square.setAttribute('fill', item.color)
            row.appendChild(square)

            const text = document.createElementNS(svgNS, 'text')
            text.setAttribute('x', String(squareSize + 10))
            text.setAttribute('y', String(centerY))
            text.setAttribute('font-size', `${fontSize}px`)
            text.setAttribute('fill', themeColors.textMain)
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('text-anchor', 'start')
            text.textContent = item.label
            row.appendChild(text)

            group.appendChild(row)
            rowIndex++
        })

        // Render dash pattern lines
        dashPatternItems.forEach((item) => {
            const row = document.createElementNS(svgNS, 'g')
            row.setAttribute('transform', `translate(${paddingX} ${paddingY + rowHeight * rowIndex})`)

            const centerY = rowHeight / 2
            const line = document.createElementNS(svgNS, 'line')
            line.setAttribute('x1', '0')
            line.setAttribute('x2', String(lineLength))
            line.setAttribute('y1', String(centerY))
            line.setAttribute('y2', String(centerY))
            line.setAttribute('stroke', themeColors.textMain)
            line.setAttribute('stroke-width', '3')
            if (item.dashPattern !== '1,0') {
                line.setAttribute('stroke-dasharray', item.dashPattern)
            }
            row.appendChild(line)

            const text = document.createElementNS(svgNS, 'text')
            text.setAttribute('x', String(lineLength + 10))
            text.setAttribute('y', String(centerY))
            text.setAttribute('font-size', `${fontSize}px`)
            text.setAttribute('fill', themeColors.textMain)
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('text-anchor', 'start')
            text.textContent = item.label
            row.appendChild(text)

            group.appendChild(row)
            rowIndex++
        })

        return group
    }

    return [createLegend]
}

interface DetailedPlotSpec {
    marks: Plot.Markish[]
    xlabel: string | null
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
            marginBottom: transposeConfig ? 90 : 55,
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
