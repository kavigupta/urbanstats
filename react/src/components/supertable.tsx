import React, { CSSProperties, ReactNode } from 'react'

import { Article } from '../utils/protos'

import { ArticleRow } from './load-article'
import { extraHeaderSpaceForVertical, PlotProps, RenderedPlot } from './plots'
import { ColumnIdentifier, MainHeaderRow, ComparisonLongnameCell, ComparisonTopLeftHeader, SuperHeaderHorizontal, StatisticNameCell, StatisticRowCells, TableHeaderContainer, TableRowContainer, TopLeftHeader } from './table'

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
}

export function TableContents(props: TableContentsProps): ReactNode {
    const headerHeight = props.verticalPlotSpecs.flatMap(p => p === undefined ? [] : p.plotProps).map(p => extraHeaderSpaceForVertical(p)).reduce((a, b) => Math.max(a, b), 0)
    const contentHeight = '379.5px'

    const shouldSetMinHeight = props.verticalPlotSpecs.some(p => p !== undefined)
    const overallMinHeight = shouldSetMinHeight ? `calc(${headerHeight}px + ${contentHeight})` : undefined
    const rowMinHeight = shouldSetMinHeight ? `calc(${contentHeight} / ${props.leftHeaderSpec.leftHeaderSpecs.length})` : undefined

    // should be 1 column, unless there are header specs. only use header specs if we can't infer from the cells.
    const ncols = props.rowSpecs.length !== 0 ? props.rowSpecs[0].length : props.superHeaderSpec?.headerSpecs.length ?? 1

    const extraSpaceRight = Array.from({ length: ncols }).map((_, i) => (props.verticalPlotSpecs[i] === undefined ? 0 : props.columnWidth))
    const columnFullWidths = extraSpaceRight.map(extra => props.columnWidth + extra)

    return (
        <>
            {props.superHeaderSpec !== undefined && (
                <SuperHeaderHorizontal
                    {...props.superHeaderSpec}
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
                            extraSpaceRight={extraSpaceRight}
                            plotSpec={plotSpec}
                            leftHeaderSpec={props.leftHeaderSpec.leftHeaderSpecs[rowIndex]}
                            widthLeftHeader={props.widthLeftHeader}
                            columnWidth={props.columnWidth}
                            groupName={props.leftHeaderSpec.groupNames?.[rowIndex]}
                            prevGroupName={rowIndex > 0 ? props.leftHeaderSpec.groupNames?.[rowIndex - 1] : undefined}
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
}): ReactNode {
    return (
        <div>
            {props.groupName !== undefined && (props.groupName !== props.prevGroupName) && (
                <TableRowContainer index={props.rowIndex}>
                    <div style={{ width: '100%', padding: '1px' }}>
                        <span className="serif value">
                            <span>{props.groupName}</span>
                        </span>
                    </div>
                </TableRowContainer>
            )}
            <TableRowContainer index={props.rowIndex} minHeight={props.rowMinHeight}>
                <Cell {...props.leftHeaderSpec} width={props.widthLeftHeader} />
                {props.cellSpecs.map((spec, colIndex) => (
                    <>
                        <Cell key={`rowCells_${colIndex}_${props.rowIndex}`} {...spec} width={props.columnWidth} />
                        <div key={`spacer_${colIndex}_${props.rowIndex}`} style={{ width: `${props.extraSpaceRight[colIndex]}%` }}></div>
                    </>
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

export interface StatisticNameCellProps {
    row: ArticleRow
    longname: string
    currentUniverse: string
    center?: boolean
    highlightIndex?: number
    transpose?: boolean
    isIndented?: boolean
    displayName?: string
    sortInfo?: {
        sortDirection: 'up' | 'down' | 'both'
        onSort: () => void
    }
}

export interface StatisticRowCellProps {
    longname: string
    statisticStyle?: CSSProperties
    row: ArticleRow
    onlyColumns?: string[]
    blankColumns?: string[]
    onNavigate?: (newArticle: string) => void
    simpleOrdinals: boolean
    extraSpaceRight?: number
}

export interface TopLeftHeaderProps {
    statNameOverride?: string
}
