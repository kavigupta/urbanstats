import '../common.css'
import './article.css'

import React, { CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, Settings, useSetting, useSettings, useSettingsInfo, useStagedSettingKeys } from '../page_template/settings'
import { changeStatGroupSetting, groupKeys, groupYearKeys, StatGroupSettings, useAvailableCategories, useAvailableGroups, useCategoryStatus, useChangeCategorySetting } from '../page_template/statistic-settings'
import { allGroups, Category, Group, statParents } from '../page_template/statistic-tree'
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
import { generateCSVDataForArticles, CSVExportData } from './csv-export'
import { ArticleRow } from './load-article'
import { pullRelevantPlotProps } from './plots'
import { Related } from './related-button'
import { createScreenshot, ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { CellSpec, PlotSpec, TableContents } from './supertable'
import { ColumnIdentifier, CommonLayoutInformation, computeSizesForRow, MainHeaderRow, StatisticRowCells, TableHeaderContainer } from './table'
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

    // Every available row, regardless of which stat groups are currently enabled.
    // Used by edit mode to show the full category/group tree on the table.
    const allRows = useMemo(() => {
        const allGroupsEnabled = { ...settings }
        for (const group of allGroups) {
            allGroupsEnabled[`show_stat_group_${group.id}`] = true
        }
        return rows(allGroupsEnabled)[0]
    }, [rows, settings])

    // Edit mode is ephemeral (not a setting), but it opens automatically when the
    // page enters staging mode (e.g. from a settings link) so the pending changes
    // are visible and reviewable on the table. The initial state covers a fresh
    // load into staging; the effect covers navigating into staging on an already
    // mounted panel. Neither forces edit mode closed when staging ends.
    const staged = useStagedSettingKeys() !== undefined
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
                            <ArticleTable
                                filteredRows={filteredRows}
                                allRows={allRows}
                                article={article}
                            />
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

type NameSpec = Extract<CellSpec, { type: 'statistic-name' }>

function getGroupAndDisplayNames(nameSpec: NameSpec, nameSpecs: NameSpec[]): [string | undefined, HumanReadableName] {
    if (nameSpec.row === undefined) {
        return [undefined, nameSpec.renderedStatname]
    }
    const statParent = statParents.get(nameSpec.row.statpath)

    const groupRows = nameSpecs.filter(s => s.row !== undefined && statParents.get(s.row.statpath)?.group.id === statParent?.group.id)
    const groupSize = groupRows.length

    const groupSourcesSet = new Set(
        groupRows
            .map(s => statParents.get(s.row!.statpath)?.source)
            .filter(source => source !== null)
            .map(source => source!.name),
    )
    const groupHasMultipleSources = groupSourcesSet.size > 1

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

    for (const spec of nameSpecs) {
        const [groupName, displayName] = getGroupAndDisplayNames(spec, nameSpecs)

        updatedNameSpecs.push({
            ...spec,
            isIndented: groupName !== undefined,
            displayName,
        })
        groupNames.push(groupName)
    }

    return { updatedNameSpecs, groupNames }
}

function ArticleTable(props: {
    filteredRows: ArticleRow[]
    allRows: ArticleRow[]
    article: Article
}): ReactNode {
    const editModeContext = useEditMode()
    const colors = useColors()
    const expandedSettings = useSettings(props.filteredRows.map(row => rowExpandedKey(row.statpath)))
    const expandedEach = props.filteredRows.map(row => row.extraStats.length > 0 && (expandedSettings[rowExpandedKey(row.statpath)] ?? false))
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const { widthLeftHeader, columnWidth } = useWidths()

    const statNameSpecs: Extract<CellSpec, { type: 'statistic-name' }>[] = props.filteredRows.map(row => ({
        type: 'statistic-name',
        longname: props.article.longname,
        row,
        renderedStatname: row.renderedStatname,
        currentUniverse,
    }))

    const { updatedNameSpecs: leftHeaderSpecs, groupNames } = computeNameSpecsWithGroups(statNameSpecs)

    const onlyColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']
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

    const plotSpecs: (PlotSpec | undefined)[] = expandedEach.map((expanded, index) => expanded
        ? {
                statDescription: props.filteredRows[index].renderedStatname,
                plotProps: pullRelevantPlotProps(
                    props.filteredRows,
                    index,
                    colors.hueColors.blue,
                    props.article.shortname,
                    props.article.longname,
                    props.article.articleType,
                ),
            }
        : undefined,
    )

    const topLeftSpec = { type: 'top-left-header' } satisfies CellSpec

    if (editModeContext?.editMode) {
        return (
            <ArticleEditTable
                allRows={props.allRows}
                article={props.article}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                onlyColumns={onlyColumns}
                simpleOrdinals={simpleOrdinals}
                filter={editModeContext.filter}
            />
        )
    }

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

const editRowStyle = (colors: Colors, index: number, greyed: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'last baseline',
    backgroundColor: index % 2 === 1 ? colors.slightlyDifferentBackground : undefined,
    opacity: greyed ? 0.45 : 1,
})

function searchMatch(searchTerm: string, target: string): boolean {
    return target.toLowerCase().includes(searchTerm.toLowerCase())
}

function EditCheckbox(props: { id?: string, checked: boolean, indeterminate?: boolean, onChange: (checked: boolean) => void, testId: string }): ReactNode {
    const colors = useColors()
    const ref = useRef<HTMLInputElement>(null)
    React.useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = props.indeterminate ?? false
        }
    }, [props.indeterminate])
    return (
        <input
            ref={ref}
            id={props.id}
            type="checkbox"
            checked={props.checked}
            onChange={(e) => { props.onChange(e.target.checked) }}
            data-test-id={props.testId}
            style={{ accentColor: colors.hueColors.blue, backgroundColor: colors.background, cursor: 'pointer', flex: '0 0 auto' }}
        />
    )
}

// Wrapping the name in a label lets a click anywhere on it toggle the associated
// checkbox. Child rows of a multi-stat group have no checkbox of their own, so
// they point at the group's checkbox by id.
const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

interface SharedEditRowProps {
    article: Article
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
    columnWidthsInfo: CommonLayoutInformation
}

function highlightStyle(colors: Colors, highlight: boolean): CSSProperties {
    return highlight ? { backgroundColor: colors.slightlyDifferentBackgroundFocused, borderRadius: '5px' } : {}
}

function EditStatRow(props: SharedEditRowProps & {
    index: number
    greyed: boolean
    highlight: boolean
    checkbox?: ReactNode
    checkboxId: string
    displayName: HumanReadableName
    indent: number
    row: ArticleRow
}): ReactNode {
    const colors = useColors()
    return (
        <div className="for-testing-table-row" style={editRowStyle(colors, props.index, props.greyed)}>
            <label
                htmlFor={props.checkbox === undefined ? props.checkboxId : undefined}
                style={{ ...editLabelStyle, ...highlightStyle(colors, props.highlight), width: `${props.widthLeftHeader}%`, paddingLeft: `${props.indent * 0.75}em` }}
            >
                {props.checkbox}
                <span className="serif value">{reifyReact(props.displayName)}</span>
            </label>
            <StatisticRowCells
                width={props.columnWidth}
                longname={props.article.longname}
                row={props.row}
                onlyColumns={props.onlyColumns}
                simpleOrdinals={props.simpleOrdinals}
                columnWidthsInfo={props.columnWidthsInfo}
                extraSpaceRight={0}
            />
        </div>
    )
}

function EditGroupHeaderRow(props: { index: number, greyed: boolean, highlight: boolean, checkbox: ReactNode, name: string }): ReactNode {
    const colors = useColors()
    return (
        <div className="for-testing-table-row" style={editRowStyle(colors, props.index, props.greyed)}>
            <label style={{ ...editLabelStyle, ...highlightStyle(colors, props.highlight), width: '100%', paddingLeft: '0.75em' }}>
                {props.checkbox}
                <span className="serif value">{props.name}</span>
            </label>
        </div>
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

function EditCategory(props: SharedEditRowProps & {
    category: Category
    rowsByGroup: Map<string, ArticleRow[]>
    displayNames: Map<ArticleRow, HumanReadableName>
    filter: string
}): ReactNode {
    const colors = useColors()
    const availableGroups = useAvailableGroups(props.category)
    const status = useCategoryStatus(props.category)
    const changeCategory = useChangeCategorySetting(props.category)
    const settings = useContext(Settings.Context)
    const groupEnabled = useSettings(groupKeys(availableGroups))
    const groupInfo = useSettingsInfo(groupKeys(availableGroups))
    const isStaged = (group: Group): boolean => {
        const info = groupInfo[`show_stat_group_${group.id}`]
        return 'stagedValue' in info && info.stagedValue !== info.persistedValue
    }
    const categoryHighlight = availableGroups.some(isStaged)

    // Undefined means "follow the checkbox": expanded when anything is checked.
    // A manual toggle overrides that, so a fully-checked category can still be collapsed.
    const [userExpanded, setUserExpanded] = useState<boolean | undefined>(undefined)

    const filterActive = props.filter !== ''
    const categoryMatches = searchMatch(props.filter, props.category.name)
    const visibleGroups = !filterActive || categoryMatches
        ? availableGroups
        : availableGroups.filter(group => searchMatch(props.filter, group.name))

    if (filterActive && !categoryMatches && visibleGroups.length === 0) {
        return null
    }

    const expanded = filterActive || (userExpanded ?? status !== false)

    let index = 0
    const bodyRows: ReactNode[] = []
    for (const group of visibleGroups) {
        const groupRows = props.rowsByGroup.get(group.id) ?? []
        if (groupRows.length === 0) {
            continue
        }
        const enabled = groupEnabled[`show_stat_group_${group.id}`]
        const highlight = isStaged(group)
        const shared: SharedEditRowProps = props
        const checkboxId = `edit-checkbox-${group.id}`
        const checkbox = (
            <EditCheckbox
                id={checkboxId}
                checked={enabled}
                onChange={(newValue) => { changeStatGroupSetting(settings, group, newValue) }}
                testId={`edit_group_${group.id}`}
            />
        )
        if (groupRows.length === 1) {
            bodyRows.push(
                <EditStatRow
                    key={group.id}
                    {...shared}
                    index={index++}
                    greyed={!enabled}
                    highlight={highlight}
                    checkbox={checkbox}
                    checkboxId={checkboxId}
                    displayName={props.displayNames.get(groupRows[0])!}
                    indent={1}
                    row={groupRows[0]}
                />,
            )
        }
        else {
            bodyRows.push(
                <EditGroupHeaderRow key={group.id} index={index++} greyed={!enabled} highlight={highlight} checkbox={checkbox} name={group.name} />,
            )
            for (const row of groupRows) {
                bodyRows.push(
                    <EditStatRow
                        key={row.statpath}
                        {...shared}
                        index={index++}
                        greyed={!enabled}
                        highlight={highlight}
                        checkboxId={checkboxId}
                        displayName={props.displayNames.get(row)!}
                        indent={2}
                        row={row}
                    />,
                )
            }
        }
    }

    return (
        <>
            <div className="for-testing-table-row" style={editRowStyle(colors, 0, false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25em', padding: '1px', width: '100%' }}>
                    {!filterActive && (
                        <ExpandButton
                            pointing="right"
                            isExpanded={expanded}
                            onClick={() => { setUserExpanded(!expanded) }}
                            style={{ backgroundSize: '16px', width: '20px', height: '20px', flex: '0 0 auto' }}
                            aria-label={expanded ? `Collapse ${props.category.name} category` : `Expand ${props.category.name} category`}
                        />
                    )}
                    <label style={{ ...editLabelStyle, ...highlightStyle(colors, categoryHighlight), gap: '0.25em' }}>
                        <EditCheckbox
                            checked={status === true}
                            indeterminate={status === 'indeterminate'}
                            onChange={changeCategory}
                            testId={`edit_category_${props.category.id}`}
                        />
                        <span className="serif value" style={{ fontWeight: 500 }}>{props.category.name}</span>
                    </label>
                </div>
            </div>
            <AnimatedCollapse expanded={expanded}>
                {bodyRows}
            </AnimatedCollapse>
        </>
    )
}

function ArticleEditTable(props: {
    allRows: ArticleRow[]
    article: Article
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
    filter: string
}): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const categories = useAvailableCategories()
    const isMobile = useMobileLayout()

    const staged = useStagedSettingKeys() !== undefined

    // On mobile, edit mode drops the percentile/ordinal/pointer columns so the
    // checkboxes and names have room; only the value stays. The name column also
    // gets a wider share since it no longer competes with those columns.
    const onlyColumns: ColumnIdentifier[] = isMobile
        ? props.onlyColumns.filter(column => column === 'statval' || column === 'statval_unit')
        : props.onlyColumns
    const widthLeftHeader = isMobile ? 58 : props.widthLeftHeader
    const columnWidth = isMobile ? 100 - widthLeftHeader : props.columnWidth

    const rowsByGroup = new Map<string, ArticleRow[]>()
    for (const row of props.allRows) {
        const parent = statParents.get(row.statpath)
        if (parent === undefined) {
            continue
        }
        const existing = rowsByGroup.get(parent.group.id) ?? []
        existing.push(row)
        rowsByGroup.set(parent.group.id, existing)
    }

    const statNameSpecs: NameSpec[] = props.allRows.map(row => ({
        type: 'statistic-name',
        longname: props.article.longname,
        row,
        renderedStatname: row.renderedStatname,
        currentUniverse,
    }))
    const { updatedNameSpecs } = computeNameSpecsWithGroups(statNameSpecs)
    const displayNames = new Map<ArticleRow, HumanReadableName>()
    props.allRows.forEach((row, i) => {
        displayNames.set(row, updatedNameSpecs[i].displayName ?? updatedNameSpecs[i].renderedStatname)
    })

    const columnWidthsInfo = props.allRows.reduce<CommonLayoutInformation>((acc, row) => {
        if (row.kind !== 'statistic') {
            return acc
        }
        const curr = computeSizesForRow(row, currentUniverse, props.simpleOrdinals)
        return {
            ordinalColumnWidthEm: Math.max(acc.ordinalColumnWidthEm, curr.ordinalColumnWidthEm),
            percentileColumnWidthEm: Math.max(acc.percentileColumnWidthEm, curr.percentileColumnWidthEm),
            ordinalColumnPadding: Math.max(acc.ordinalColumnPadding, curr.ordinalColumnPadding),
        }
    }, { ordinalColumnWidthEm: 0, percentileColumnWidthEm: 0, ordinalColumnPadding: 0 })

    const topLeftSpec = { type: 'top-left-header' } satisfies CellSpec

    return (
        <div className="stats_table">
            {staged && <StagingControls horizontal />}
            <div style={{ position: 'relative' }}>
                <TableHeaderContainer>
                    <MainHeaderRow
                        columnWidth={columnWidth}
                        topLeftSpec={topLeftSpec}
                        topLeftWidth={widthLeftHeader}
                        onlyColumns={onlyColumns}
                        extraSpaceRight={[0]}
                        simpleOrdinals={props.simpleOrdinals}
                        columnWidthsInfo={[columnWidthsInfo]}
                    />
                </TableHeaderContainer>
                {categories.map(category => (
                    <EditCategory
                        key={category.id}
                        category={category}
                        rowsByGroup={rowsByGroup}
                        displayNames={displayNames}
                        article={props.article}
                        widthLeftHeader={widthLeftHeader}
                        columnWidth={columnWidth}
                        onlyColumns={onlyColumns}
                        simpleOrdinals={props.simpleOrdinals}
                        columnWidthsInfo={columnWidthsInfo}
                        filter={props.filter}
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
