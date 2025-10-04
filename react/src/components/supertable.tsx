import React, { CSSProperties, ReactNode } from 'react'

import { statParents } from '../page_template/statistic-tree'
import { Article } from '../utils/protos'

import { ArticleRow } from './load-article'
import { extraHeaderSpaceForVertical, PlotProps, RenderedPlot } from './plots'
import { ColumnIdentifier, ComparisonHeaderRow, ComparisonLongnameCell, ComparisonTopLeftHeader, SuperHeaderHorizontal, StatisticNameCell, StatisticRowCells, TableHeaderContainer, TableRowContainer } from './table'

export interface PlotSpec {
    statDescription: string
    plotProps: PlotProps[]
}

export interface SuperHeaderSpec {
    headerSpecs: CellSpec[]
    showBottomBar: boolean
}

export interface TableContentsProps {
    superHeaderSpec?: SuperHeaderSpec
    leftHeaderSpecs: CellSpec[]
    rowSpecs: CellSpec[][]
    horizontalPlotSpecs: (PlotSpec | undefined)[]
    verticalPlotSpecs: (PlotSpec | undefined)[]
    topLeftSpec: CellSpec
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
}

export function TableContents(props: TableContentsProps): ReactNode {
    const headerHeight = props.verticalPlotSpecs.flatMap(p => p === undefined ? [] : p.plotProps).map(p => extraHeaderSpaceForVertical(p)).reduce((a, b) => Math.max(a, b), 0)
    const contentHeight = '379.5px'

    const shouldSetMinHeight = props.verticalPlotSpecs.some(p => p !== undefined)
    const overallMinHeight = shouldSetMinHeight ? `calc(${headerHeight}px + ${contentHeight})` : undefined
    const rowMinHeight = shouldSetMinHeight ? `calc(${contentHeight} / ${props.leftHeaderSpecs.length})` : undefined

    // should be 1 column, unless there are header specs. only use header specs if we can't infer from the cells.
    const ncols = props.rowSpecs.length !== 0 ? props.rowSpecs[0].length : props.superHeaderSpec?.headerSpecs.length ?? 1

    const expandedColumnWidth = (columnIndex: number): number => (props.verticalPlotSpecs[columnIndex] === undefined ? 1 : 2) * props.columnWidth

    return (
        <>
            {props.superHeaderSpec !== undefined && (
                <SuperHeaderHorizontal
                    headerSpecs={props.superHeaderSpec.headerSpecs}
                    showBottomBar={props.superHeaderSpec.showBottomBar}
                    leftSpacerWidth={props.widthLeftHeader}
                    widthsEach={Array.from({ length: props.superHeaderSpec.headerSpecs.length }).map((_, i) => expandedColumnWidth(i))}
                />
            )}

            <div style={{ position: 'relative', minHeight: overallMinHeight }}>
                <TableHeaderContainer>
                    <ComparisonHeaderRow
                        columnWidth={props.columnWidth}
                        topLeftSpec={props.topLeftSpec}
                        topLeftWidth={props.widthLeftHeader}
                        onlyColumns={props.onlyColumns}
                        extraSpaceRight={Array.from({ length: ncols }).map((_, i) => expandedColumnWidth(i) - props.columnWidth)}
                    />
                </TableHeaderContainer>
                {props.rowSpecs.map((rowSpecsForItem, rowIndex) => {
                    const plotSpec = props.horizontalPlotSpecs[rowIndex]
                    return (
                        <SuperTableRow
                            key={`TableRowContainer_${rowIndex}`}
                            rowIndex={rowIndex}
                            rowMinHeight={rowMinHeight}
                            cellSpecs={rowSpecsForItem}
                            plotSpec={plotSpec}
                            leftHeaderSpec={props.leftHeaderSpecs[rowIndex]}
                            widthLeftHeader={props.widthLeftHeader}
                            columnWidth={props.columnWidth}
                        />
                    )
                })}
                {props.verticalPlotSpecs.map((plotSpec, statIndex) => plotSpec
                    ? (
                            <div key={`statPlot_${statIndex}`} style={{ position: 'absolute', top: 0, left: `${props.widthLeftHeader + Array.from({ length: statIndex }).reduce((acc: number, unused, i) => acc + expandedColumnWidth(i), props.columnWidth)}%`, bottom: 0, width: `${props.columnWidth}%` }}>
                                <RenderedPlot statDescription={plotSpec.statDescription} plotProps={plotSpec.plotProps} />
                            </div>
                        )
                    : null,
                )}
            </div>
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
}): ReactNode {
    return (
        <div>
            <TableRowContainer index={props.rowIndex} minHeight={props.rowMinHeight}>
                <Cell {...props.leftHeaderSpec} width={props.widthLeftHeader} />
                {props.cellSpecs.map((spec, colIndex) => (
                    <Cell key={`rowCells_${colIndex}_${props.rowIndex}`} {...spec} width={props.columnWidth} />
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
    ({ type: 'comparison-top-left-header' } & ComparisonTopLeftHeaderProps)

export function Cell(props: CellSpec & { width: number }): ReactNode {
    switch (props.type) {
        case 'comparison-longname':
            return <ComparisonLongnameCell {...props} width={props.width} />
        case 'statistic-name':
            return <StatisticNameCell {...props} width={props.width} />
        case 'statistic-row':
            return <StatisticRowCells {...props} width={props.width} />
        case 'comparison-top-left-header':
            return <ComparisonTopLeftHeader {...props} width={props.width} />
    }
}

export interface ComparisonLongnameCellProps {
    articleIndex: number
    articles: Article[]
    names: string[]
    transpose: boolean
    sharedTypeOfAllArticles: string | null | undefined
    highlightIndex?: number
}

export interface StatisticNameCellProps {
    row: ArticleRow
    longname: string
    currentUniverse: string
    center?: boolean
    highlightIndex?: number
    transpose?: boolean
}

export interface StatisticRowCellProps {
    longname: string
    statisticStyle?: CSSProperties
    row: ArticleRow
    onlyColumns?: string[]
    blankColumns?: string[]
    onNavigate?: (newArticle: string) => void
    simpleOrdinals: boolean
    isFirstInGroup?: boolean
    isIndented?: boolean
    isGroupHeader?: boolean
    groupName?: string
    indentedName?: string
    groupHasMultipleSources?: boolean
    statParent?: ReturnType<typeof statParents.get>
    extraSpaceRight?: number
}

export interface ComparisonTopLeftHeaderProps {
    statNameOverride?: string
}
