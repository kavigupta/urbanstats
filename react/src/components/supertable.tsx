import React, { CSSProperties, ReactNode } from 'react'

import { statParents } from '../page_template/statistic-tree'
import { Article } from '../utils/protos'

import { ArticleRow } from './load-article'
import { extraHeaderSpaceForVertical, PlotProps, RenderedPlot } from './plots'
import { ColumnIdentifier, ComparisonHeaderRow, ComparisonLongnameCell, ComparisonTopLeftHeader, LongnameHeaderSection, StatisticNameCell, StatisticRowCells, TableHeaderContainer, TableRowContainer } from './table'

export interface PlotSpec {
    statDescription: string
    plotProps: PlotProps[]
}

export interface TableContentsProps {
    headerSpecs: CellSpec[]
    leftHeaderSpecs: CellSpec[]
    rowSpecs: CellSpec[][]
    horizontalPlotSpecs: (PlotSpec | undefined)[]
    verticalPlotSpecs: (PlotSpec | undefined)[]
    showBottomBar: boolean
    topLeftSpec: CellSpec
    widthLeftHeader: number
    columnWidth: number
    leftBarMargin: number
    onlyColumns: ColumnIdentifier[]
}

export function TableContents(props: TableContentsProps): ReactNode {
    const headerHeight = props.verticalPlotSpecs.flatMap(p => p === undefined ? [] : p.plotProps).map(p => extraHeaderSpaceForVertical(p)).reduce((a, b) => Math.max(a, b), 0)
    const contentHeight = '379.5px'

    const shouldSetMinHeight = props.verticalPlotSpecs.some(p => p !== undefined)
    const overallMinHeight = shouldSetMinHeight ? `calc(${headerHeight}px + ${contentHeight})` : undefined
    const rowMinHeight = shouldSetMinHeight ? `calc(${contentHeight} / ${props.leftHeaderSpecs.length})` : undefined

    const expandedColumnWidth = (columnIndex: number): number => (props.verticalPlotSpecs[columnIndex] === undefined ? 1 : 2) * props.columnWidth

    return (
        <>
            <LongnameHeaderSection
                headerSpecs={props.headerSpecs}
                showBottomBar={props.showBottomBar}
                leftSpacerWidth={props.widthLeftHeader}
                widthsEach={Array.from({ length: props.headerSpecs.length }).map((_, i) => expandedColumnWidth(i))}
            />

            <div style={{ position: 'relative', minHeight: overallMinHeight }}>
                <TableHeaderContainer>
                    <ComparisonHeaderRow
                        columnWidth={props.columnWidth}
                        topLeftSpec={props.topLeftSpec}
                        topLeftWidth={props.widthLeftHeader}
                        onlyColumns={props.onlyColumns}
                        extraSpaceRight={Array.from({ length: props.headerSpecs.length }).map((_, i) => expandedColumnWidth(i) - props.columnWidth)}
                    />
                </TableHeaderContainer>
                {props.rowSpecs.map((rowSpecsForItem, rowIndex) => {
                    const plotSpec = props.horizontalPlotSpecs[rowIndex]
                    return (
                        <div key={`TableRowContainer_${rowIndex}`}>
                            <TableRowContainer index={rowIndex} minHeight={rowMinHeight}>
                                <Cell {...props.leftHeaderSpecs[rowIndex]} width={props.widthLeftHeader} />
                                {rowSpecsForItem.map((spec, colIndex) => (
                                    <Cell key={`rowCells_${colIndex}_${rowIndex}`} {...spec} width={props.columnWidth} />
                                ))}
                            </TableRowContainer>
                            {plotSpec && (
                                <div style={{ width: '100%', position: 'relative' }}>
                                    <RenderedPlot statDescription={plotSpec.statDescription} plotProps={plotSpec.plotProps} />
                                </div>
                            )}
                        </div>
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
