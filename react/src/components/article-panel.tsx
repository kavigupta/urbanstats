import '../common.css'
import './article.css'

import React, { CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useIsStaged, useSetting, useSettings } from '../page_template/settings'
import { filterCategoriesBySearch, groupYearKeys, StatGroupSettings, useAvailableCategories, useAvailableGroups, useCategoryTreeState } from '../page_template/statistic-settings'
import { allGroups, Category, statParents } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import { Universe, universeContext, useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { HumanReadableName, reifyReact } from '../utils/human-readable-name'
import { sanitize } from '../utils/paths'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { ArticleMap } from './ArticleMap'
import { ArticleWarnings } from './ArticleWarnings'
import { ExpandButton } from './ExpandButton'
import { ExternalLinks } from './ExternalLiinks'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { StagingControls } from './StagingControls'
import { congressionalDataForRow } from './congressional-table/model'
import { generateCSVDataForArticles, CSVExportData } from './csv-export'
import { ArticleRow } from './load-article'
import { pullRelevantPlotProps } from './plots'
import { Related } from './related-button'
import { createScreenshot, ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { CheckboxSettingJustBox, useHighlightStyle } from './sidebar'
import { CellSpec, PlotSpec, RowExtras, TableContents } from './supertable'
import { ColumnIdentifier, CommonLayoutInformation, ExpansionButton, MainHeaderRow, maxLayoutInformation, StatisticNameDisclaimer, StatisticRowCells, TableHeaderContainer, TableRowContainer } from './table'
import { EditModeContext, useEditMode } from './table-edit-context'

export function ArticlePanel({ article, rows, universe }: { article: Article, rows: (settings: StatGroupSettings) => ArticleRow[][], universe: Universe }): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<HTMLDivElement>(null)

    const screencapElements = (): ScreencapElements => ({
        path: `${sanitize(article.longname)}.png`,
        overallWidth: tableRef.current!.offsetWidth * 2,
        elementsToRender: [headersRef.current!, tableRef.current!, mapRef.current!],
    })

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonHeadStyle = useComparisonHeadStyle('right')

    const settings = useSettings(groupYearKeys())
    const filteredRows = rows(settings)[0]

    // Edit mode is ephemeral (not a setting), but it opens automatically when the
    // page enters staging mode (e.g. from a settings link) so the pending changes
    // are visible and reviewable on the table. The initial state covers a fresh
    // load into staging; the effect covers navigating into staging on an already
    // mounted panel. Neither forces edit mode closed when staging ends.
    const staged = useIsStaged()
    const [editMode, setEditMode] = useState(staged)
    const wasStaged = useRef(staged)
    useEffect(() => {
        if (staged && !wasStaged.current) {
            setEditMode(true)
        }
        wasStaged.current = staged
    }, [staged])
    const [filter, setFilter] = useState('')
    const editModeState = useMemo(() => ({ editMode, setEditMode, filter, setFilter }), [editMode, filter])

    const csvExportCallback = useCallback<CSVExportData>(() => {
        const data = generateCSVDataForArticles([article], [filteredRows], true)
        const filename = `${sanitize(article.longname)}.csv`
        return { csvData: data, csvFilename: filename }
    }, [article, filteredRows])

    const navigator = useContext(Navigator.Context)

    return (
        <EditModeContext.Provider value={editModeState}>
            <universeContext.Provider value={{
                universes: article.universes as readonly Universe[],
                universe,
                setUniverse(newUniverse) {
                    void navigator.navigate({
                        kind: 'article',
                        longname: article.longname,
                        universe: newUniverse,
                    }, { history: 'push', scroll: { kind: 'none' } })
                },

            }}
            >
                <QuerySettingsConnection />
                <PageTemplate
                    screencap={(...args) => createScreenshot(screencapElements(), ...args)}
                    csvExportCallback={csvExportCallback}
                >
                    <div>
                        <div ref={headersRef}>
                            <div className={headerTextClass}>{article.shortname}</div>
                            <div className={subHeaderTextClass}>{article.longname}</div>
                        </div>
                        <div style={{ marginBlockEnd: '16px' }}></div>

                        <div ref={tableRef}>
                            {editMode
                                ? <ArticleEditTable rows={rows} article={article} filter={filter} />
                                : <ArticleTable filteredRows={filteredRows} article={article} />}
                        </div>

                        <p></p>

                        <div ref={mapRef}>
                            <ArticleMap
                                longname={article.longname}
                                related={article.related as NormalizeProto<IRelatedButtons>[]}
                                articleType={article.articleType}
                            />
                        </div>

                        <div style={{ marginBlockEnd: '1em' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: '0 0 auto', marginRight: '1em' }}>
                                <ExternalLinks metadataProtos={article.metadata} />
                            </div>
                            <div style={{ flex: '0 0 auto', marginRight: '1em' }}>
                                <div className="serif" style={comparisonHeadStyle}>Compare to: </div>
                            </div>
                            <div style={{ flex: '1 1 auto' }}>
                                <ComparisonSearchBox longname={article.longname} type={article.articleType} />
                            </div>
                        </div>

                        <Related
                            related={article.related as NormalizeProto<IRelatedButtons>[]}
                            articleType={article.articleType}
                        />
                    </div>
                </PageTemplate>
            </universeContext.Provider>
        </EditModeContext.Provider>
    )
}

const allColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']

type NameSpec = Extract<CellSpec, { type: 'statistic-name' }>

interface GroupAggregate {
    size: number
    sourceNames: Set<string>
}

/** Tallies each group once, so naming stays linear in the number of specs. */
function aggregateByGroup(nameSpecs: NameSpec[]): Map<string | undefined, GroupAggregate> {
    const aggregates = new Map<string | undefined, GroupAggregate>()
    for (const spec of nameSpecs) {
        if (spec.row === undefined) {
            continue
        }
        const statParent = statParents.get(spec.row.statpath)
        let aggregate = aggregates.get(statParent?.group.id)
        if (aggregate === undefined) {
            aggregate = { size: 0, sourceNames: new Set() }
            aggregates.set(statParent?.group.id, aggregate)
        }
        aggregate.size++
        if (statParent?.source !== null && statParent?.source !== undefined) {
            aggregate.sourceNames.add(statParent.source.name)
        }
    }
    return aggregates
}

function getGroupAndDisplayNames(nameSpec: NameSpec, aggregates: Map<string | undefined, GroupAggregate>): [string | undefined, HumanReadableName] {
    if (nameSpec.row === undefined) {
        return [undefined, nameSpec.renderedStatname]
    }
    const statParent = statParents.get(nameSpec.row.statpath)
    const aggregate = aggregates.get(statParent?.group.id)!
    const groupSize = aggregate.size
    const groupHasMultipleSources = aggregate.sourceNames.size > 1

    const sourceName = statParent?.source?.name
    let displayName = groupSize > 1 ? (statParent?.indentedName ?? nameSpec.renderedStatname) : nameSpec.renderedStatname
    if (groupHasMultipleSources && sourceName) {
        displayName = `${displayName} [${sourceName}]`
    }
    const groupName = groupSize > 1 ? statParent?.group.name : undefined
    return [groupName, displayName]
}

export function computeNameSpecsWithGroups(nameSpecs: NameSpec[]): { updatedNameSpecs: NameSpec[], groupNames: (string | undefined)[] } {
    const updatedNameSpecs: NameSpec[] = []
    const groupNames: (string | undefined)[] = []
    const aggregates = aggregateByGroup(nameSpecs)

    for (const spec of nameSpecs) {
        const [groupName, displayName] = getGroupAndDisplayNames(spec, aggregates)

        updatedNameSpecs.push({
            ...spec,
            isIndented: groupName !== undefined,
            displayName,
        })
        groupNames.push(groupName)
    }

    return { updatedNameSpecs, groupNames }
}

/** The name cell spec for each row, before `computeNameSpecsWithGroups` fills in display names. */
function nameSpecsForRows(rows: ArticleRow[], longname: string, currentUniverse: Universe): NameSpec[] {
    return rows.map(row => ({
        type: 'statistic-name',
        longname,
        row,
        renderedStatname: row.renderedStatname,
        currentUniverse,
    }))
}

/** A plot for each row whose extras are currently expanded, and undefined for the rest. */
function useExpandedPlotSpecs(rows: ArticleRow[], article: Article): (PlotSpec | undefined)[] {
    const colors = useColors()
    const expandedSettings = useSettings(rows.map(row => rowExpandedKey(row.statpath)))
    return rows.map((row, index) => {
        if (row.extraStats.length === 0 || !(expandedSettings[rowExpandedKey(row.statpath)] ?? false)) {
            return undefined
        }
        return {
            statDescription: row.renderedStatname,
            plotProps: pullRelevantPlotProps(rows, index, colors.hueColors.blue, article.shortname, article.longname, article.articleType),
        }
    })
}

function ArticleTable(props: {
    filteredRows: ArticleRow[]
    article: Article
}): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const { widthLeftHeader, columnWidth } = useWidths()

    const { updatedNameSpecs: leftHeaderSpecs, groupNames } = computeNameSpecsWithGroups(
        nameSpecsForRows(props.filteredRows, props.article.longname, currentUniverse),
    )

    const plotSpecs = useExpandedPlotSpecs(props.filteredRows, props.article)

    const onlyColumns = allColumns
    const cellSpecs: CellSpec[][] = props.filteredRows.map(row => [({
        type: 'statistic-row',
        longname: props.article.longname,
        row,
        onNavigate: (newArticle) => {
            void navContext.navigate({
                kind: 'article',
                longname: newArticle,
                universe: currentUniverse,
            }, { history: 'push', scroll: { kind: 'none' } })
        },
        simpleOrdinals,
        onlyColumns,
    })])

    const topLeftSpec = { type: 'top-left-header' } satisfies CellSpec

    return (
        <div className="stats_table">
            <TableContents
                leftHeaderSpec={{ leftHeaderSpecs, groupNames }}
                rowSpecs={cellSpecs}
                horizontalPlotSpecs={plotSpecs}
                verticalPlotSpecs={[]}
                topLeftSpec={topLeftSpec}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                onlyColumns={onlyColumns}
                simpleOrdinals={simpleOrdinals}
            />
            <ArticleWarnings />
        </div>
    )
}

// Wrapping the name in a label lets a click anywhere on it toggle the associated
// checkbox. Child rows of a multi-stat group have no checkbox of their own, so
// they point at the group's checkbox by id.
const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

// `height: auto` opts out of the sidebar checkbox's font-size-derived height, so the
// box keeps its intrinsic (square) size against the table's row text.
const editCheckboxStyle: CSSProperties = { cursor: 'pointer', flex: '0 0 auto', height: 'auto' }

/** Percent of the table the name column takes in mobile edit mode, where it has fewer columns to compete with. */
const mobileEditWidthLeftHeader = 58

/** Layout shared by every row of the edit table. */
interface EditTableLayout {
    article: Article
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
    columnWidthsInfo: CommonLayoutInformation
}

function EditStatRow(props: {
    layout: EditTableLayout
    index: number
    highlight: boolean
    enabled: boolean
    checkbox?: ReactNode
    checkboxId: string
    displayName: HumanReadableName
    indent: number
    row: ArticleRow
    plotSpec?: PlotSpec
}): ReactNode {
    const screenshotMode = useScreenshotMode()
    const { article, widthLeftHeader, columnWidth } = props.layout
    const hasExtras = props.row.extraStats.length > 0 && !screenshotMode
    // Only render the (large) representatives table for enabled stats, matching the normal table.
    const congressionalRegion = props.enabled ? congressionalDataForRow(props.row, article.longname) : undefined
    return (
        <>
            <TableRowContainer index={props.index} isHighlighted={false}>
                <div style={{ width: `${widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: `${props.indent * 0.75}em` }}>
                    <label
                        htmlFor={props.checkbox === undefined ? props.checkboxId : undefined}
                        style={{ ...editLabelStyle, ...useHighlightStyle(props.highlight) }}
                    >
                        {props.checkbox}
                        <span className="serif value">{reifyReact(props.displayName)}</span>
                    </label>
                    {hasExtras && <ExpansionButton row={props.row} />}
                    {props.row.disclaimer !== undefined && <StatisticNameDisclaimer disclaimer={props.row.disclaimer} />}
                </div>
                <StatisticRowCells
                    width={columnWidth}
                    longname={article.longname}
                    row={props.row}
                    onlyColumns={props.layout.onlyColumns}
                    simpleOrdinals={props.layout.simpleOrdinals}
                    columnWidthsInfo={props.layout.columnWidthsInfo}
                    extraSpaceRight={0}
                />
            </TableRowContainer>
            <RowExtras
                plotSpec={props.plotSpec}
                congressionalRegions={congressionalRegion === undefined ? [] : [congressionalRegion]}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                extraSpaceRight={[0]}
            />
        </>
    )
}

function EditGroupHeaderRow(props: { index: number, highlight: boolean, checkbox: ReactNode, name: string }): ReactNode {
    return (
        <TableRowContainer index={props.index} isHighlighted={false}>
            <label style={{ ...editLabelStyle, ...useHighlightStyle(props.highlight), width: '100%', paddingLeft: '0.75em' }}>
                {props.checkbox}
                <span className="serif value">{props.name}</span>
            </label>
        </TableRowContainer>
    )
}

// Animates open/closed like the sidebar's category sections. The body is always
// mounted so the height transition has content to reveal; `inert` keeps the
// collapsed (clipped) content out of the tab order and off screen readers.
function AnimatedCollapse({ expanded, children }: { expanded: boolean, children: ReactNode }): ReactNode {
    return (
        <div style={{ display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
            <div
                // @ts-expect-error -- inert is not in the type definitions yet
                inert={expanded ? undefined : ''}
                style={{ overflow: 'hidden', minHeight: 0 }}
            >
                {children}
            </div>
        </div>
    )
}

function EditCategory(props: {
    layout: EditTableLayout
    category: Category
    rowsByGroup: Map<string, ArticleRow[]>
    displayNames: Map<ArticleRow, HumanReadableName>
    plotSpecs: Map<ArticleRow, PlotSpec | undefined>
    hasSearchMatch: boolean
}): ReactNode {
    const tree = useCategoryTreeState(props.category)
    const highlightStyle = useHighlightStyle(tree.highlight)
    const expanded = props.hasSearchMatch || tree.expanded

    let index = 0
    const bodyRows: ReactNode[] = []
    for (const { group, enabled, setEnabled, highlight } of tree.groups) {
        const groupRows = props.rowsByGroup.get(group.id) ?? []
        if (groupRows.length === 0) {
            continue
        }
        const checkboxId = `edit-checkbox-${group.id}`
        const checkbox = (
            <CheckboxSettingJustBox
                id={checkboxId}
                checked={enabled}
                onChange={setEnabled}
                testId={`edit_group_${group.id}`}
                highlight={highlight}
                style={editCheckboxStyle}
            />
        )
        if (groupRows.length === 1) {
            bodyRows.push(
                <EditStatRow
                    key={`group-${group.id}`}
                    layout={props.layout}
                    index={index++}
                    highlight={highlight}
                    enabled={enabled}
                    checkbox={checkbox}
                    checkboxId={checkboxId}
                    displayName={props.displayNames.get(groupRows[0])!}
                    indent={1}
                    row={groupRows[0]}
                    plotSpec={props.plotSpecs.get(groupRows[0])}
                />,
            )
        }
        else {
            bodyRows.push(
                <EditGroupHeaderRow key={`group-${group.id}`} index={index++} highlight={highlight} checkbox={checkbox} name={group.name} />,
            )
            for (const row of groupRows) {
                bodyRows.push(
                    <EditStatRow
                        key={`stat-${row.statpath}`}
                        layout={props.layout}
                        index={index++}
                        highlight={highlight}
                        enabled={enabled}
                        checkboxId={checkboxId}
                        displayName={props.displayNames.get(row)!}
                        indent={2}
                        row={row}
                        plotSpec={props.plotSpecs.get(row)}
                    />,
                )
            }
        }
    }

    return (
        <>
            <TableRowContainer index={0} isHighlighted={false}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25em', padding: '1px', width: '100%' }}>
                    {!props.hasSearchMatch && (
                        <ExpandButton
                            pointing="right"
                            isExpanded={expanded}
                            onClick={() => { tree.setExpanded(!tree.expanded) }}
                            style={{ backgroundSize: '16px', width: '20px', height: '20px', flex: '0 0 auto' }}
                            aria-label={expanded ? `Collapse ${props.category.name} category` : `Expand ${props.category.name} category`}
                        />
                    )}
                    <label style={{ ...editLabelStyle, ...highlightStyle, gap: '0.25em' }}>
                        <CheckboxSettingJustBox
                            checked={tree.status === true}
                            indeterminate={tree.status === 'indeterminate'}
                            onChange={tree.toggle}
                            testId={`edit_category_${props.category.id}`}
                            highlight={tree.highlight}
                            style={editCheckboxStyle}
                        />
                        <span className="serif value" style={{ fontWeight: 500 }}>{props.category.name}</span>
                    </label>
                </div>
            </TableRowContainer>
            <AnimatedCollapse expanded={expanded}>
                {bodyRows}
            </AnimatedCollapse>
        </>
    )
}

/**
 * Every available row, regardless of which stat groups are currently enabled, so the
 * edit tree can show the whole category/group tree. Only computed while edit mode is
 * open, since building it means re-running the filter and sort over every statistic.
 */
function useAllRows(rows: (settings: StatGroupSettings) => ArticleRow[][]): ArticleRow[] {
    const settings = useSettings(groupYearKeys())
    return useMemo(() => {
        const allGroupsEnabled = { ...settings }
        for (const group of allGroups) {
            allGroupsEnabled[`show_stat_group_${group.id}`] = true
        }
        return rows(allGroupsEnabled)[0]
    }, [rows, settings])
}

function ArticleEditTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
    filter: string
}): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const allRows = useAllRows(props.rows)
    const categories = filterCategoriesBySearch(props.filter, useAvailableCategories(), useAvailableGroups())
    const isMobile = useMobileLayout()
    const editModeContext = useEditMode()
    const staged = useIsStaged()
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const { widthLeftHeader: defaultWidthLeftHeader, columnWidth: defaultColumnWidth } = useWidths()

    // Keep the expandable per-stat plots ("extras") available in edit mode, driven
    // by the same rowExpandedKey setting the normal table uses.
    const plotSpecList = useExpandedPlotSpecs(allRows, props.article)
    const plotSpecs = new Map(allRows.map((row, index) => [row, plotSpecList[index]]))

    // On mobile, edit mode drops the percentile/ordinal/pointer columns so the
    // checkboxes and names have room; only the value stays. The name column also
    // gets a wider share since it no longer competes with those columns.
    const onlyColumns: ColumnIdentifier[] = isMobile ? ['statval', 'statval_unit'] : allColumns
    const widthLeftHeader = isMobile ? mobileEditWidthLeftHeader : defaultWidthLeftHeader
    const columnWidth = isMobile ? 100 - mobileEditWidthLeftHeader : defaultColumnWidth

    const rowsByGroup = useMemo(() => {
        const result = new Map<string, ArticleRow[]>()
        for (const row of allRows) {
            const parent = statParents.get(row.statpath)
            if (parent === undefined) {
                continue
            }
            const existing = result.get(parent.group.id) ?? []
            existing.push(row)
            result.set(parent.group.id, existing)
        }
        return result
    }, [allRows])

    const displayNames = useMemo(() => {
        const { updatedNameSpecs } = computeNameSpecsWithGroups(nameSpecsForRows(allRows, props.article.longname, currentUniverse))
        const result = new Map<ArticleRow, HumanReadableName>()
        allRows.forEach((row, i) => {
            result.set(row, updatedNameSpecs[i].displayName ?? updatedNameSpecs[i].renderedStatname)
        })
        return result
    }, [allRows, props.article.longname, currentUniverse])

    const columnWidthsInfo = useMemo(
        () => maxLayoutInformation(allRows, currentUniverse, simpleOrdinals),
        [allRows, currentUniverse, simpleOrdinals],
    )

    const layout: EditTableLayout = { article: props.article, widthLeftHeader, columnWidth, onlyColumns, simpleOrdinals, columnWidthsInfo }
    const topLeftSpec = { type: 'top-left-header' } satisfies CellSpec

    return (
        <div className="stats_table">
            {staged && <StagingControls horizontal onAction={() => { editModeContext?.setEditMode(false) }} />}
            <div style={{ position: 'relative' }}>
                <TableHeaderContainer>
                    <MainHeaderRow
                        columnWidth={columnWidth}
                        topLeftSpec={topLeftSpec}
                        topLeftWidth={widthLeftHeader}
                        onlyColumns={onlyColumns}
                        extraSpaceRight={[0]}
                        simpleOrdinals={simpleOrdinals}
                        columnWidthsInfo={[columnWidthsInfo]}
                    />
                </TableHeaderContainer>
                {categories.map(category => (
                    <EditCategory
                        key={category.id}
                        layout={layout}
                        category={category}
                        rowsByGroup={rowsByGroup}
                        displayNames={displayNames}
                        plotSpecs={plotSpecs}
                        hasSearchMatch={props.filter !== ''}
                    />
                ))}
            </div>
            <ArticleWarnings />
        </div>
    )
}

function ComparisonSearchBox({ longname, type }: { longname: string, type: string }): ReactNode {
    const currentUniverse = useUniverse()
    const navContext = useContext(Navigator.Context)
    return (
        <SearchBox
            style={{ ...useComparisonHeadStyle(), width: '100%' }}
            placeholder="Other region..."
            articleLink={x => navContext.link({
                kind: 'comparison',
                universe: currentUniverse,
                longnames: [longname, x],
            }, { scroll: { kind: 'position', top: 0 } })}
            autoFocus={false}
            prioritizeArticleType={type}
        />
    )
}

function useWidths(): { widthLeftHeader: number, columnWidth: number } {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const isMobile = useMobileLayout()
    const screenshotMode = useScreenshotMode()

    // TODO clean this up and reduce the amount of magic numbers
    const nonPointerColumns = 15 + 10 + (simpleOrdinals ? 7 + 8 : 17 + 25)
    const pointerColumns = 8 * (screenshotMode ? 0 : (!simpleOrdinals && isMobile ? 1 : 2))
    const numerator = 31
    const denominator = nonPointerColumns + pointerColumns + numerator
    const widthLeftHeader = 100 * (numerator / denominator)
    const columnWidth = 100 - widthLeftHeader
    return { widthLeftHeader, columnWidth }
}
