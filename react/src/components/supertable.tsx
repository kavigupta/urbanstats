import React, { CSSProperties, Fragment, ReactNode, useMemo } from 'react'

import partyPages from '../data/party_pages'
import { RelativeLoader } from '../navigation/loading'
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
                <RelativeLoader loading={props.loading ?? false} />
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

function SuperTableRow(props: {
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
    const congressionalWidgetData = extractCongressionalWidgetData(props.cellSpecs)

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
            {congressionalWidgetData !== undefined && (
                <CongressionalRepresentativesWidget
                    widthLeftHeader={props.widthLeftHeader}
                    columnWidth={props.columnWidth}
                    extraSpaceRight={props.extraSpaceRight}
                    termsDescending={congressionalWidgetData.termsDescending}
                    columns={congressionalWidgetData.columns}
                />
            )}
        </div>
    )
}

interface CongressionalRepresentativeEntry {
    representative: {
        name?: string | null
        wikipediaPage?: string | null
        party?: string | null
    }
    districtLongname?: string
    startTerm?: number
    endTerm?: number
}

interface CongressionalColumnData {
    longname: string
    representatives: CongressionalRepresentativeEntry[]
}

function getPartyPage(party: string): (typeof partyPages)[keyof typeof partyPages] {
    assert(party in partyPages, `Party ${party} not found in partyPages data`)
    return partyPages[party as keyof typeof partyPages]
}

function RepresentativeParty(props: { party?: string | null }): ReactNode {
    const colors = useColors()
    if (!props.party || props.party === 'Independent') {
        return null
    }
    const partyPage = getPartyPage(props.party)
    // eslint-disable-next-line no-restricted-syntax -- not actual colors, just remapping
    const colorStr = partyPage.party_color === 'black' || partyPage.party_color === 'gray' ? 'grey' : partyPage.party_color
    const color = colors.hueColors[colorStr]

    return (
        <a href={partyPage.wikipedia_page} style={{ textDecoration: 'none', color }} target="_blank" rel="noopener noreferrer">
            {` (${props.party.slice(0, 1)})`}
        </a>
    )
}

function Representative(props: { representative: CongressionalRepresentativeEntry['representative'] }): ReactNode {
    assert(
        props.representative.wikipediaPage !== null
        && props.representative.wikipediaPage !== undefined
        && props.representative.name !== null
        && props.representative.name !== undefined,
        `Representative ${JSON.stringify(props.representative)} is missing required fields`,
    )
    return (
        <span>
            <a href={props.representative.wikipediaPage} style={{ textDecoration: 'none', color: 'inherit' }} target="_blank" rel="noopener noreferrer">
                {props.representative.name}
            </a>
            <RepresentativeParty party={props.representative.party ?? undefined} />
        </span>
    )
}

function extractCongressionalWidgetData(cellSpecs: CellSpec[]): {
    termsDescending: number[]
    columns: CongressionalColumnData[]
} | undefined {
    const columns: CongressionalColumnData[] = []
    const termStarts = new Set<number>()

    for (const cell of cellSpecs) {
        if (cell.type !== 'statistic-row') {
            return undefined
        }
        if (cell.row.kind !== 'metadata') {
            return undefined
        }
        if (typeof cell.row.statval === 'string') {
            return undefined
        }
        const congressionalValue = cell.row.statval
        columns.push({
            longname: cell.longname,
            representatives: congressionalValue.representatives,
        })
        congressionalValue.representatives.forEach((entry) => {
            for (const termStart of termStartsForEntry(entry)) {
                termStarts.add(termStart)
            }
        })
    }

    if (columns.length === 0 || termStarts.size === 0) {
        return undefined
    }

    const termsDescending = Array.from(termStarts).sort((a, b) => b - a)
    return { termsDescending, columns }
}

function termStartsForEntry(entry: CongressionalRepresentativeEntry): number[] {
    const startTerm = entry.startTerm
    if (startTerm === undefined) {
        return []
    }
    const endTerm = entry.endTerm
    if (endTerm === undefined || endTerm <= startTerm) {
        return [startTerm]
    }
    const terms = []
    for (let term = startTerm; term < endTerm; term += 2) {
        terms.push(term)
    }
    return terms.length > 0 ? terms : [startTerm]
}

function entryCoversTerm(entry: CongressionalRepresentativeEntry, termStart: number): boolean {
    const startTerm = entry.startTerm
    if (startTerm === undefined) {
        return false
    }
    const endTerm = entry.endTerm
    if (endTerm === undefined || endTerm <= startTerm) {
        return termStart === startTerm
    }
    return termStart >= startTerm && termStart < endTerm && (termStart - startTerm) % 2 === 0
}

function formatTermLabel(termStart: number): string {
    return `${termStart}-${String(termStart + 2).slice(2)}`
}

function representativeIdentity(entry: CongressionalRepresentativeEntry): string {
    return `${entry.representative.name ?? ''}|${entry.districtLongname ?? ''}|${entry.startTerm ?? ''}|${entry.endTerm ?? ''}`
}

function districtLabel(entry: CongressionalRepresentativeEntry): string {
    return entry.districtLongname ?? 'District unknown'
}

interface DistrictBucketForTerm {
    districtLabel: string
    entries: CongressionalRepresentativeEntry[]
    signature: string
}

function representativeSignature(entry: CongressionalRepresentativeEntry): string {
    return `${entry.representative.name ?? ''}|${entry.representative.wikipediaPage ?? ''}|${entry.representative.party ?? ''}`
}

function districtBucketSignature(entries: CongressionalRepresentativeEntry[]): string {
    return entries.map(entry => representativeSignature(entry)).sort((a, b) => a.localeCompare(b)).join('||')
}

function districtBucketsForTerm(entries: CongressionalRepresentativeEntry[]): DistrictBucketForTerm[] {
    const byDistrict = new Map<string, CongressionalRepresentativeEntry[]>()
    entries.forEach((entry) => {
        const label = districtLabel(entry)
        const existing = byDistrict.get(label)
        if (existing === undefined) {
            byDistrict.set(label, [entry])
        }
        else {
            existing.push(entry)
        }
    })

    if (byDistrict.size === 0) {
        return [{ districtLabel: 'No district data', entries: [], signature: '' }]
    }

    return Array.from(byDistrict.entries())
        .map(([label, entriesInDistrict]) => ({
            districtLabel: label,
            entries: entriesInDistrict,
            signature: districtBucketSignature(entriesInDistrict),
        }))
        .sort((a, b) => {
            if (a.signature !== b.signature) {
                return a.signature.localeCompare(b.signature)
            }
            return a.districtLabel.localeCompare(b.districtLabel)
        })
}

function termBucketsSignature(buckets: DistrictBucketForTerm[]): string {
    return JSON.stringify(buckets.map(bucket => bucket.signature))
}

interface MergedRun {
    startIndex: number
    length: number
    termSignature: string
}

function buildMergedRunsByRepresentativeLayout(bucketsByTerm: DistrictBucketForTerm[][]): MergedRun[] {
    if (bucketsByTerm.length === 0) {
        return []
    }
    const runs: MergedRun[] = []
    let currentStart = 0
    let currentLength = 1
    let currentSignature = termBucketsSignature(bucketsByTerm[0])

    for (let i = 1; i < bucketsByTerm.length; i += 1) {
        const signature = termBucketsSignature(bucketsByTerm[i])
        if (signature === currentSignature) {
            currentLength += 1
            continue
        }
        runs.push({ startIndex: currentStart, length: currentLength, termSignature: currentSignature })
        currentStart = i
        currentLength = 1
        currentSignature = signature
    }
    runs.push({ startIndex: currentStart, length: currentLength, termSignature: currentSignature })
    return runs
}

function CongressionalRepresentativesWidget(props: {
    widthLeftHeader: number
    columnWidth: number
    extraSpaceRight: number[]
    termsDescending: number[]
    columns: CongressionalColumnData[]
}): ReactNode {
    const colors = useColors()
    const borderColor = colors.textMain
    const panelBackground = colors.slightlyDifferentBackground

    const entriesForTerm = (column: CongressionalColumnData, termStart: number): CongressionalRepresentativeEntry[] => {
        const seen = new Set<string>()
        return column.representatives.filter((entry) => {
            if (!entryCoversTerm(entry, termStart)) {
                return false
            }
            const key = representativeIdentity(entry)
            if (seen.has(key)) {
                return false
            }
            seen.add(key)
            return true
        })
    }

    const districtArticleHref = (district: string): string | undefined => {
        if (district === 'No district data' || district === 'District unknown') {
            return undefined
        }
        return `article.html?longname=${encodeURIComponent(district)}`
    }

    const entriesByColumnAndTerm = props.columns.map(column =>
        props.termsDescending.map(termStart => entriesForTerm(column, termStart)),
    )

    const districtBucketsByColumnAndTerm = entriesByColumnAndTerm.map(entriesByTerm =>
        entriesByTerm.map(entries => districtBucketsForTerm(entries)),
    )

    const mergedRunsByColumn = districtBucketsByColumnAndTerm.map(bucketsByTerm =>
        buildMergedRunsByRepresentativeLayout(bucketsByTerm),
    )

    const runStartTermIndices = new Set<number>()
    mergedRunsByColumn.forEach((runs) => {
        runs.forEach((run) => {
            runStartTermIndices.add(run.startIndex)
        })
    })

    type DisplayRow =
        | { kind: 'header-space', termIndex: number }
        | { kind: 'term-label', termIndex: number, termStart: number }

    const displayRows: DisplayRow[] = []
    const headerDisplayRowByTerm = new Map<number, number>()
    const termLabelDisplayRowByTerm = new Map<number, number>()
    for (let termIndex = 0; termIndex < props.termsDescending.length; termIndex += 1) {
        if (runStartTermIndices.has(termIndex)) {
            headerDisplayRowByTerm.set(termIndex, displayRows.length)
            displayRows.push({ kind: 'header-space', termIndex })
        }
        termLabelDisplayRowByTerm.set(termIndex, displayRows.length)
        displayRows.push({ kind: 'term-label', termIndex, termStart: props.termsDescending[termIndex] })
    }

    const gridTemplateColumns = `${props.widthLeftHeader}% ${props.columns.map((_, i) => `${props.columnWidth + props.extraSpaceRight[i]}%`).join(' ')}`

    return (
        <div style={{ width: '100%', marginTop: '4px', marginBottom: '4px', borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ display: 'grid', gridTemplateColumns, alignItems: 'stretch' }}>
                <div
                    style={{
                        gridColumn: 1,
                        gridRow: 1,
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        textAlign: 'right',
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: panelBackground,
                    }}
                    className="serif value"
                >
                    Term
                </div>
                {props.columns.map((column, columnIndex) => (
                    <div
                        key={`reps_column_header_${columnIndex}`}
                        style={{
                            gridColumn: columnIndex + 2,
                            gridRow: 1,
                            padding: '6px 8px',
                            textAlign: 'center',
                            borderLeft: `1px solid ${borderColor}`,
                            borderBottom: `1px solid ${borderColor}`,
                            backgroundColor: panelBackground,
                        }}
                        className="serif value"
                    >
                        {column.longname}
                    </div>
                ))}

                {displayRows.map((row, displayIndex) => (
                    <div
                        key={`reps_term_display_row_${displayIndex}_${row.termIndex}`}
                        style={{
                            gridColumn: 1,
                            gridRow: displayIndex + 2,
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            textAlign: 'right',
                            borderBottom: displayIndex === displayRows.length - 1 ? 'none' : `1px solid ${borderColor}`,
                        }}
                        className="serif value"
                    >
                        {row.kind === 'term-label' ? formatTermLabel(row.termStart) : ''}
                    </div>
                ))}

                {mergedRunsByColumn.map((runs, columnIndex) => runs.map((run) => {
                    const runBucketsByTerm = districtBucketsByColumnAndTerm[columnIndex].slice(run.startIndex, run.startIndex + run.length)
                    const baseBuckets = runBucketsByTerm[0]
                    const gridTemplateColumnsDistrict = baseBuckets.map(() => 'minmax(0, 1fr)').join(' ')
                    const headerDisplayIndex = headerDisplayRowByTerm.get(run.startIndex)
                    const contentStartDisplayIndex = termLabelDisplayRowByTerm.get(run.startIndex) ?? 0
                    const runEndTermIndex = run.startIndex + run.length - 1
                    const contentEndDisplayIndex = termLabelDisplayRowByTerm.get(runEndTermIndex) ?? contentStartDisplayIndex

                    return (
                        <Fragment key={`reps_run_${columnIndex}_${run.startIndex}_${run.termSignature}`}>
                            {headerDisplayIndex !== undefined && (
                                <div
                                    style={{
                                        gridColumn: columnIndex + 2,
                                        gridRow: headerDisplayIndex + 2,
                                        borderLeft: `1px solid ${borderColor}`,
                                        borderBottom: `1px solid ${borderColor}`,
                                        backgroundColor: colors.background,
                                        display: 'flex',
                                    }}
                                >
                                    <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumnsDistrict, width: '100%', height: '100%' }}>
                                        {baseBuckets.map((bucket, bucketIndex) => (
                                            <div
                                                key={`district_header_${columnIndex}_${run.startIndex}_${bucketIndex}`}
                                                className="serif value"
                                                style={{
                                                    fontSize: '0.9em',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'flex-end',
                                                    alignItems: 'center',
                                                    height: '100%',
                                                    textAlign: 'center',
                                                    padding: '4px 6px',
                                                    borderRight: bucketIndex === baseBuckets.length - 1 ? 'none' : `1px solid ${borderColor}`,
                                                    lineHeight: 1.25,
                                                }}
                                            >
                                                {districtArticleHref(bucket.districtLabel) === undefined
                                                    ? bucket.districtLabel
                                                    : (
                                                            <a
                                                                href={districtArticleHref(bucket.districtLabel)}
                                                                style={{ textDecoration: 'none', color: 'inherit' }}
                                                            >
                                                                {bucket.districtLabel}
                                                            </a>
                                                        )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div
                                style={{
                                    gridColumn: columnIndex + 2,
                                    gridRow: `${contentStartDisplayIndex + 2} / ${contentEndDisplayIndex + 3}`,
                                    borderLeft: `1px solid ${borderColor}`,
                                    borderBottom: contentEndDisplayIndex === displayRows.length - 1 ? 'none' : `1px solid ${borderColor}`,
                                }}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumnsDistrict, height: '100%' }}>
                                    {baseBuckets.map((bucket, bucketIndex) => (
                                        <div
                                            key={`district_cell_${columnIndex}_${run.startIndex}_${bucketIndex}`}
                                            style={{
                                                padding: '6px 8px',
                                                textAlign: 'center',
                                                borderRight: bucketIndex === baseBuckets.length - 1 ? 'none' : `1px solid ${borderColor}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {bucket.entries.length === 0
                                                ? <span className="serif value" style={{ opacity: 0.65 }}>-</span>
                                                : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            {bucket.entries.map((entry, entryIndex) => (
                                                                <span key={`rep_${columnIndex}_${run.startIndex}_${bucketIndex}_${entryIndex}`} className="serif value" style={{ textAlign: 'center' }}>
                                                                    <Representative representative={entry.representative} />
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Fragment>
                    )
                }))}
            </div>
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
