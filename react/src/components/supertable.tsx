import React, { CSSProperties, Fragment, ReactNode, useMemo } from 'react'

import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { Universe, useDefinedUniverse } from '../universe'
import { HumanReadableName } from '../utils/human-readable-name'
import { Article } from '../utils/protos'

import { WarningColumn, WarningRow } from './ArticleWarnings'
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

/**
 * Measures each column against the rows it contains. A column with no rows goes unmeasured
 * rather than measuring as zero, which would cap its header's text at no width at all.
 */
function measureColumns(columnRows: StatisticCellRenderingInfo[][], universe: Universe, simpleOrdinals: boolean): (CommonLayoutInformation | undefined)[] {
    return columnRows.map(rows => rows.length === 0 ? undefined : maxLayoutInformation(rows, universe, simpleOrdinals))
}

/**
 * The layout rows are rendered against. `extraSpaceRight` is asked for per column rather
 * than passed as an array, so it can't disagree with the measurements about the column count.
 */
function measuredLayout(layout: TableLayout, columnWidthsInfo: (CommonLayoutInformation | undefined)[], extraSpaceRight: (columnIndex: number) => number): MeasuredTableLayout {
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
    topLeftSpec: TopLeftCellSpec
    /** Warnings shown in place of the statistics they are about. */
    warningRows?: WarningRow[]
    /**
     * Warnings that stand in for a column rather than a row, drawn once down the column. The
     * column itself must already be in `rowSpecs` and the super header, as a blank cell.
     */
    warningColumns?: WarningColumn[]
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

    // Warnings are interleaved with the statistic rows, so the stripes are counted over both.
    const warningRows = props.warningRows ?? []
    const bodyRows: ReactNode[] = []
    let nextWarning = 0
    const emitWarningsBefore = (rowIndex: number): void => {
        while (nextWarning < warningRows.length && warningRows[nextWarning].index <= rowIndex) {
            bodyRows.push(
                <WarningTableRow
                    key={`warning_${nextWarning}`}
                    layout={layout}
                    stripeIndex={bodyRows.length}
                    name={warningRows[nextWarning].name}
                    content={warningRows[nextWarning].content}
                />,
            )
            nextWarning++
        }
    }
    props.rowSpecs.forEach((rowSpecsForItem, rowIndex) => {
        emitWarningsBefore(rowIndex)
        bodyRows.push(
            <SuperTableRow
                key={`TableRowContainer_${rowIndex}`}
                layout={layout}
                stripeIndex={bodyRows.length}
                rowMinHeight={rowMinHeight}
                cellSpecs={rowSpecsForItem}
                plotSpec={props.horizontalPlotSpecs[rowIndex]}
                leftHeaderSpec={withFootnote(leftHeaderSpecs[rowIndex])}
                groupName={props.leftHeaderSpec.groupNames?.[rowIndex]}
                prevGroupName={rowIndex > 0 ? props.leftHeaderSpec.groupNames?.[rowIndex - 1] : undefined}
                isHighlighted={props.highlightRowIndex === rowIndex}
            />,
        )
    })
    emitWarningsBefore(props.rowSpecs.length)

    return (
        <>
            <TableFrame
                layout={layout}
                topLeftSpec={props.topLeftSpec}
                superHeaderSpec={superHeaderSpec}
                blankColumns={props.warningColumns?.map(({ columnIndex }) => columnIndex)}
                minHeight={overallMinHeight}
            >
                <div style={{ position: 'relative' }}>
                    {bodyRows}
                    {(props.warningColumns ?? []).map(({ columnIndex, content }) => (
                        <WarningColumnMessage
                            key={`warningColumn_${columnIndex}`}
                            layout={layout}
                            columnIndex={columnIndex}
                            content={content}
                        />
                    ))}
                </div>
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
    topLeftSpec: TopLeftCellSpec
    blankColumns?: number[]
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
                        blankColumns={props.blankColumns}
                    />
                </TableHeaderContainer>
                {props.children}
            </div>
        </>
    )
}

/**
 * An explanation of why some statistics aren't there, laid out like the row they stand in for:
 * the group's name in the left header, and the warning across the columns the values would fill.
 * A warning about no group in particular has no name to put in the left header, so it spans the
 * whole row rather than starting at an empty one.
 */
function WarningTableRow(props: { layout: MeasuredTableLayout, stripeIndex: number, name?: string, content: ReactNode }): ReactNode {
    const colors = useColors()
    const contentWidth = props.name === undefined
        ? 100
        : columnFullWidths(props.layout).reduce((a, b) => a + b, 0)
    return (
        <TableRowContainer index={props.stripeIndex}>
            {props.name !== undefined && (
                <div style={{ width: `${props.layout.widthLeftHeader}%`, padding: '1px' }} data-test-id="article-warning-name">
                    <span className="serif value">{props.name}</span>
                </div>
            )}
            <div
                style={{ width: `${contentWidth}%`, padding: '1px', color: colors.ordinalTextColor, fontStyle: 'italic' }}
                data-test-id="article-warning"
            >
                <span className="serif value">{props.content}</span>
            </div>
        </TableRowContainer>
    )
}

/**
 * The message for a warning that stands in for a column, drawn once down the blank column its
 * statistics would have filled.
 */
function WarningColumnMessage(props: { layout: MeasuredTableLayout, columnIndex: number, content: ReactNode }): ReactNode {
    const colors = useColors()
    const fullWidths = columnFullWidths(props.layout)
    const left = props.layout.widthLeftHeader + fullWidths.slice(0, props.columnIndex).reduce((a, b) => a + b, 0)
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${left}%`,
                width: `${props.layout.columnWidth}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                // Enough horizontal room that neighbouring columns' messages don't read as one
                padding: '1px 0.75em',
                color: colors.ordinalTextColor,
                fontStyle: 'italic',
            }}
            data-test-id="article-warning"
        >
            <span className="serif value">{props.content}</span>
        </div>
    )
}

function SuperTableRow(props: {
    layout: MeasuredTableLayout
    stripeIndex: number
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
                <TableRowContainer index={props.stripeIndex} isHighlighted={props.isHighlighted}>
                    <div style={{ width: '100%', padding: '1px' }}>
                        <span className="serif value">
                            <span>{props.groupName}</span>
                        </span>
                    </div>
                </TableRowContainer>
            )}
            <StatisticTableRow
                layout={props.layout}
                index={props.stripeIndex}
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
    /*
     * Deliberately not memoized. The representatives widget only puts the terms that were
     * on screen into a screenshot, and it re-measures which those are off a change of
     * identity here -- so holding this steady across renders empties the screenshot.
     */
    const congressionalRegions = congressionalRegionsForCells(cellSpecs)

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
    ({ type: 'top-left-header' } & TopLeftHeaderProps) |
    /** Holds a column's width open without drawing anything, e.g. under a warning column. */
    { type: 'blank' }

export function Cell(props: CellSpec & { width: number }): ReactNode {
    switch (props.type) {
        case 'blank':
            return <div style={{ width: `${props.width}%` }} />

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

/** The cells that can serve as a table's top-left header; the comparison's carries a color bar. */
export type TopLeftCellSpec = Extract<CellSpec, { type: 'comparison-top-left-header' | 'top-left-header' }>
