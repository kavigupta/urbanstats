import React, { CSSProperties, ReactNode, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName, sourceEnabledKey, useIsStaged, useSettings } from '../page_template/settings'
import { allStatGroupsEnabled, GroupTreeState, statGroupKeys, StatGroupSettings, useAvailableYears, useCategoriesMatchingSearch, useCategoryTreeState, useDataSourceCheckboxes, yearSourceKeys } from '../page_template/statistic-settings'
import { Category, statParents } from '../page_template/statistic-tree'
import { Universe } from '../universe'
import { HumanReadableName, reifyReact } from '../utils/human-readable-name'

import { ExpandButton } from './ExpandButton'
import { StagingControls } from './StagingControls'
import { ArticleRow } from './load-article'
import { BooleanSettingKey, CheckboxSettingCustomJustInputProps, CheckboxSettingJustBox, useBooleanSetting, useHighlightStyle } from './sidebar'
import { displayNamesForRows } from './statistic-name-specs'
import { CellSpec, congressionalRegionsForCells, EditModeOpenHeader, PlotSpec, RowCells, RowExtras, SuperHeaderSpec, TableFrame, TableLayout, TopLeftHeaderType } from './supertable'
import { CommonLayoutInformation, TableRowContainer, useStatisticNameAdornments } from './table'

// Wrapping the name in a label lets a click anywhere on it toggle the associated
// checkbox. Child rows of a multi-stat group have no checkbox of their own, so
// they point at the group's checkbox by id.
const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

// The label is a flex row, so the box has to opt out of being stretched by the row's text.
const editCheckboxStyle: CSSProperties = { cursor: 'pointer', flex: '0 0 auto' }

/** Every checkbox on an edit table, sized against the table's rows rather than the sidebar's. */
function EditCheckbox(props: Omit<CheckboxSettingCustomJustInputProps, 'style' | 'fontSize'>): ReactNode {
    return <CheckboxSettingJustBox {...props} style={editCheckboxStyle} />
}

/** The column shape every row of an edit table is laid out against. */
export interface EditTableLayout extends TableLayout {
    /** One entry per column, which is also what the column count is read from. */
    columnWidthsInfo: (CommonLayoutInformation | undefined)[]
}

/**
 * The space reserved to the right of each column, which also tells the header row how many
 * columns there are. `TableContents` reserves it for vertical plots, which only appear when
 * transposed, and an edit table never is, so every entry is zero.
 */
function extraSpaceRight(layout: EditTableLayout): number[] {
    return layout.columnWidthsInfo.map(() => 0)
}

/** Each level of the tree is indented by this much relative to the one above it. */
const indentEm = 0.75

/** A statistic as the edit tree renders it: the name it appears under, and the cells that follow. */
export interface EditRow {
    displayName: HumanReadableName
    /** Identifies the statistic, and supplies the name's adornments (plot expander, disclaimer marker). */
    row: ArticleRow
    cellSpecs: CellSpec[]
    plotSpec?: PlotSpec
}

/**
 * The rows of an edit tree, bucketed by the statistic tree group they belong to, dropping
 * any that aren't in the tree. Both callers supply one cell spec per column and, where the
 * statistic's extras are expanded, a plot.
 */
export function editRowsByGroup(
    rows: ArticleRow[],
    longname: string,
    currentUniverse: Universe,
    cells: (row: ArticleRow, index: number) => { cellSpecs: CellSpec[], plotSpec?: PlotSpec },
): Map<string, EditRow[]> {
    const displayNames = displayNamesForRows(rows, longname, currentUniverse)
    const result = new Map<string, EditRow[]>()
    rows.forEach((row, index) => {
        const parent = statParents.get(row.statpath)
        if (parent === undefined) {
            return
        }
        const existing = result.get(parent.group.id) ?? []
        existing.push({ displayName: displayNames[index], row, ...cells(row, index) })
        result.set(parent.group.id, existing)
    })
    return result
}

interface EditBodyRowBase {
    key: string
    highlight: boolean
    indent: number
    /** The group's checkbox, on the row that carries it. */
    checkbox?: ReactNode
    /** The id of the group's checkbox, on the rows that only point at it. */
    checkboxId?: string
}

interface EditGroupHeaderSpec extends EditBodyRowBase {
    kind: 'group-header'
    name: string
}

interface EditStatSpec extends EditBodyRowBase {
    kind: 'stat'
    enabled: boolean
    editRow: EditRow
}

/** The rows under a category header, in the order they're displayed. */
type EditBodyRow = EditGroupHeaderSpec | EditStatSpec

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

function EditStatRow({ layout, spaceRight, index, spec }: { layout: EditTableLayout, spaceRight: number[], index: number, spec: EditStatSpec }): ReactNode {
    const { widthLeftHeader, columnWidth, columnWidthsInfo } = layout
    const adornments = useStatisticNameAdornments(spec.editRow.row)
    // Only render the (large) representatives table for enabled stats, matching the normal table.
    const congressionalRegions = spec.enabled ? congressionalRegionsForCells(spec.editRow.cellSpecs) : []
    return (
        <>
            <TableRowContainer index={index}>
                <div style={{ width: `${widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: `${spec.indent * indentEm}em` }}>
                    <EditCheckboxLabel
                        highlight={spec.highlight}
                        htmlFor={spec.checkboxId}
                        checkbox={spec.checkbox}
                    >
                        {reifyReact(spec.editRow.displayName)}
                    </EditCheckboxLabel>
                    {adornments}
                </div>
                <RowCells
                    cellSpecs={spec.editRow.cellSpecs}
                    columnWidth={columnWidth}
                    extraSpaceRight={spaceRight}
                    columnWidthsInfo={columnWidthsInfo}
                />
            </TableRowContainer>
            <RowExtras
                plotSpec={spec.editRow.plotSpec}
                congressionalRegions={congressionalRegions}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                extraSpaceRight={spaceRight}
            />
        </>
    )
}

function EditGroupHeaderRow({ index, spec }: { index: number, spec: EditGroupHeaderSpec }): ReactNode {
    return (
        <TableRowContainer index={index}>
            <EditCheckboxLabel highlight={spec.highlight} checkbox={spec.checkbox} style={{ width: '100%', paddingLeft: `${spec.indent * indentEm}em` }}>
                {spec.name}
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

/**
 * A group with a single statistic collapses into that statistic's row, which then carries
 * the group's checkbox. Otherwise the group gets a header row with the checkbox, and its
 * statistics point at that checkbox rather than having one each.
 */
function categoryBodyRows(groups: GroupTreeState[], rowsByGroup: Map<string, EditRow[]>): EditBodyRow[] {
    return groups.flatMap(({ group, enabled, setEnabled, highlight }): EditBodyRow[] => {
        const groupRows = rowsByGroup.get(group.id) ?? []
        if (groupRows.length === 0) {
            return []
        }
        const checkboxId = `edit-checkbox-${group.id}`
        const checkbox = (
            <EditCheckbox
                id={checkboxId}
                checked={enabled}
                onChange={setEnabled}
                testId={`edit_group_${group.id}`}
                highlight={highlight}
            />
        )
        const statSpec = (editRow: EditRow, indent: number): EditStatSpec => ({
            kind: 'stat',
            key: `stat-${editRow.row.statpath}`,
            highlight,
            indent,
            enabled,
            editRow,
        })
        if (groupRows.length === 1) {
            return [{ ...statSpec(groupRows[0], 1), checkbox }]
        }
        return [
            { kind: 'group-header', key: `group-${group.id}`, highlight, indent: 1, checkbox, name: group.name },
            ...groupRows.map(editRow => ({ ...statSpec(editRow, 2), checkboxId })),
        ]
    })
}

function EditCategory(props: {
    layout: EditTableLayout
    spaceRight: number[]
    category: Category
    rowsByGroup: Map<string, EditRow[]>
    searching: boolean
}): ReactNode {
    const tree = useCategoryTreeState(props.category)
    const expanded = props.searching || tree.expanded
    const bodyRows = categoryBodyRows(tree.groups, props.rowsByGroup)

    return (
        <>
            <TableRowContainer index={0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25em', padding: '1px', width: '100%' }}>
                    {!props.searching && (
                        <ExpandButton
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
                            <EditCheckbox
                                checked={tree.status === true}
                                indeterminate={tree.status === 'indeterminate'}
                                onChange={tree.toggle}
                                testId={`edit_category_${props.category.id}`}
                                highlight={tree.highlight}
                            />
                        )}
                    >
                        {props.category.name}
                    </EditCheckboxLabel>
                </div>
            </TableRowContainer>
            <AnimatedCollapse expanded={expanded}>
                {/*
                  * Rows are striped by the position they end up at, not by which group they came
                  * from, so the alternation is unbroken. The category header is row 0.
                  */}
                {bodyRows.map((spec, position) => spec.kind === 'group-header'
                    ? <EditGroupHeaderRow key={spec.key} index={position + 1} spec={spec} />
                    : <EditStatRow key={spec.key} layout={props.layout} spaceRight={props.spaceRight} index={position + 1} spec={spec} />,
                )}
            </AnimatedCollapse>
        </>
    )
}

/** Titles the sections the edit table is divided into, mirroring the sidebar's section titles. */
function EditSectionHeader({ name }: { name: string }): ReactNode {
    const colors = useColors()
    return (
        <div
            className="serif"
            style={{
                marginTop: '0.5em',
                paddingBottom: '2px',
                borderBottom: `1px solid ${colors.borderNonShadow}`,
                color: colors.ordinalTextColor,
                fontWeight: 500,
            }}
        >
            {name}
        </div>
    )
}

/** A plain boolean setting as an edit table row, styled like the statistic rows' checkboxes. */
function EditSettingRow(props: {
    index: number
    name: string
    settingKey: BooleanSettingKey
    testId: string
    forcedOn?: boolean
}): ReactNode {
    const { checked, setChecked, highlight } = useBooleanSetting(props.settingKey, props.forcedOn)
    return (
        <TableRowContainer index={props.index}>
            <EditCheckboxLabel
                highlight={highlight}
                style={{ width: '100%', paddingLeft: `${indentEm}em` }}
                checkbox={(
                    <EditCheckbox
                        checked={checked}
                        forcedOn={props.forcedOn}
                        onChange={setChecked}
                        testId={props.testId}
                        highlight={highlight}
                    />
                )}
            >
                {props.name}
            </EditCheckboxLabel>
        </TableRowContainer>
    )
}

/**
 * The source and year selections, which the sidebar puts above its statistic tree. They
 * aren't part of the tree, so the search box doesn't filter them.
 */
function EditSourceAndYearSections(): ReactNode {
    const sourceCheckboxes = useDataSourceCheckboxes()
    const years = useAvailableYears()
    return (
        <>
            {sourceCheckboxes.map(({ category, checkboxSpecs }) => (
                <React.Fragment key={category}>
                    <EditSectionHeader name={checkboxCategoryName(category)} />
                    {checkboxSpecs.map(({ name, forcedOn }, index) => (
                        <EditSettingRow
                            key={name}
                            index={index}
                            name={name}
                            settingKey={sourceEnabledKey({ category, name })}
                            forcedOn={forcedOn}
                            testId={`edit_source ${category} ${name}`}
                        />
                    ))}
                </React.Fragment>
            ))}
            {years.length > 0 && (
                <>
                    <EditSectionHeader name="Years" />
                    {years.map((year, index) => (
                        <EditSettingRow
                            key={year}
                            index={index}
                            name={year.toString()}
                            settingKey={`show_stat_year_${year}`}
                            testId={`edit_year_${year}`}
                        />
                    ))}
                </>
            )}
        </>
    )
}

/**
 * The rows a table should display. With `showAllGroups`, every group is forced on, which is
 * what the edit tree wants: it shows the whole category/group tree rather than the current
 * selection.
 *
 * The group checkboxes are then deliberately not subscribed to either: they're all forced
 * on, so a click can't change this result, and re-running the filter and sort over every
 * statistic on each click would be wasted work.
 */
export function useVisibleRows(rows: (settings: StatGroupSettings) => ArticleRow[][], showAllGroups: boolean): ArticleRow[][] {
    const yearSourceSettings = useSettings(yearSourceKeys())
    const groupSettings = useSettings(showAllGroups ? [] : statGroupKeys())
    return useMemo(
        () => rows({ ...yearSourceSettings, ...allStatGroupsEnabled, ...groupSettings }),
        [rows, yearSourceSettings, groupSettings],
    )
}

export interface EditModeState {
    editMode: boolean
    setEditMode: (editMode: boolean) => void
    filter: string
    setFilter: (filter: string) => void
    exitEditMode: () => void
}

/**
 * Edit mode is deliberately not persisted (not a setting) — it resets on
 * navigation/reload. It opens on its own whenever the page enters staging mode (e.g. from
 * a settings link) so the pending changes are visible and reviewable on the table. Leaving
 * staging only closes it when the user does so via the table's own Discard/Apply buttons,
 * which double as Done.
 */
export function useEditModeState(): EditModeState {
    const staged = useIsStaged()
    const [editMode, setEditMode] = useState(staged)
    const [prevStaged, setPrevStaged] = useState(staged)
    if (staged !== prevStaged) {
        setPrevStaged(staged)
        if (staged) {
            setEditMode(true)
        }
    }

    // Scoped to the current visit to edit mode, so reopening it starts from the whole tree.
    const [filter, setFilter] = useState('')

    return {
        editMode,
        setEditMode,
        filter,
        setFilter,
        exitEditMode: () => {
            setEditMode(false)
            setFilter('')
        },
    }
}

/**
 * The statistic category/group checkbox tree replicated directly on a table, with each
 * statistic's own cells alongside its checkbox.
 */
export function EditTable(props: {
    rowsByGroup: Map<string, EditRow[]>
    layout: EditTableLayout
    editState: EditModeState
    superHeaderSpec?: SuperHeaderSpec
    /** Which flavor of top-left cell to use, since the comparison's carries a color bar. */
    topLeftType: TopLeftHeaderType
}): ReactNode {
    const { filter, setFilter, exitEditMode } = props.editState
    const spaceRight = extraSpaceRight(props.layout)
    const categories = useCategoriesMatchingSearch(filter)
    const staged = useIsStaged()

    const editModeHeader: EditModeOpenHeader = {
        open: true,
        filter,
        setFilter,
        // In staging mode the Discard/Apply buttons below double as Done.
        onDone: staged ? undefined : exitEditMode,
    }

    return (
        <>
            {staged && <StagingControls onExitStaging={exitEditMode} />}
            <TableFrame
                {...props.layout}
                superHeaderSpec={props.superHeaderSpec}
                topLeftSpec={{ type: props.topLeftType, editMode: editModeHeader }}
                extraSpaceRight={spaceRight}
            >
                <EditSourceAndYearSections />
                <EditSectionHeader name="Statistics" />
                {categories.map(category => (
                    <EditCategory
                        key={category.id}
                        layout={props.layout}
                        spaceRight={spaceRight}
                        category={category}
                        rowsByGroup={props.rowsByGroup}
                        searching={filter !== ''}
                    />
                ))}
            </TableFrame>
        </>
    )
}
