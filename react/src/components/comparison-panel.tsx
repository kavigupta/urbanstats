import '../common.css'
import './article.css'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import React, { ReactNode, useContext, useId, useMemo, useRef, useState } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import { boundingBox, extendBoxes } from '../map-partition'
import { Navigator } from '../navigation/Navigator'
import { colorFromCycle, useColors } from '../page_template/colors'
import { StatGroupSettings, useVisibleRows } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { compareArticleRows } from '../sorting'
import { Universe, universeContext } from '../universe'
import { mixWithBackground } from '../utils/color'
import { sanitize } from '../utils/paths'
import { notWaiting, waiting } from '../utils/promiseStream'
import { Article } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { TransposeContext } from '../utils/transpose'
import { zIndex } from '../utils/zIndex'

import { placeWarnings, useArticleWarnings, WarningRow } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { StagingControls } from './StagingControls'
import { useCSVExport } from './csv-export'
import { TableEditButton } from './edit-mode-header'
import { EditModeState, EditTable, editRowsByGroup, useEditModeState, useEditTableLayout } from './edit-table'
import { ArticleRow, isCongressionalRepresentativesMetadataRow, isNoValue } from './load-article'
import { CommonMaplibreMap, PolygonFeatureCollection, polygonFeatureCollection, useZoomAllFeatures, defaultMapPadding, CustomAttributionControlComponent } from './map-common'
import { PlotProps, pullRelevantPlotProps, useExpandedByStat } from './plots'
import { createScreenshot, ScreencapElements, ScreenshotContext, ScreenshotContextType, useScreenshotMode } from './screenshot'
import { computeComparisonWidthColumns, computeMaxColumns, MaybeScroll } from './scrollable'
import { SearchBox } from './search'
import { computeNameSpecsWithGroups } from './statistic-name-specs'
import { TableContents, CellSpec, PlotSpec, SuperHeaderSpec, TableLayout, TopLeftCellSpec } from './supertable'
import { ColumnIdentifier, valueOnlyColumns } from './table'

interface ComparisonPanelProps {
    universe: Universe
    universes: readonly Universe[]
    articles: Article[]
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    mapPartitions: number[][]
}

interface ComparisonTableShape {
    /** Whether the statistics run along the columns and the regions down the rows. */
    transpose: boolean
    onlyColumns: ColumnIdentifier[]
    /** How wide the table wants to be, in the units `MaybeScroll` decides to scroll by. */
    widthColumns: number
    /** The share of the table the left header takes, as a fraction. */
    leftMarginPercent: number
    /** The share of the table each column takes, as a percentage. */
    columnWidth: number
}

/**
 * Fits the table to the screen. A comparison of many regions is wider than one screen, and
 * there are usually more statistics than regions, so turning it on its side is what makes it
 * fit -- but only when the table is actually too wide, and only when transposing is the
 * narrower of the two.
 */
function comparisonTableShape(params: {
    numArticles: number
    numStats: number
    numWarnings: number
    numExpandedExtras: number
    includeOrdinals: boolean
    hasCongressionalRepresentativeTable: boolean
    mobileLayout: boolean
    editMode: boolean
}): ComparisonTableShape {
    const { numArticles, numStats, numWarnings, numExpandedExtras, mobileLayout, editMode } = params

    // Mobile edit mode gives up the ordinal and percentile columns, so the tree has room.
    const showOrdinalColumns = params.includeOrdinals && !(editMode && mobileLayout)

    // Transposed, a warning stands in for a column, so it takes up a column's worth of width
    // alongside the statistics that are still shown.
    const numTransposedColumns = numStats + numWarnings

    const widthUntransposed = computeComparisonWidthColumns(numArticles, showOrdinalColumns)
    const widthTransposed = (showOrdinalColumns ? 1.5 : 1) * (numTransposedColumns + numExpandedExtras) + 1.5

    // The edit tree runs down the left column, and there are almost always more statistics
    // than regions, so editing always uses the untransposed orientation.
    const transpose = !editMode
        && !params.hasCongressionalRepresentativeTable
        && widthUntransposed > computeMaxColumns(mobileLayout)
        && widthUntransposed > widthTransposed

    // The tree needs considerably more room than a column of statistic names does.
    const leftMarginPercent = editMode ? (mobileLayout ? 0.55 : 0.32) : (transpose ? 0.24 : 0.18)
    const numColumns = transpose ? numTransposedColumns + numExpandedExtras : numArticles

    return {
        transpose,
        onlyColumns: showOrdinalColumns
            ? ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile']
            : valueOnlyColumns,
        widthColumns: transpose ? widthTransposed : widthUntransposed,
        leftMarginPercent,
        columnWidth: 100 * (1 - leftMarginPercent) / numColumns,
    }
}

/**
 * How many columns the table has depends on which statistics are missing, and warnings are left
 * out of screenshots -- so the panel has to read screenshot mode, which means providing the
 * context here rather than taking the one `PageTemplate` would otherwise make below it.
 */
export function ComparisonPanel(props: ComparisonPanelProps): ReactNode {
    const screenshotContext = useRef<ScreenshotContextType>({ render: new Set(), wait: new Set() })
    return (
        <ScreenshotContext.Provider value={screenshotContext.current}>
            <ComparisonPanelContents {...props} screenshotContext={screenshotContext.current} />
        </ScreenshotContext.Provider>
    )
}

function ComparisonPanelContents(props: ComparisonPanelProps & { screenshotContext: ScreenshotContextType }): ReactNode {
    const colors = useColors()
    const tableRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef(null)

    // State for drag overlay and articles
    const [activeId, setActiveId] = useState<string | null>(null)
    const [localArticles, setLocalArticles] = useState<{ value: Article[], propsValue: Article[] }>({ value: props.articles, propsValue: props.articles })

    const [sortByStatIndex, setSortByStatIndex] = useState<number | null>(null)
    const [sortDirection, setSortDirection] = useState<'up' | 'down'>('down')

    const editState = useEditModeState()
    const { editMode, setEditMode } = editState

    // Sensors for drag and drop - more sensitive for vertical dragging
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 1,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 50,
                tolerance: 0,
            },
        }),
    )

    // Sync local state with props
    let localArticlesToUse
    if (localArticles.propsValue === props.articles) {
        localArticlesToUse = localArticles.value
    }
    else {
        setLocalArticles({ propsValue: props.articles, value: props.articles })
        localArticlesToUse = props.articles
    }

    const joinedString = localArticlesToUse.map(x => x.shortname).join(' vs ')
    const names = localArticlesToUse.map(a => a.longname)

    const screencapElements = (): ScreencapElements => ({
        path: `${sanitize(joinedString)}.png`,
        overallWidth: tableRef.current!.offsetWidth * 2,
        elementsToRender: [tableRef.current!, mapRef.current!],
    })

    // Drag and drop handlers
    const handleDragStart = (event: DragStartEvent): void => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = localArticlesToUse.findIndex(article => article.shortname === active.id)
            const newIndex = localArticlesToUse.findIndex(article => article.shortname === over.id)

            const newArticles = arrayMove(localArticlesToUse, oldIndex, newIndex)
            const newLongnames = newArticles.map(a => a.longname)

            // Update local state immediately for responsive UI
            setLocalArticles({ propsValue: props.articles, value: newArticles })

            // Update the URL to reflect the new order
            void navContext.navigate({
                kind: 'comparison',
                universe: props.universe,
                longnames: newLongnames,
            }, { history: 'push', scroll: { kind: 'none' } })
        }

        setActiveId(null)
    }

    const dataByArticleStat = useVisibleRows(props.rows, editMode)
    const dataByStatArticle = dataByArticleStat[0].map((_, statIndex) => dataByArticleStat.map(articleData => articleData[statIndex]))

    const warnings = useArticleWarnings()
    const warningPlacements = placeWarnings(dataByStatArticle.map(rowsForStat => rowsForStat[0].statpath), warnings)

    const handleSort = (statIndex: number): void => {
        let newSortDirection: 'up' | 'down' | 'both'
        if (sortByStatIndex === statIndex) {
            newSortDirection = sortDirection === 'up' ? 'down' : 'up'
        }
        else {
            newSortDirection = 'down'
            setSortByStatIndex(statIndex)
        }

        setSortDirection(newSortDirection)

        const statData = dataByStatArticle[statIndex]
        const sortedIndices = statData
            .map((row, index) => ({ row, index }))
            .sort((a, b) => compareArticleRows(a.row, b.row, newSortDirection))
            .map(item => item.index)

        const newArticles = sortedIndices.map(index => localArticlesToUse[index])

        setLocalArticles({ propsValue: props.articles, value: newArticles })

        void navContext.navigate({
            kind: 'comparison',
            universe: props.universe,
            longnames: newArticles.map(a => a.longname),
        }, { history: 'push', scroll: { kind: 'none' } })
    }

    const mobileLayout = useMobileLayout()

    const validOrdinalsByStat = dataByStatArticle.map(statData => statData.every(value => value.kind !== 'metadata' && value.disclaimer !== 'heterogenous-sources'))

    // Ordinals are only meaningful between regions of the same type.
    const allSameArticleType = localArticlesToUse.every(article => article.articleType === localArticlesToUse[0].articleType)

    const includeOrdinals = (
        allSameArticleType
        && (validOrdinalsByStat.length === 0 || validOrdinalsByStat.some(x => x))
    )

    const expandedByStatIndex = useExpandedByStat(
        dataByStatArticle.map(([{ statpath }]) => statpath),
        statIndex => dataByStatArticle[statIndex].some(row => row.extraStats.length > 0),
    )

    const { transpose, onlyColumns, widthColumns, leftMarginPercent, columnWidth } = comparisonTableShape({
        numArticles: localArticlesToUse.length,
        numStats: dataByArticleStat[0].length,
        numWarnings: warningPlacements.length,
        numExpandedExtras: expandedByStatIndex.filter(v => v).length,
        includeOrdinals,
        hasCongressionalRepresentativeTable: dataByStatArticle.some(statData =>
            statData.some(row => isCongressionalRepresentativesMetadataRow(row)),
        ),
        mobileLayout,
        editMode,
    })

    const highlightArticleIndicesByStat: (number | undefined)[] = dataByStatArticle.map(articlesStatData => getHighlightIndex(articlesStatData))

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonRightStyle = useComparisonHeadStyle('right')
    const searchComparisonStyle = useComparisonHeadStyle()

    const navContext = useContext(Navigator.Context)

    const sharedTypeOfAllArticles = allSameArticleType ? localArticlesToUse[0].articleType : undefined

    const rowToDisplayForStat = (statIndex: number): ArticleRow => {
        return dataByStatArticle[statIndex].find(row => row.extraStats.length > 0) ?? dataByStatArticle[statIndex][0]
    }

    const plotProps = (statIndex: number): PlotProps[] => dataByStatArticle[statIndex].flatMap((row, articleIdx) =>
        pullRelevantPlotProps(dataByArticleStat[articleIdx], statIndex, colorFromCycle(colors.hueColors, articleIdx), localArticlesToUse[articleIdx].shortname, localArticlesToUse[articleIdx].longname, sharedTypeOfAllArticles),
    )

    const longnameHeaderSpecs: CellSpec[] = Array.from({ length: localArticlesToUse.length }).map((_, articleIndex) => (
        {
            type: 'comparison-longname',
            articleIndex,
            articles: localArticlesToUse,
            names,
            transpose,
            sharedTypeOfAllArticles,
            highlightIndex: articleIndex,
            draggable: true,
            articleId: localArticlesToUse[articleIndex].shortname,
        } satisfies CellSpec
    ))

    const statisticNameHeaderSpecsOriginal: (CellSpec & { type: 'statistic-name' })[] = Array.from({ length: dataByStatArticle.length }).map((_, statIndex) => {
        const row = rowToDisplayForStat(statIndex)
        return {
            type: 'statistic-name',
            row,
            renderedStatname: row.renderedStatname,
            longname: names[0],
            currentUniverse: props.universe,
            center: transpose ? true : false,
            transpose,
            highlightIndex: highlightArticleIndicesByStat[statIndex],
            sortInfo: {
                onSort: () => {
                    handleSort(statIndex)
                },
                sortDirection: sortByStatIndex === statIndex ? sortDirection : 'both',
            },
        } satisfies CellSpec
    })

    const { updatedNameSpecs: statisticNameHeaderSpecs, groupNames: statisticNameGroupNames } = computeNameSpecsWithGroups(statisticNameHeaderSpecsOriginal)

    /**
     * Transposed, a warning stands in for a column, so it takes a column's worth of space in the
     * header and in every row. Each warning shifts the ones after it along by one, so the nth
     * warning's own column ends up n places later than the statistic it displaces.
     */
    const warningColumnAt = (warningIndex: number): number => warningPlacements[warningIndex].index + warningIndex

    function insertWarningColumns<T>(values: T[], valueForWarning: (warning: WarningRow) => T): T[] {
        const result = [...values]
        warningPlacements.forEach((warning, warningIndex) => {
            result.splice(warningColumnAt(warningIndex), 0, valueForWarning(warning))
        })
        return result
    }

    const transposedNameSpecs = insertWarningColumns<CellSpec & { type: 'statistic-name' }>(
        statisticNameHeaderSpecsOriginal,
        warning => ({
            type: 'statistic-name',
            renderedStatname: warning.name ?? '',
            longname: names[0],
            currentUniverse: props.universe,
            center: true,
            transpose: true,
        }),
    )
    const { updatedNameSpecs: transposedHeaderSpecs, groupNames: transposedGroupNames } = computeNameSpecsWithGroups(transposedNameSpecs)

    const rowSpecsByStat: CellSpec[][] = Array.from({ length: dataByStatArticle.length }).map((_, statIndex) => (
        Array.from({ length: localArticlesToUse.length }).map((unused, articleIndex) => {
            const row = dataByArticleStat[articleIndex][statIndex]

            if (row.kind === 'metadata') {
                return {
                    type: 'statistic-row',
                    row,
                    longname: names[articleIndex],
                    onlyColumns,
                    simpleOrdinals: true,
                    onNavigate: () => {
                        throw new Error('Metadata rows cannot be navigated')
                    },
                } satisfies CellSpec
            }

            return {
                type: 'statistic-row',
                row,
                longname: names[articleIndex],
                onlyColumns,
                blankColumns: validOrdinalsByStat[statIndex] ? [] : ['statistic_ordinal', 'statistic_percentile'],
                simpleOrdinals: true,
                statisticStyle: highlightArticleIndicesByStat[statIndex] === articleIndex
                    ? { backgroundColor: mixWithBackground(colorFromCycle(colors.hueColors, articleIndex), colors.mixPct / 100, colors.background) }
                    : {},
                onNavigate: (x: string) => {
                    void navContext.navigate({
                        kind: 'comparison',
                        universe: props.universe,
                        longnames: names.map((value, index) => index === articleIndex ? x : value),
                    }, { history: 'push', scroll: { kind: 'none' } })
                },
            } satisfies CellSpec
        })
    ))

    const rowSpecsByStatTransposed = rowSpecsByStat.length === 0 ? [] : rowSpecsByStat[0].map((_, statIndex) => rowSpecsByStat.map(rowSpecs => rowSpecs[statIndex]))

    const plotSpecs: (PlotSpec | undefined)[] = Array.from({ length: dataByStatArticle.length }).map((_, statIndex) =>
        expandedByStatIndex[statIndex]
            ? {
                    statDescription: dataByStatArticle[statIndex][0].renderedStatname,
                    plotProps: plotProps(statIndex),
                }
            : undefined,
    )

    const topLeftSpec: TopLeftCellSpec = { type: 'comparison-top-left-header', statNameOverride: transpose ? 'Region' : undefined }

    // "Select Statistics" rather than "Select", to distinguish it from editing the regions being
    // compared, which the column headers do. The top-left cell is too narrow here to hold both
    // the button and the column's name.
    const editStatisticsButton: TableEditButton = { open: false, onEdit: () => { setEditMode(true) }, label: 'Select Statistics', placement: 'super-header' }

    const longnameSuperHeaderSpec: SuperHeaderSpec = { headerSpecs: longnameHeaderSpecs, showBottomBar: true }

    const columnLayout: TableLayout = {
        widthLeftHeader: leftMarginPercent * 100,
        columnWidth,
        onlyColumns,
        simpleOrdinals: true,
    }

    // Transposing swaps which axis the statistics run along, so it swaps the headers, the row
    // specs, which direction the expanded plots stretch in, and whether a warning stands in for
    // a row or a column. With no statistics at all there are no transposed rows to hang columns
    // off, so the warnings fall back to rows there.
    const orientedSpecs = transpose
        ? {
                superHeaderSpec: { headerSpecs: transposedHeaderSpecs, showBottomBar: false, groupNames: transposedGroupNames },
                leftHeaderSpec: { leftHeaderSpecs: longnameHeaderSpecs },
                rowSpecs: rowSpecsByStatTransposed.map(row => insertWarningColumns<CellSpec>(row, () => ({ type: 'blank' }))),
                horizontalPlotSpecs: plotSpecs.map(() => undefined),
                verticalPlotSpecs: insertWarningColumns<PlotSpec | undefined>(plotSpecs, () => undefined),
                warningColumns: rowSpecsByStatTransposed.length === 0
                    ? []
                    : warningPlacements.map(({ content }, warningIndex) => ({ columnIndex: warningColumnAt(warningIndex), content })),
                warningRows: rowSpecsByStatTransposed.length === 0
                    ? warnings.map(({ name, content }) => ({ index: 0, name, content }))
                    : [],
            }
        : {
                superHeaderSpec: longnameSuperHeaderSpec,
                leftHeaderSpec: { leftHeaderSpecs: statisticNameHeaderSpecs, groupNames: statisticNameGroupNames },
                rowSpecs: rowSpecsByStat,
                horizontalPlotSpecs: plotSpecs,
                verticalPlotSpecs: [],
                warningRows: warningPlacements,
            }

    const csvExportCallback = useCSVExport(localArticlesToUse, props.rows, includeOrdinals, joinedString)

    return (
        <universeContext.Provider value={{
            universes: props.universes,
            universe: props.universe,
            setUniverse(newUniverse) {
                void navContext.navigate({
                    kind: 'comparison',
                    universe: newUniverse,
                    longnames: names,
                }, {
                    history: 'push',
                    scroll: { kind: 'none' },
                })
            },
        }}
        >
            <TransposeContext.Provider value={transpose}>
                <QuerySettingsConnection />
                <PageTemplate
                    screencap={(...args) => createScreenshot(screencapElements, ...args)}
                    screenshotContext={props.screenshotContext}
                    csvExportCallback={csvExportCallback}
                >
                    <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        collisionDetection={closestCenter}
                    >
                        <SortableContext items={localArticlesToUse.map(a => a.shortname)} strategy={transpose ? verticalListSortingStrategy : horizontalListSortingStrategy}>
                            <div>
                                <div className={headerTextClass}>Comparison</div>
                                <div className={subHeaderTextClass}>{joinedString}</div>
                                <div style={{ marginBlockEnd: '16px' }}></div>

                                <div style={{ display: 'flex' }}>
                                    <div style={{ width: `${100 * leftMarginPercent}%` }} />
                                    <div style={{ width: `${50 * (1 - leftMarginPercent)}%`, marginRight: '1em' }}>
                                        <div className="serif" style={comparisonRightStyle}>Add another region:</div>
                                    </div>
                                    <div style={{ width: `${50 * (1 - leftMarginPercent)}%` }}>
                                        <SearchBox
                                            style={{ ...searchComparisonStyle, width: '100%' }}
                                            placeholder="Name"
                                            articleLink={x =>
                                                navContext.link({
                                                    kind: 'comparison',
                                                    universe: props.universe,
                                                    longnames: [...names, x],
                                                }, { scroll: { kind: 'none' } })}
                                            autoFocus={false}
                                            prioritizeArticleType={sharedTypeOfAllArticles}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBlockEnd: '1em' }}></div>

                                {/* Outside the scroll and tableRef, so its buttons stay on screen and out of screenshots. */}
                                <StagingControls onExitStaging={editState.exitEditMode} />

                                <MaybeScroll widthColumns={widthColumns}>
                                    <div ref={tableRef} data-test-id="comparison-table">
                                        {editMode
                                            ? (
                                                    <ComparisonEditTable
                                                        universe={props.universe}
                                                        longname={names[0]}
                                                        dataByArticleStat={dataByArticleStat}
                                                        rowsToDisplay={dataByStatArticle.map((_, statIndex) => rowToDisplayForStat(statIndex))}
                                                        rowSpecsByStat={rowSpecsByStat}
                                                        plotSpecs={plotSpecs}
                                                        columnLayout={columnLayout}
                                                        superHeaderSpec={longnameSuperHeaderSpec}
                                                        topLeftSpec={topLeftSpec}
                                                        editState={editState}
                                                    />
                                                )
                                            : (
                                                    <TableContents
                                                        layout={columnLayout}
                                                        {...orientedSpecs}
                                                        editButton={editStatisticsButton}
                                                        topLeftSpec={topLeftSpec}
                                                    />
                                                )}
                                    </div>
                                </MaybeScroll>
                                <div className="gap"></div>

                                <div ref={mapRef}>
                                    <ComparisonMultiMap
                                        longnames={localArticlesToUse.map(x => x.longname)}
                                        colors={localArticlesToUse.map((_, i) => colorFromCycle(colors.hueColors, i))}
                                        mapPartitions={props.mapPartitions}
                                    />
                                </div>
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeId
                                ? (
                                        <div style={{ opacity: 0.5, backgroundColor: colors.background, padding: '8px', borderRadius: '4px' }}>
                                            {localArticlesToUse.find(a => a.shortname === activeId)?.longname}
                                        </div>
                                    )
                                : null}
                        </DragOverlay>
                    </DndContext>
                </PageTemplate>
            </TransposeContext.Provider>
        </universeContext.Provider>
    )
}

/**
 * The comparison's edit tree. Split out so the column width measurement, which is over every
 * statistic rather than the selected ones, only happens while edit mode is actually open.
 */
function ComparisonEditTable(props: {
    universe: Universe
    longname: string
    dataByArticleStat: ArticleRow[][]
    /** The row whose name and adornments stand for each statistic, in statistic order. */
    rowsToDisplay: ArticleRow[]
    rowSpecsByStat: CellSpec[][]
    plotSpecs: (PlotSpec | undefined)[]
    columnLayout: TableLayout
    superHeaderSpec: SuperHeaderSpec
    topLeftSpec: TopLeftCellSpec
    editState: EditModeState
}): ReactNode {
    const layout = useEditTableLayout(props.columnLayout, props.dataByArticleStat, props.universe)
    const rowsByGroup = editRowsByGroup(props.rowsToDisplay, props.longname, props.universe, (_, statIndex) => ({
        cellSpecs: props.rowSpecsByStat[statIndex],
        plotSpec: props.plotSpecs[statIndex],
    }))
    return (
        <EditTable
            rowsByGroup={rowsByGroup}
            layout={layout}
            editState={props.editState}
            superHeaderSpec={props.superHeaderSpec}
            topLeftSpec={props.topLeftSpec}
        />
    )
}

function getHighlightIndex(rows: readonly ArticleRow[]): number | undefined {
    if (!rows.every(r => r.kind === 'statistic')) {
        return undefined
    }
    return rows.map(x => x.statval).reduce<number | undefined>((iMax, x, i, arr) => {
        if (isNoValue(x)) {
            return iMax
        }
        if (iMax === undefined) {
            return i
        }
        return x > arr[iMax] ? i : iMax
    }, undefined)
}

function ComparisonMultiMap(props: { longnames: string[], colors: string[], mapPartitions: number[][] }): ReactNode {
    /*
     If mobile, make 2 columns, if one at the end, use full width

     If desktop, make 3 columns, if 4 at the end, make 4, if 2 at the end, make 2 (there will never be 1 at the end because that's 4)
     */
    const isMobile = useMobileLayout()
    const rows: [number, number[]][][] = useMemo(() => {
        const slice = (from: number, to: number): [number, number[]][] => {
            return props.mapPartitions.slice(from, to).map((partition, sliceIndex) => [from + sliceIndex, partition])
        }

        if (isMobile) {
            const result: [number, number[]][][] = []
            for (let i = 0; i < props.mapPartitions.length; i += 2) {
                result.push(slice(i, i + 2))
            }
            return result
        }
        else {
            const result: [number, number[]][][] = []
            for (let i = 0; i < props.mapPartitions.length; i += 3) {
                if (props.mapPartitions.length - i === 4) {
                    result.push(
                        slice(i, i + 2),
                        slice(i + 2, i + 4),
                    )
                    i += 1
                }
                else {
                    result.push(slice(i, i + 3))
                }
            }
            return result
        }
    }, [isMobile, props.mapPartitions])

    return rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', width: '100%' }}>
            {row.map(([partitionIndex, partition]) => {
                return (
                    <div key={partitionIndex} style={{ position: 'relative', width: `${100 / row.length}%` }}>
                        <ComparisonMap
                            longnames={partition.map(index => props.longnames[index])}
                            colors={partition.map(index => props.colors[index])}
                            attribution={
                                partitionIndex === props.mapPartitions.length - 1
                            }
                        />
                    </div>
                )
            })}
        </div>
    ))
}

function ComparisonMap({ longnames, colors, attribution }: { longnames: string[], colors: string[], attribution: boolean }): ReactNode {
    const [mapRef, setMapRef] = useState<MapRef | null>(null)

    const features = useMemo(() => polygonFeatureCollection(longnames.map((longname, i) => ({
        name: longname,
        color: colors[i], fillColor: colors[i], fillOpacity: 0.5, weight: 1,
    }))), [longnames, colors]).use()

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])
    const id = useId()

    useZoomAllFeatures(mapRef, features, readyFeatures)

    return (
        <div style={{ position: 'relative' }}>
            <CommonMaplibreMap
                id={id}
                ref={setMapRef}
                attributionControl={false}
            >
                <PolygonFeatureCollection features={readyFeatures} clickable={true} />
                <FullscreenControl position="top-left" />
                { attribution && <CustomAttributionControlComponent startShowingAttribution={true} />}
            </CommonMaplibreMap>
            <ComparisonMapButtons longnames={longnames} colors={colors} features={features} mapRef={mapRef} />
        </div>
    )
}

function ComparisonMapButtons({ longnames, colors, features, mapRef }: { longnames: string[], colors: string[], features: (GeoJSON.Feature | typeof waiting)[], mapRef: MapRef | null }): ReactNode {
    const systemColors = useColors()
    const isScreenshot = useScreenshotMode()

    if (isScreenshot) {
        return null
    }

    const click = (i: number): void => {
        if (features[i] !== waiting) {
            mapRef?.fitBounds(boundingBox(features[i].geometry), { animate: true, padding: defaultMapPadding })
        }
    }

    const zoomToAll = (): void => {
        mapRef?.fitBounds(extendBoxes(features.filter(notWaiting).map(f => boundingBox(f.geometry))), { animate: true, padding: defaultMapPadding })
    }

    return (
        <div style={
            { zIndex: zIndex.comparisonMapButton, position: 'absolute', right: 0, top: 0, padding: '12px' }
        }
        >
            <div style={{
                display: 'flex', backgroundColor: systemColors.background, padding: '6px', borderRadius: '6px',
                alignItems: 'center',
            }}
            >
                <span className="serif" style={{ fontSize: '15px', fontWeight: 500 }}>Zoom to:</span>
                <div style={{ width: '3px' }} />
                <ZoomButton color={systemColors.textMain} onClick={zoomToAll} />
                {longnames.map((longname, i) => <ZoomButton key={i} color={colors[i]} onClick={() => { click(i) }} />)}
            </div>
        </div>
    )
}

function ZoomButton({ color, onClick }: { color: string, onClick: () => void }): ReactNode {
    return (
        <div
            style={{
                display: 'inline-block', width: '24px', height: '24px',
                backgroundColor: color, borderRadius: '50%', marginLeft: '5px', marginRight: '5px',
                cursor: 'pointer',
            }}
            onClick={onClick}
        />
    )
}
