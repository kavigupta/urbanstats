import React, { CSSProperties, ReactNode, useMemo } from 'react'

import { useIsStaged, useSettings } from '../page_template/settings'
import { filterCategoriesBySearch, StatGroupSettings, useAvailableCategories, useAvailableGroups, useCategoryTreeState, yearSourceKeys } from '../page_template/statistic-settings'
import { allGroups, Category, statParents } from '../page_template/statistic-tree'
import { assert } from '../utils/defensive'
import { HumanReadableName, reifyReact } from '../utils/human-readable-name'
import { Article } from '../utils/protos'

import { ArticleWarnings } from './ArticleWarnings'
import { ExpandButton } from './ExpandButton'
import { StagingControls } from './StagingControls'
import { useArticleTableLayout, useExpandedPlotSpecs } from './article-table'
import { congressionalDataForRow } from './congressional-table/model'
import { ArticleRow } from './load-article'
import { CheckboxSettingJustBox, useHighlightStyle } from './sidebar'
import { displayNamesForRows } from './statistic-name-specs'
import { CellSpec, PlotSpec, RowExtras } from './supertable'
import { ColumnIdentifier, CommonLayoutInformation, MainHeaderRow, maxLayoutInformation, StatisticRowCells, TableHeaderContainer, TableRowContainer, useStatisticNameAdornments } from './table'
import { useEditMode } from './table-edit-context'

// Wrapping the name in a label lets a click anywhere on it toggle the associated
// checkbox. Child rows of a multi-stat group have no checkbox of their own, so
// they point at the group's checkbox by id.
const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

// `height: auto` opts out of the sidebar checkbox's font-size-derived height, so the
// box keeps its intrinsic (square) size against the table's row text.
const editCheckboxStyle: CSSProperties = { cursor: 'pointer', flex: '0 0 auto', height: 'auto' }

/** Layout shared by every row of the edit table. */
interface EditTableLayout {
    longname: string
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
    columnWidthsInfo: CommonLayoutInformation
}

/** A row of the edit tree, paired with the name it renders under. */
interface EditRow {
    row: ArticleRow
    displayName: HumanReadableName
}

function EditCheckboxLabel(props: {
    highlight: boolean
    /** Set only when the checkbox lives on another row, so this label points at it instead of containing it. */
    htmlFor?: string
    checkbox?: ReactNode
    style?: CSSProperties
    nameStyle?: CSSProperties
    children: ReactNode
}): ReactNode {
    return (
        <label htmlFor={props.htmlFor} style={{ ...editLabelStyle, ...useHighlightStyle(props.highlight), ...props.style }}>
            {props.checkbox}
            <span className="serif value" style={props.nameStyle}>{props.children}</span>
        </label>
    )
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
    const { longname, widthLeftHeader, columnWidth } = props.layout
    const adornments = useStatisticNameAdornments(props.row)
    // Only render the (large) representatives table for enabled stats, matching the normal table.
    const congressionalRegion = props.enabled ? congressionalDataForRow(props.row, longname) : undefined
    return (
        <>
            <TableRowContainer index={props.index} isHighlighted={false}>
                <div style={{ width: `${widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: `${props.indent * 0.75}em` }}>
                    <EditCheckboxLabel
                        highlight={props.highlight}
                        htmlFor={props.checkbox === undefined ? props.checkboxId : undefined}
                        checkbox={props.checkbox}
                    >
                        {reifyReact(props.displayName)}
                    </EditCheckboxLabel>
                    {adornments}
                </div>
                <StatisticRowCells
                    width={columnWidth}
                    longname={longname}
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
            <EditCheckboxLabel highlight={props.highlight} checkbox={props.checkbox} style={{ width: '100%', paddingLeft: '0.75em' }}>
                {props.name}
            </EditCheckboxLabel>
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
    rowsByGroup: Map<string, EditRow[]>
    plotSpecs: Map<ArticleRow, PlotSpec | undefined>
    hasSearchMatch: boolean
}): ReactNode {
    const tree = useCategoryTreeState(props.category)
    const expanded = props.hasSearchMatch || tree.expanded

    // The category header is row 0, so the body starts at 1 and the striping stays alternating.
    let index = 1
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
                    displayName={groupRows[0].displayName}
                    indent={1}
                    row={groupRows[0].row}
                    plotSpec={props.plotSpecs.get(groupRows[0].row)}
                />,
            )
        }
        else {
            bodyRows.push(
                <EditGroupHeaderRow key={`group-${group.id}`} index={index++} highlight={highlight} checkbox={checkbox} name={group.name} />,
            )
            for (const { row, displayName } of groupRows) {
                bodyRows.push(
                    <EditStatRow
                        key={`stat-${row.statpath}`}
                        layout={props.layout}
                        index={index++}
                        highlight={highlight}
                        enabled={enabled}
                        checkboxId={checkboxId}
                        displayName={displayName}
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
                            data-category-id={props.category.id}
                            onClick={() => { tree.setExpanded(!tree.expanded) }}
                            style={{ backgroundSize: '16px', width: '20px', height: '20px', flex: '0 0 auto' }}
                            aria-label={expanded ? `Collapse ${props.category.name} category` : `Expand ${props.category.name} category`}
                        />
                    )}
                    <EditCheckboxLabel
                        highlight={tree.highlight}
                        style={{ gap: '0.25em' }}
                        nameStyle={{ fontWeight: 500 }}
                        checkbox={(
                            <CheckboxSettingJustBox
                                checked={tree.status === true}
                                indeterminate={tree.status === 'indeterminate'}
                                onChange={tree.toggle}
                                testId={`edit_category_${props.category.id}`}
                                highlight={tree.highlight}
                                style={editCheckboxStyle}
                            />
                        )}
                    >
                        {props.category.name}
                    </EditCheckboxLabel>
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
 *
 * Deliberately not subscribed to the group settings: they're all forced on here, so a
 * checkbox toggle can't change the result, and subscribing would redo that work on
 * every click.
 */
function useAllRows(rows: (settings: StatGroupSettings) => ArticleRow[][]): ArticleRow[] {
    const yearSourceSettings = useSettings(yearSourceKeys())
    return useMemo(() => {
        const allGroupsEnabled = { ...yearSourceSettings } as StatGroupSettings
        for (const group of allGroups) {
            allGroupsEnabled[`show_stat_group_${group.id}`] = true
        }
        return rows(allGroupsEnabled)[0]
    }, [rows, yearSourceSettings])
}

export function ArticleEditTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
}): ReactNode {
    const editModeContext = useEditMode()
    assert(editModeContext !== undefined, 'edit table rendered outside an edit mode context')
    const { filter } = editModeContext
    const { currentUniverse, simpleOrdinals, widthLeftHeader, columnWidth, onlyColumns } = useArticleTableLayout(true)
    const allRows = useAllRows(props.rows)
    const categories = filterCategoriesBySearch(filter, useAvailableCategories(), useAvailableGroups())
    const staged = useIsStaged()

    // Keep the expandable per-stat plots ("extras") available in edit mode, driven
    // by the same rowExpandedKey setting the normal table uses. Kept out of rowsByGroup
    // because it's the only part of a row that changes when the user expands one.
    const plotSpecList = useExpandedPlotSpecs(allRows, props.article)
    const plotSpecs = new Map(allRows.map((row, index) => [row, plotSpecList[index]]))

    const rowsByGroup = useMemo(() => {
        const displayNames = displayNamesForRows(allRows, props.article.longname, currentUniverse)
        const result = new Map<string, EditRow[]>()
        for (const row of allRows) {
            const parent = statParents.get(row.statpath)
            if (parent === undefined) {
                continue
            }
            const existing = result.get(parent.group.id) ?? []
            existing.push({ row, displayName: displayNames.get(row)! })
            result.set(parent.group.id, existing)
        }
        return result
    }, [allRows, props.article.longname, currentUniverse])

    const columnWidthsInfo = useMemo(
        () => maxLayoutInformation(allRows, currentUniverse, simpleOrdinals),
        [allRows, currentUniverse, simpleOrdinals],
    )

    const layout: EditTableLayout = { longname: props.article.longname, widthLeftHeader, columnWidth, onlyColumns, simpleOrdinals, columnWidthsInfo }
    const topLeftSpec = {
        type: 'top-left-header',
        editMode: {
            open: true,
            filter,
            setFilter: editModeContext.setFilter,
            // In staging mode the Discard/Apply buttons below double as Done.
            onDone: staged ? undefined : () => { editModeContext.setEditMode(false) },
        },
    } satisfies CellSpec

    return (
        <div className="stats_table">
            {staged && <StagingControls horizontal onAction={() => { editModeContext.setEditMode(false) }} />}
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
                        plotSpecs={plotSpecs}
                        hasSearchMatch={filter !== ''}
                    />
                ))}
            </div>
            <ArticleWarnings />
        </div>
    )
}
