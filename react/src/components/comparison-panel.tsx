import '../common.css'
import './article.css'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import React, { ReactNode, useContext, useId, useMemo, useRef, useState } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import { boundingBox, extendBoxes } from '../map-partition'
import { Navigator } from '../navigation/Navigator'
import { sanitize } from '../navigation/links'
import { colorFromCycle, useColors } from '../page_template/colors'
import { rowExpandedKey, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { compareArticleRows } from '../sorting'
import { useUniverse } from '../universe'
import { mixWithBackground } from '../utils/color'
import { notWaiting, waiting } from '../utils/promiseStream'
import { Article } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { TransposeContext } from '../utils/transpose'

import { ArticleWarnings } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { computeNameSpecsWithGroups } from './article-panel'
import { generateCSVDataForArticles, CSVExportData } from './csv-export'
import { ArticleRow } from './load-article'
import { CommonMaplibreMap, PolygonFeatureCollection, polygonFeatureCollection, useZoomAllFeatures, defaultMapPadding, CustomAttributionControlComponent } from './map-common'
import { PlotProps } from './plots'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { TableContents, CellSpec } from './supertable'
import { ColumnIdentifier } from './table'

export function ComparisonPanel(props: { universes: string[], articles: Article[], rows: (settings: StatGroupSettings) => ArticleRow[][], mapPartitions: number[][] }): ReactNode {
    const colors = useColors()
    const tableRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef(null)

    // State for drag overlay and articles
    const [activeId, setActiveId] = useState<string | null>(null)
    const [localArticles, setLocalArticles] = useState<{ value: Article[], propsValue: Article[] }>({ value: props.articles, propsValue: props.articles })

    const [sortByStatIndex, setSortByStatIndex] = useState<number | null>(null)
    const [sortDirection, setSortDirection] = useState<'up' | 'down'>('down')

    // Sensors for drag and drop - more sensitive for vertical dragging
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 0,
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
                universe: navContext.universe,
                longnames: newLongnames,
            }, { history: 'push', scroll: { kind: 'none' } })
        }

        setActiveId(null)
    }

    const settings = useSettings(groupYearKeys())

    const dataByArticleStat = props.rows(settings)
    const dataByStatArticle = dataByArticleStat[0].map((_, statIndex) => dataByArticleStat.map(articleData => articleData[statIndex]))

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
            universe: navContext.universe,
            longnames: newArticles.map(a => a.longname),
        }, { history: 'push', scroll: { kind: 'none' } })
    }

    const mobileLayout = useMobileLayout()

    const validOrdinalsByStat = dataByStatArticle.map(statData => statData.every(value => value.disclaimer !== 'heterogenous-sources'))

    const includeOrdinals = (
        localArticlesToUse.every(article => article.articleType === localArticlesToUse[0].articleType)
        && (validOrdinalsByStat.length === 0 || validOrdinalsByStat.some(x => x))
    )

    const onlyColumns: ColumnIdentifier[] = includeOrdinals ? ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile'] : ['statval', 'statval_unit']

    const maxColumns = mobileLayout ? 4 : 6

    const expandedSettings = useSettings(dataByStatArticle.filter(statData => statData.some(row => row.extraStat !== undefined)).map(([{ statpath }]) => rowExpandedKey(statpath)))

    const expandedByStatIndex = dataByStatArticle.map(([{ statpath }]) => expandedSettings[rowExpandedKey(statpath)] ?? false)
    const numExpandedExtras = expandedByStatIndex.filter(v => v).length

    let widthColumns = (includeOrdinals ? 1.5 : 1) * localArticlesToUse.length + 1
    let widthTransposeColumns = (includeOrdinals ? 1.5 : 1) * (dataByArticleStat[0].length + numExpandedExtras) + 1.5

    const transpose = widthColumns > maxColumns && widthColumns > widthTransposeColumns

    if (transpose) {
        ([widthColumns, widthTransposeColumns] = [widthTransposeColumns, widthColumns])
    }

    const leftMarginPercent = transpose ? 0.24 : 0.18
    const numColumns = transpose ? dataByArticleStat[0].length : localArticlesToUse.length
    const columnWidth = 100 * (1 - leftMarginPercent) / (numColumns + (transpose ? numExpandedExtras : 0))

    const maybeScroll = (contents: React.ReactNode): ReactNode => {
        if (widthColumns > maxColumns) {
            return (
                <div style={{ overflowX: 'scroll' }}>
                    <div style={{ width: `${100 * widthColumns / (maxColumns - 0.7)}%` }}>
                        {contents}
                    </div>
                </div>
            )
        }
        return contents
    }

    const highlightArticleIndicesByStat: (number | undefined)[] = dataByStatArticle.map(articlesStatData => getHighlightIndex(articlesStatData))

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonRightStyle = useComparisonHeadStyle('right')
    const searchComparisonStyle = useComparisonHeadStyle()

    const currentUniverse = useUniverse()

    const navContext = useContext(Navigator.Context)

    const sharedTypeOfAllArticles = localArticlesToUse.every(article => article.articleType === localArticlesToUse[0].articleType) ? localArticlesToUse[0].articleType : undefined

    const rowToDisplayForStat = (statIndex: number): ArticleRow => {
        return dataByStatArticle[statIndex].find(row => row.extraStat !== undefined) ?? dataByStatArticle[statIndex][0]
    }

    const plotProps = (statIndex: number): PlotProps[] => dataByStatArticle[statIndex].map((row, articleIdx) => ({ ...row, color: colorFromCycle(colors.hueColors, articleIdx), shortname: localArticlesToUse[articleIdx].shortname, longname: localArticlesToUse[articleIdx].longname, sharedTypeOfAllArticles }))

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

    const statisticNameHeaderSpecsOriginal: (CellSpec & { type: 'statistic-name' })[] = Array.from({ length: dataByStatArticle.length }).map((_, statIndex) => (
        {
            type: 'statistic-name',
            row: rowToDisplayForStat(statIndex),
            longname: names[0],
            currentUniverse,
            center: transpose ? true : false,
            transpose,
            highlightIndex: highlightArticleIndicesByStat[statIndex],
            sortInfo: {
                onSort: () => {
                    handleSort(statIndex)
                },
                sortDirection: sortByStatIndex === statIndex ? sortDirection : 'both',
            },
        }
    ))

    const { updatedNameSpecs: statisticNameHeaderSpecs, groupNames: statisticNameGroupNames } = computeNameSpecsWithGroups(statisticNameHeaderSpecsOriginal)

    const rowSpecsByStat: CellSpec[][] = Array.from({ length: dataByStatArticle.length }).map((_, statIndex) => (
        Array.from({ length: localArticlesToUse.length }).map((unused, articleIndex) => ({
            type: 'statistic-row',
            row: dataByArticleStat[articleIndex][statIndex],
            longname: names[articleIndex],
            onlyColumns,
            blankColumns: validOrdinalsByStat[statIndex] ? [] : ['statistic_ordinal', 'statistic_percentile'],
            simpleOrdinals: true,
            statisticStyle: highlightArticleIndicesByStat[statIndex] === articleIndex ? { backgroundColor: mixWithBackground(colorFromCycle(colors.hueColors, articleIndex), colors.mixPct / 100, colors.background) } : {},
            onNavigate: (x: string) => {
                void navContext.navigate({
                    kind: 'comparison',
                    universe: navContext.universe,
                    longnames: names.map((value, index) => index === articleIndex ? x : value),
                }, { history: 'push', scroll: { kind: 'none' } })
            },
        }))
    ))

    const rowSpecsByStatTransposed = rowSpecsByStat.length === 0 ? [] : rowSpecsByStat[0].map((_, statIndex) => rowSpecsByStat.map(rowSpecs => rowSpecs[statIndex]))

    const plotSpecs: ({ statDescription: string, plotProps: PlotProps[] } | undefined)[] = Array.from({ length: dataByStatArticle.length }).map((_, statIndex) =>
        expandedByStatIndex[statIndex]
            ? {
                    statDescription: dataByStatArticle[statIndex][0].renderedStatname,
                    plotProps: plotProps(statIndex),
                }
            : undefined,
    )

    const topLeftSpec: CellSpec = { type: 'comparison-top-left-header', statNameOverride: transpose ? 'Region' : undefined }

    const csvData = generateCSVDataForArticles(localArticlesToUse, dataByArticleStat, includeOrdinals)
    const csvFilename = `${sanitize(joinedString)}.csv`
    const csvExportData: CSVExportData = { csvData, csvFilename }

    return (
        <TransposeContext.Provider value={transpose}>
            <QuerySettingsConnection />
            <PageTemplate
                screencapElements={screencapElements}
                csvExportData={csvExportData}
                hasUniverseSelector={true}
                universes={props.universes}
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
                                        link={x =>
                                            navContext.link({
                                                kind: 'comparison',
                                                universe: currentUniverse,
                                                longnames: [...names, x],
                                            }, { scroll: { kind: 'none' } })}
                                        autoFocus={false}
                                        prioritizeArticleType={sharedTypeOfAllArticles}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBlockEnd: '1em' }}></div>

                            {maybeScroll(
                                <div ref={tableRef}>
                                    {transpose
                                        ? (
                                                <TableContents
                                                    superHeaderSpec={{ headerSpecs: statisticNameHeaderSpecs, showBottomBar: false, groupNames: statisticNameGroupNames }}
                                                    leftHeaderSpec={{ leftHeaderSpecs: longnameHeaderSpecs }}
                                                    rowSpecs={rowSpecsByStatTransposed}
                                                    horizontalPlotSpecs={plotSpecs.map(() => undefined)}
                                                    verticalPlotSpecs={plotSpecs}
                                                    topLeftSpec={topLeftSpec}
                                                    widthLeftHeader={leftMarginPercent * 100}
                                                    columnWidth={columnWidth}
                                                    onlyColumns={onlyColumns}
                                                    simpleOrdinals={true}
                                                />
                                            )
                                        : (
                                                <TableContents
                                                    superHeaderSpec={{ headerSpecs: longnameHeaderSpecs, showBottomBar: true }}
                                                    leftHeaderSpec={{ leftHeaderSpecs: statisticNameHeaderSpecs, groupNames: statisticNameGroupNames }}
                                                    rowSpecs={rowSpecsByStat}
                                                    horizontalPlotSpecs={plotSpecs}
                                                    verticalPlotSpecs={[]}
                                                    topLeftSpec={topLeftSpec}
                                                    widthLeftHeader={leftMarginPercent * 100}
                                                    columnWidth={columnWidth}
                                                    onlyColumns={onlyColumns}
                                                    simpleOrdinals={true}
                                                />
                                            )}
                                    <ArticleWarnings />
                                </div>,
                            )}
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
    )
}

function getHighlightIndex(rows: ArticleRow[]): number | undefined {
    return rows.map(x => x.statval).reduce<number | undefined>((iMax, x, i, arr) => {
        if (isNaN(x)) {
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
    const mapRef = useRef<MapRef>(null)

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
                ref={mapRef}
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

export function ComparisonMapButtons({ longnames, colors, features, mapRef }: { longnames: string[], colors: string[], features: (GeoJSON.Feature | typeof waiting)[], mapRef: React.RefObject<MapRef> }): ReactNode {
    const systemColors = useColors()
    const isScreenshot = useScreenshotMode()

    if (isScreenshot) {
        return null
    }

    const click = (i: number): void => {
        if (features[i] !== waiting) {
            mapRef.current!.fitBounds(boundingBox(features[i].geometry), { animate: true, padding: defaultMapPadding })
        }
    }

    const zoomToAll = (): void => {
        mapRef.current?.fitBounds(extendBoxes(features.filter(notWaiting).map(f => boundingBox(f.geometry))), { animate: true, padding: defaultMapPadding })
    }

    return (
        <div style={
            { zIndex: 1000, position: 'absolute', right: 0, top: 0, padding: '12px' }
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
