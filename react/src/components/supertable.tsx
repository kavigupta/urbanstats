import React, { CSSProperties, Fragment, ReactNode, useMemo } from 'react'

import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { Universe, useUniverse } from '../universe'
import { assert } from '../utils/defensive'
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
    /** Puts the way into edit mode above the table, for layouts whose top-left cell has no room for it. */
    editMode?: EditModeButton
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

export interface TableContentsProps extends TableLayout {
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

    const columnWidthsInfo = Array.from({ length: ncols }).map((_, colIndex) => maxLayoutInformation(
        props.rowSpecs.flatMap((row) => {
            const cell = row[colIndex]
            return cell.type === 'statistic-row' ? [cell.row] : []
        }),
        universe,
        props.simpleOrdinals,
    ))

    const superHeaderSpec = props.superHeaderSpec === undefined
        ? undefined
        : {
                ...props.superHeaderSpec,
                headerSpecs: props.superHeaderSpec.headerSpecs.map((spec) => {
                    if (screenshotMode && spec.type === 'statistic-name' && spec.row?.disclaimer !== undefined) {
                        return { ...spec, footnoteSymbol: disclaimerFootnotes.getSymbol(spec.row.disclaimer) }
                    }
                    return spec
                }),
            }

    return (
        <>
            <TableFrame
                {...props}
                superHeaderSpec={superHeaderSpec}
                extraSpaceRight={extraSpaceRight}
                columnWidthsInfo={columnWidthsInfo}
                minHeight={overallMinHeight}
            >
                {props.rowSpecs.map((rowSpecsForItem, rowIndex) => {
                    const plotSpec = props.horizontalPlotSpecs[rowIndex]
                    return (
                        <SuperTableRow
                            key={`TableRowContainer_${rowIndex}`}
                            rowIndex={rowIndex}
                            rowMinHeight={rowMinHeight}
                            cellSpecs={rowSpecsForItem}
                            columnWidthsInfo={columnWidthsInfo}
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
export function TableFrame(props: TableLayout & {
    superHeaderSpec?: SuperHeaderSpec
    topLeftSpec: CellSpec
    extraSpaceRight: number[]
    columnWidthsInfo: (CommonLayoutInformation | undefined)[]
    minHeight?: string
    children: ReactNode
}): ReactNode {
    return (
        <>
            {props.superHeaderSpec !== undefined && (
                <SuperHeaderHorizontal
                    {...props.superHeaderSpec}
                    leftSpacerWidth={props.widthLeftHeader}
                    widthsEach={props.extraSpaceRight.map(extra => props.columnWidth + extra)}
                />
            )}
            <div style={{ position: 'relative', minHeight: props.minHeight }}>
                <TableHeaderContainer>
                    <MainHeaderRow
                        columnWidth={props.columnWidth}
                        topLeftSpec={props.topLeftSpec}
                        topLeftWidth={props.widthLeftHeader}
                        onlyColumns={props.onlyColumns}
                        extraSpaceRight={props.extraSpaceRight}
                        simpleOrdinals={props.simpleOrdinals}
                        columnWidthsInfo={props.columnWidthsInfo}
                    />
                </TableHeaderContainer>
                {props.children}
            </div>
        </>
    )
}

function SuperTableRow(props: {
    rowIndex: number
    leftHeaderSpec: CellSpec
    cellSpecs: CellSpec[]
    columnWidthsInfo: (CommonLayoutInformation | undefined)[]
    plotSpec?: PlotSpec
    widthLeftHeader: number
    columnWidth: number
    rowMinHeight?: string
    groupName?: string
    prevGroupName?: string
    extraSpaceRight: number[]
    isHighlighted: boolean
}): ReactNode {
    const congressionalRegions = useMemo(() => congressionalRegionsForCells(props.cellSpecs), [props.cellSpecs])

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
                <RowCells
                    cellSpecs={props.cellSpecs}
                    columnWidth={props.columnWidth}
                    extraSpaceRight={props.extraSpaceRight}
                    columnWidthsInfo={props.columnWidthsInfo}
                />
            </TableRowContainer>
            <RowExtras
                plotSpec={props.plotSpec}
                congressionalRegions={congressionalRegions}
                widthLeftHeader={props.widthLeftHeader}
                columnWidth={props.columnWidth}
                extraSpaceRight={props.extraSpaceRight}
            />
        </div>
    )
}

/**
 * A row's cells, each followed by the space its column reserves to the right. Statistic
 * cells are given their column's measured widths here, so every table that renders a row
 * of cells lines its columns up the same way.
 */
export function RowCells(props: {
    cellSpecs: CellSpec[]
    columnWidth: number
    extraSpaceRight: number[]
    columnWidthsInfo: (CommonLayoutInformation | undefined)[]
}): ReactNode {
    return props.cellSpecs.map((spec, colIndex) => (
        <Fragment key={colIndex}>
            <Cell
                {...(spec.type === 'statistic-row' ? { ...spec, columnWidthsInfo: props.columnWidthsInfo[colIndex] } : spec)}
                width={props.columnWidth}
            />
            <div style={{ width: `${props.extraSpaceRight[colIndex]}%` }}></div>
        </Fragment>
    ))
}

/** The representatives tables a row's cells call for, in column order. */
export function congressionalRegionsForCells(cellSpecs: CellSpec[]): CongressionalColumnData[] {
    return cellSpecs.flatMap((cell) => {
        if (cell.type !== 'statistic-row') {
            return []
        }
        const data = congressionalDataForRow(cell.row, cell.longname)
        return data === undefined ? [] : [data]
    })
}

/** The blocks that hang below a statistic row: its expanded plot and its representatives table. */
export function RowExtras(props: {
    plotSpec?: PlotSpec
    congressionalRegions: CongressionalColumnData[]
    widthLeftHeader: number
    columnWidth: number
    extraSpaceRight: number[]
}): ReactNode {
    return (
        <>
            {props.plotSpec && (
                <div style={{ width: '100%', position: 'relative' }}>
                    <RenderedPlot statDescription={props.plotSpec.statDescription} plotProps={props.plotSpec.plotProps} />
                </div>
            )}
            {props.congressionalRegions.length > 0 && (
                <div data-test-id="congressional-representatives">
                    <CongressionalRepresentativesWidget
                        regions={props.congressionalRegions}
                        widthLeftHeader={props.widthLeftHeader}
                        columnWidth={props.columnWidth}
                        extraSpaceRight={props.extraSpaceRight}
                    />
                </div>
            )}
        </>
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

/**
 * What the table's top-left cell offers for "edit mode", in which the statistic
 * category/group checkbox tree is replicated directly on the table. Passed down as part of
 * the cell's spec, so the generic table components stay unaware of edit mode; a cell given
 * no `EditModeHeader` renders the plain header.
 */
export type EditModeHeader = EditModeButton | EditModeOpenHeader

/** The way in to edit mode, shown while it's closed. */
export interface EditModeButton {
    open: false
    onEdit: () => void
    label: string
}

export interface EditModeOpenHeader {
    open: true
    filter: string
    setFilter: (filter: string) => void
    /** Unset when something else on the page already offers a way out of edit mode. */
    onDone?: () => void
}

export interface TopLeftHeaderProps {
    statNameOverride?: string
    editMode?: EditModeHeader
}

/** The cell types that can serve as a table's top-left header; the comparison's carries a color bar. */
export type TopLeftHeaderType = Extract<CellSpec, TopLeftHeaderProps>['type']
