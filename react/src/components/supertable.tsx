import React, { CSSProperties, Fragment, ReactNode, useMemo } from 'react'

import { useColors } from '../page_template/colors'
import { Universe, useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { Article } from '../utils/protos'

import { ArticleRow, StatisticCellRenderingInfo } from './load-article'
import { extraHeaderSpaceForVertical, PlotProps, RenderedPlot } from './plots'
import { useScreenshotMode } from './screenshot'
import { ColumnIdentifier, MainHeaderRow, ComparisonLongnameCell, ComparisonTopLeftHeader, SuperHeaderHorizontal, StatisticNameCell, StatisticPanelLongnameCell, StatisticRowCells, TableHeaderContainer, TableRowContainer, TopLeftHeader, computeDisclaimerFootnotes, computeSizesForRow, CommonLayoutInformation } from './table'

export interface PlotSpec {
    statDescription: string
    plotProps: PlotProps[]
}

export interface SuperHeaderSpec {
    headerSpecs: CellSpec[]
    showBottomBar: boolean
    groupNames?: (string | undefined)[]
}

export interface LeftHeaderSpec {
    leftHeaderSpecs: CellSpec[]
    groupNames?: (string | undefined)[]
}

export interface DisclaimerFootnote {
    symbol: string
    text: string
}

export interface TableContentsProps {
    superHeaderSpec?: SuperHeaderSpec
    leftHeaderSpec: LeftHeaderSpec
    rowSpecs: CellSpec[][]
    horizontalPlotSpecs: (PlotSpec | undefined)[]
    verticalPlotSpecs: (PlotSpec | undefined)[]
    topLeftSpec: CellSpec
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
    highlightRowIndex?: number
}

export function TableContents(props: TableContentsProps): ReactNode {
    const universe = useUniverse()
    const colors = useColors()
    const screenshotMode = useScreenshotMode()
    assert(universe !== undefined, 'no universe')

    const rowsForFootnotes = useMemo(() => {
        const fromLeft = props.leftHeaderSpec.leftHeaderSpecs.filter((s): s is CellSpec & { type: 'statistic-name', row: ArticleRow } =>
            s.type === 'statistic-name' && s.row !== undefined,
        ).map(s => s.row)
        const fromSuper = (props.superHeaderSpec?.headerSpecs ?? []).filter((s): s is CellSpec & { type: 'statistic-name', row: ArticleRow } =>
            s.type === 'statistic-name' && s.row !== undefined,
        ).map(s => s.row)
        return [...fromLeft, ...fromSuper]
    }, [props.leftHeaderSpec.leftHeaderSpecs, props.superHeaderSpec?.headerSpecs])
    const disclaimerFootnotes = useMemo(() => computeDisclaimerFootnotes(rowsForFootnotes), [rowsForFootnotes])

    const headerHeight = props.verticalPlotSpecs.flatMap(p => p === undefined ? [] : p.plotProps).map(p => extraHeaderSpaceForVertical(p)).reduce((a, b) => Math.max(a, b), 0)
    const contentHeight = '379.5px'

    const shouldSetMinHeight = props.verticalPlotSpecs.some(p => p !== undefined)
    const overallMinHeight = shouldSetMinHeight ? `calc(${headerHeight}px + ${contentHeight})` : undefined
    const rowMinHeight = shouldSetMinHeight ? `calc(${contentHeight} / ${props.leftHeaderSpec.leftHeaderSpecs.length})` : undefined

    // should be 1 column, unless there are header specs. only use header specs if we can't infer from the cells.
    const ncols = props.rowSpecs.length !== 0 ? props.rowSpecs[0].length : props.superHeaderSpec?.headerSpecs.length ?? 1

    const extraSpaceRight = Array.from({ length: ncols }).map((_, i) => (props.verticalPlotSpecs[i] === undefined ? 0 : props.columnWidth))
    const columnFullWidths = extraSpaceRight.map(extra => props.columnWidth + extra)

    const columnWidthsInfo = Array.from({ length: ncols }).map((_, colIndex) => {
        const widthsEach = props.rowSpecs.map(row => row[colIndex].type === 'statistic-row' ? computeSizesForRow(row[colIndex].row, universe, props.simpleOrdinals) : undefined)
        const maxima = widthsEach.reduce((acc, curr) => {
            if (curr === undefined) {
                return acc
            }
            else if (acc === undefined) {
                return curr
            }
            return {
                ordinalColumnWidthEm: Math.max(acc.ordinalColumnWidthEm, curr.ordinalColumnWidthEm),
                percentileColumnWidthEm: Math.max(acc.percentileColumnWidthEm, curr.percentileColumnWidthEm),
                ordinalColumnPadding: Math.max(acc.ordinalColumnPadding, curr.ordinalColumnPadding),
            }
        }, { ordinalColumnWidthEm: 0, percentileColumnWidthEm: 0, ordinalColumnPadding: 0 })
        return maxima
    })

    return (
        <>
            {props.superHeaderSpec !== undefined && (
                <SuperHeaderHorizontal
                    {...props.superHeaderSpec}
                    headerSpecs={props.superHeaderSpec.headerSpecs.map((spec) => {
                        if (screenshotMode && spec.type === 'statistic-name' && spec.row?.disclaimer !== undefined) {
                            return { ...spec, footnoteSymbol: disclaimerFootnotes.getSymbol(spec.row.disclaimer) }
                        }
                        return spec
                    })}
                    leftSpacerWidth={props.widthLeftHeader}
                    widthsEach={columnFullWidths}
                />
            )}

            <div style={{ position: 'relative', minHeight: overallMinHeight }}>
                <TableHeaderContainer>
                    <MainHeaderRow
                        columnWidth={props.columnWidth}
                        topLeftSpec={props.topLeftSpec}
                        topLeftWidth={props.widthLeftHeader}
                        onlyColumns={props.onlyColumns}
                        extraSpaceRight={extraSpaceRight}
                        simpleOrdinals={props.simpleOrdinals}
                        columnWidthsInfo={columnWidthsInfo}
                    />
                </TableHeaderContainer>
                {props.rowSpecs.map((rowSpecsForItem, rowIndex) => {
                    const plotSpec = props.horizontalPlotSpecs[rowIndex]
                    return (
                        <SuperTableRow
                            key={`TableRowContainer_${rowIndex}`}
                            rowIndex={rowIndex}
                            rowMinHeight={rowMinHeight}
                            cellSpecs={rowSpecsForItem.map((cellSpec, colIndex) => {
                                if (cellSpec.type === 'statistic-row') {
                                    return {
                                        ...cellSpec,
                                        columnWidthsInfo: columnWidthsInfo[colIndex],
                                    }
                                }
                                return cellSpec
                            })}
                            extraSpaceRight={extraSpaceRight}
                            plotSpec={plotSpec}
                            leftHeaderSpec={(() => {
                                const spec = props.leftHeaderSpec.leftHeaderSpecs[rowIndex]
                                if (screenshotMode && spec.type === 'statistic-name' && spec.row?.disclaimer !== undefined) {
                                    return { ...spec, footnoteSymbol: disclaimerFootnotes.getSymbol(spec.row.disclaimer) }
                                }
                                return spec
                            })()}
                            widthLeftHeader={props.widthLeftHeader}
                            columnWidth={props.columnWidth}
                            groupName={props.leftHeaderSpec.groupNames?.[rowIndex]}
                            prevGroupName={rowIndex > 0 ? props.leftHeaderSpec.groupNames?.[rowIndex - 1] : undefined}
                            isHighlighted={props.highlightRowIndex === rowIndex}
                        />
                    )
                })}
                {props.verticalPlotSpecs.map((plotSpec, statIndex) => plotSpec
                    ? (
                            <div key={`statPlot_${statIndex}`} style={{ position: 'absolute', top: 0, left: `${props.widthLeftHeader + Array.from({ length: statIndex }).reduce((acc: number, unused, i) => acc + columnFullWidths[i], props.columnWidth)}%`, bottom: 0, width: `${props.columnWidth}%` }}>
                                <RenderedPlot statDescription={plotSpec.statDescription} plotProps={plotSpec.plotProps} />
                            </div>
                        )
                    : null,
                )}
            </div>
            {screenshotMode && disclaimerFootnotes.footnotes.length > 0 && (
                <div className="disclaimer-footnotes serif" style={{ fontSize: '0.85em', marginTop: '1em', color: colors.textMain }}>
                    {disclaimerFootnotes.footnotes.map(({ symbol, text }) => (
                        <div key={symbol} style={{ marginBottom: '0.35em' }}>
                            <sup>{symbol}</sup>
                            {' '}
                            {text}
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}

export function SuperTableRow(props: {
    rowIndex: number
    leftHeaderSpec: CellSpec
    cellSpecs: CellSpec[]
    plotSpec?: PlotSpec
    widthLeftHeader: number
    columnWidth: number
    rowMinHeight?: string
    groupName?: string
    prevGroupName?: string
    extraSpaceRight: number[]
    isHighlighted: boolean
}): ReactNode {
    return (
        <div>
            {props.groupName !== undefined && (props.groupName !== props.prevGroupName) && (
                <TableRowContainer index={props.rowIndex} isHighlighted={props.isHighlighted}>
                    <div style={{ width: '100%', padding: '1px' }}>
                        <span className="serif value">
                            <span>{props.groupName}</span>
                        </span>
                    </div>
                </TableRowContainer>
            )}
            <TableRowContainer index={props.rowIndex} minHeight={props.rowMinHeight} isHighlighted={props.isHighlighted}>
                <Cell {...props.leftHeaderSpec} width={props.widthLeftHeader} />
                {props.cellSpecs.map((spec, colIndex) => (
                    <Fragment key={`cells_${colIndex}_${props.rowIndex}`}>
                        <Cell {...spec} width={props.columnWidth} />
                        <div style={{ width: `${props.extraSpaceRight[colIndex]}%` }}></div>
                    </Fragment>
                ))}
            </TableRowContainer>
            {props.plotSpec && (
                <div style={{ width: '100%', position: 'relative' }}>
                    <RenderedPlot statDescription={props.plotSpec.statDescription} plotProps={props.plotSpec.plotProps} />
                </div>
            )}
        </div>
    )
}

export type CellSpec = ({ type: 'comparison-longname' } & ComparisonLongnameCellProps) |
    ({ type: 'statistic-name' } & StatisticNameCellProps) |
    ({ type: 'statistic-row' } & StatisticRowCellProps) |
    ({ type: 'statistic-panel-longname' } & StatisticPanelLongnameCellProps) |
    ({ type: 'comparison-top-left-header' } & TopLeftHeaderProps) |
    ({ type: 'top-left-header' } & TopLeftHeaderProps)

export function Cell(props: CellSpec & { width: number }): ReactNode {
    switch (props.type) {
        case 'comparison-longname':
            return <ComparisonLongnameCell {...props} width={props.width} />
        case 'statistic-name':
            return <StatisticNameCell {...props} width={props.width} />
        case 'statistic-row':
            return <StatisticRowCells {...props} width={props.width} />
        case 'statistic-panel-longname':
            return <StatisticPanelLongnameCell {...props} width={props.width} />
        case 'comparison-top-left-header':
            return <ComparisonTopLeftHeader {...props} width={props.width} />
        case 'top-left-header':
            return <TopLeftHeader {...props} width={props.width} />
    }
}

export interface ComparisonLongnameCellProps {
    articleIndex: number
    articles: Article[]
    names: string[]
    transpose: boolean
    sharedTypeOfAllArticles: string | null | undefined
    highlightIndex?: number
    draggable?: boolean
    articleId?: string
}

export interface StatisticPanelLongnameCellProps {
    longname: string
    currentUniverse: Universe
}

export interface StatisticNameCellProps {
    row?: ArticleRow
    renderedStatname: string
    longname: string
    currentUniverse: Universe
    center?: boolean
    highlightIndex?: number
    transpose?: boolean
    isIndented?: boolean
    displayName?: string
    footnoteSymbol?: string
    sortInfo?: {
        sortDirection: 'up' | 'down' | 'both'
        onSort: () => void
    }
}

export interface StatisticRowCellProps {
    longname: string
    statisticStyle?: CSSProperties
    row: StatisticCellRenderingInfo
    onlyColumns?: string[]
    blankColumns?: string[]
    onNavigate?: (newArticle: string) => void
    simpleOrdinals: boolean
    extraSpaceRight?: number
    columnWidthsInfo?: CommonLayoutInformation
}

export interface TopLeftHeaderProps {
    statNameOverride?: string
}
