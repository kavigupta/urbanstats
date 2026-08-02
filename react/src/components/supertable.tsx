import React, { CSSProperties, Fragment, ReactNode, useMemo } from 'react'

import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { Universe, useDefinedUniverse } from '../universe'
import { HumanReadableName } from '../utils/human-readable-name'
import { Article } from '../utils/protos'

import { CongressionalColumnData, congressionalDataForRow } from './congressional-table/model'
import { CongressionalRepresentativesWidget } from './congressional-table/render'
import { ArticleRow, StatisticCellRenderingInfo } from './load-article'
import { extraHeaderSpaceForVertical, PlotProps, RenderedPlot } from './plots'
import { useScreenshotMode } from './screenshot'
import { ColumnIdentifier, MainHeaderRow, ComparisonLongnameCell, ComparisonTopLeftHeader, SuperHeaderHorizontal, StatisticNameCell, StatisticPanelLongnameCell, StatisticRowCells, TableHeaderContainer, TableRowContainer, TopLeftHeader, computeDisclaimerFootnotes, maxLayoutInformation, CommonLayoutInformation } from './table'

export interface PlotSpec {
    statDescription: string
    plotProps: PlotProps[]
}

export interface SuperHeaderSpec {
    headerSpecs: CellSpec[]
    showBottomBar: boolean
    groupNames?: (string | undefined)[]
    handleReorder?: (from: number, to: number) => void
}

export interface LeftHeaderSpec {
    leftHeaderSpecs: CellSpec[]
    groupNames?: (string | undefined)[]
}

export interface DisclaimerFootnote {
    symbol: string
    text: string
}

/** The column shape a table's rows are laid out against. */
export interface TableLayout {
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
}

/** A `TableLayout` with its columns measured, which is what rows are actually rendered against. */
export interface MeasuredTableLayout extends TableLayout {
    /** One entry per column, which is also what the column count is read from. */
    columnWidthsInfo: (CommonLayoutInformation | undefined)[]
    /** The space reserved to the right of each column, which a vertical plot occupies. */
    extraSpaceRight: number[]
}

/** Measures each column against the rows it contains. */
function measureColumns(columnRows: StatisticCellRenderingInfo[][], universe: Universe, simpleOrdinals: boolean): CommonLayoutInformation[] {
    return columnRows.map(rows => maxLayoutInformation(rows, universe, simpleOrdinals))
}

/**
 * The layout rows are rendered against. `extraSpaceRight` is asked for per column rather
 * than passed as an array, so it can't disagree with the measurements about the column count.
 */
function measuredLayout(layout: TableLayout, columnWidthsInfo: CommonLayoutInformation[], extraSpaceRight: (columnIndex: number) => number): MeasuredTableLayout {
    return {
        ...layout,
        columnWidthsInfo,
        extraSpaceRight: columnWidthsInfo.map((_, columnIndex) => extraSpaceRight(columnIndex)),
    }
}

/** Each column's width including the space reserved to its right. */
function columnFullWidths(layout: MeasuredTableLayout): number[] {
    return layout.extraSpaceRight.map(extra => layout.columnWidth + extra)
}

export interface TableContentsProps {
    layout: TableLayout
    superHeaderSpec?: SuperHeaderSpec
    leftHeaderSpec: LeftHeaderSpec
    rowSpecs: CellSpec[][]
    horizontalPlotSpecs: (PlotSpec | undefined)[]
    verticalPlotSpecs: (PlotSpec | undefined)[]
    topLeftSpec: CellSpec
    highlightRowIndex?: number
    loading?: boolean
}

export function TableContents(props: TableContentsProps): ReactNode {
    const universe = useDefinedUniverse()
    const colors = useColors()
    const screenshotMode = useScreenshotMode()
    const { widthLeftHeader, columnWidth, simpleOrdinals } = props.layout

    const { leftHeaderSpecs } = props.leftHeaderSpec
    const superHeaderSpecs = props.superHeaderSpec?.headerSpecs

    const disclaimerFootnotes = useMemo(
        () => computeDisclaimerFootnotes([...leftHeaderSpecs, ...(superHeaderSpecs ?? [])]),
        [leftHeaderSpecs, superHeaderSpecs],
    )

    // In screenshot mode the disclaimers move into numbered footnotes below the table, so the
    // cells that carry one need to show the symbol that points at theirs.
    const withFootnote = (spec: CellSpec): CellSpec =>
        screenshotMode && spec.type === 'statistic-name' && spec.row?.disclaimer !== undefined
            ? { ...spec, footnoteSymbol: disclaimerFootnotes.getSymbol(spec.row.disclaimer) }
            : spec

    const headerHeight = props.verticalPlotSpecs.flatMap(p => p === undefined ? [] : p.plotProps).map(p => extraHeaderSpaceForVertical(p)).reduce((a, b) => Math.max(a, b), 0)
    const contentHeight = '379.5px'

    const shouldSetMinHeight = props.verticalPlotSpecs.some(p => p !== undefined)
    const overallMinHeight = shouldSetMinHeight ? `calc(${headerHeight}px + ${contentHeight})` : undefined
    const rowMinHeight = shouldSetMinHeight ? `calc(${contentHeight} / ${leftHeaderSpecs.length})` : undefined

    // should be 1 column, unless there are header specs. only use header specs if we can't infer from the cells.
    const ncols = props.rowSpecs.length !== 0 ? props.rowSpecs[0].length : superHeaderSpecs?.length ?? 1

    const columnRows = Array.from({ length: ncols }).map((_, colIndex) => props.rowSpecs.flatMap((row) => {
        const cell = row[colIndex]
        return cell.type === 'statistic-row' ? [cell.row] : []
    }))

    const layout = measuredLayout(
        props.layout,
        measureColumns(columnRows, universe, simpleOrdinals),
        colIndex => props.verticalPlotSpecs[colIndex] === undefined ? 0 : columnWidth,
    )
    const fullWidths = columnFullWidths(layout)

    const superHeaderSpec = props.superHeaderSpec === undefined
        ? undefined
        : { ...props.superHeaderSpec, headerSpecs: props.superHeaderSpec.headerSpecs.map(withFootnote) }

    return (
        <>
            <TableFrame
                layout={layout}
                topLeftSpec={props.topLeftSpec}
                superHeaderSpec={superHeaderSpec}
                minHeight={overallMinHeight}
            >
                {props.rowSpecs.map((rowSpecsForItem, rowIndex) => {
                    const plotSpec = props.horizontalPlotSpecs[rowIndex]
                    return (
                        <SuperTableRow
                            key={`TableRowContainer_${rowIndex}`}
                            layout={layout}
                            rowIndex={rowIndex}
                            rowMinHeight={rowMinHeight}
                            cellSpecs={rowSpecsForItem}
                            plotSpec={plotSpec}
                            leftHeaderSpec={withFootnote(leftHeaderSpecs[rowIndex])}
                            groupName={props.leftHeaderSpec.groupNames?.[rowIndex]}
                            prevGroupName={rowIndex > 0 ? props.leftHeaderSpec.groupNames?.[rowIndex - 1] : undefined}
                            isHighlighted={props.highlightRowIndex === rowIndex}
                        />
                    )
                })}
                {props.verticalPlotSpecs.map((plotSpec, statIndex) => plotSpec
                    ? (
                            <div key={`statPlot_${statIndex}`} style={{ position: 'absolute', top: 0, left: `${widthLeftHeader + Array.from({ length: statIndex }).reduce((acc: number, unused, i) => acc + fullWidths[i], columnWidth)}%`, bottom: 0, width: `${columnWidth}%` }}>
                                <RenderedPlot statDescription={plotSpec.statDescription} plotProps={plotSpec.plotProps} />
                            </div>
                        )
                    : null,
                )}
                <RelativeLoader loading={props.loading ?? false} />
            </TableFrame>
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

/**
 * Everything a table has above its rows -- the optional super header, and the main header
 * row of column names -- plus the positioned container the rows themselves live in, which
 * the vertical plots are absolutely positioned against.
 */
function TableFrame(props: {
    layout: MeasuredTableLayout
    superHeaderSpec?: SuperHeaderSpec
    topLeftSpec: CellSpec
    minHeight?: string
    children: ReactNode
}): ReactNode {
    const { widthLeftHeader, columnWidth, onlyColumns, simpleOrdinals, columnWidthsInfo, extraSpaceRight } = props.layout
    return (
        <>
            {props.superHeaderSpec !== undefined && (
                <SuperHeaderHorizontal
                    {...props.superHeaderSpec}
                    leftSpacerWidth={widthLeftHeader}
                    widthsEach={columnFullWidths(props.layout)}
                />
            )}
            <div style={{ position: 'relative', minHeight: props.minHeight }}>
                <TableHeaderContainer>
                    <MainHeaderRow
                        columnWidth={columnWidth}
                        topLeftSpec={props.topLeftSpec}
                        topLeftWidth={widthLeftHeader}
                        onlyColumns={onlyColumns}
                        extraSpaceRight={extraSpaceRight}
                        simpleOrdinals={simpleOrdinals}
                        columnWidthsInfo={columnWidthsInfo}
                    />
                </TableHeaderContainer>
                {props.children}
            </div>
        </>
    )
}

function SuperTableRow(props: {
    layout: MeasuredTableLayout
    rowIndex: number
    leftHeaderSpec: CellSpec
    cellSpecs: CellSpec[]
    plotSpec?: PlotSpec
    rowMinHeight?: string
    groupName?: string
    prevGroupName?: string
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
            <StatisticTableRow
                layout={props.layout}
                index={props.rowIndex}
                leftHeader={<Cell {...props.leftHeaderSpec} width={props.layout.widthLeftHeader} />}
                cellSpecs={props.cellSpecs}
                plotSpec={props.plotSpec}
                minHeight={props.rowMinHeight}
                isHighlighted={props.isHighlighted}
            />
        </div>
    )
}

/**
 * The shape every statistic row has: a left header followed by a cell per column, and below
 * it the blocks the row's extras call for -- its expanded plot and its representatives
 * table. Callers differ only in what they put in the left header.
 */
function StatisticTableRow(props: {
    layout: MeasuredTableLayout
    index: number
    leftHeader: ReactNode
    cellSpecs: CellSpec[]
    plotSpec?: PlotSpec
    minHeight?: string
    isHighlighted?: boolean
}): ReactNode {
    const { layout, cellSpecs } = props
    const congressionalRegions = useMemo(() => congressionalRegionsForCells(cellSpecs), [cellSpecs])

    return (
        <>
            <TableRowContainer index={props.index} minHeight={props.minHeight} isHighlighted={props.isHighlighted}>
                {props.leftHeader}
                <RowCells layout={layout} cellSpecs={cellSpecs} />
            </TableRowContainer>
            {props.plotSpec && (
                <div style={{ width: '100%', position: 'relative' }}>
                    <RenderedPlot statDescription={props.plotSpec.statDescription} plotProps={props.plotSpec.plotProps} />
                </div>
            )}
            {congressionalRegions.length > 0 && (
                <CongressionalRepresentativesWidget
                    regions={congressionalRegions}
                    widthLeftHeader={layout.widthLeftHeader}
                    columnWidth={layout.columnWidth}
                    extraSpaceRight={layout.extraSpaceRight}
                />
            )}
        </>
    )
}

/**
 * A row's cells, each followed by the space its column reserves to the right. Statistic
 * cells are given their column's measured widths here, so every table that renders a row
 * of cells lines its columns up the same way.
 */
function RowCells(props: { layout: MeasuredTableLayout, cellSpecs: CellSpec[] }): ReactNode {
    const { columnWidth, extraSpaceRight, columnWidthsInfo } = props.layout
    return props.cellSpecs.map((spec, colIndex) => (
        <Fragment key={colIndex}>
            <Cell
                {...(spec.type === 'statistic-row' ? { ...spec, columnWidthsInfo: columnWidthsInfo[colIndex] } : spec)}
                width={columnWidth}
            />
            <div style={{ width: `${extraSpaceRight[colIndex]}%` }}></div>
        </Fragment>
    ))
}

/** The representatives tables a row's cells call for, in column order. */
function congressionalRegionsForCells(cellSpecs: CellSpec[]): CongressionalColumnData[] {
    return cellSpecs.flatMap((cell) => {
        if (cell.type !== 'statistic-row') {
            return []
        }
        const data = congressionalDataForRow(cell.row, cell.longname)
        return data === undefined ? [] : [data]
    })
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
    renderedStatname: HumanReadableName
    longname: string
    currentUniverse: Universe
    center?: boolean
    highlightIndex?: number
    transpose?: boolean
    isIndented?: boolean
    displayName?: HumanReadableName
    footnoteSymbol?: string
    sortInfo?: {
        sortDirection: 'up' | 'down' | 'both'
        onSort: () => void
    }
    handleDelete?: () => void
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
