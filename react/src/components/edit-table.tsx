import React, { CSSProperties, ReactNode, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName, sourceEnabledKey, useIsStaged } from '../page_template/settings'
import { GroupTreeState, useAvailableYears, useCategoriesMatchingSearch, useCategoryTreeState, useDataSourceCheckboxes, useExpandCategoriesHidingStagedChanges, useSelectedGroups } from '../page_template/statistic-settings'
import { Category, statParents } from '../page_template/statistic-tree'
import { Universe } from '../universe'
import { HumanReadableName, reifyReact } from '../utils/human-readable-name'

import { noCategoriesSelectedContent, useWarningsByGroup } from './ArticleWarnings'
import { ExpandButton } from './ExpandButton'
import { StagingControls } from './StagingControls'
import { BooleanSettingKey, CheckboxSettingCustomJustInputProps, CheckboxSettingJustBox, useBooleanSetting, useHighlightStyle } from './checkbox-setting'
import { ArticleRow } from './load-article'
import { displayNamesForRows } from './statistic-name-specs'
import { CellSpec, EditModeOpenHeader, measureColumns, measuredLayout, MeasuredTableLayout, PlotSpec, StatisticTableRow, SuperHeaderSpec, TableFrame, TableLayout, TopLeftCellSpec, WarningRowMessage } from './supertable'
import { TableRowContainer, useStatisticNameAdornments } from './table'

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

/**
 * Measures a table's columns for an edit table, given the rows of each of its columns. The
 * widths are measured over every statistic, since the edit tree shows them all, so they're
 * memoized rather than remeasured on each checkbox click.
 *
 * No column reserves space to its right: that space is for vertical plots, which only appear
 * when transposed, and an edit table never is.
 */
export function useEditTableLayout(columnLayout: TableLayout, columnRows: ArticleRow[][], universe: Universe): MeasuredTableLayout {
    const { simpleOrdinals } = columnLayout
    // Memoized on what the measurement itself depends on, rather than on `columnLayout`, which
    // callers rebuild on every render.
    const columnWidthsInfo = useMemo(
        () => measureColumns(columnRows, universe, simpleOrdinals),
        [columnRows, universe, simpleOrdinals],
    )
    return measuredLayout(columnLayout, columnWidthsInfo, () => 0)
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
    /** Whether the group this row belongs to is selected. Selected rows don't collapse. */
    enabled: boolean
    /** The group's checkbox, on the row that carries it. */
    checkbox?: ReactNode
}

interface EditGroupHeaderSpec extends EditBodyRowBase {
    kind: 'group-header'
    name: string
    /** Set for a group the year or source selection leaves with nothing to show. */
    warning?: ReactNode
}

interface EditStatSpec extends EditBodyRowBase {
    kind: 'stat'
    indent: number
    editRow: EditRow
    /** The id of the group's checkbox, on the rows that only point at it. */
    checkboxId?: string
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

/**
 * A row that is nothing but a checkbox and its label, indented under its section header. A
 * group with nothing to show is one of these, and carries its warning where its values would
 * have been -- so the label gives up the width of the columns it stands in for.
 */
function EditLabelRow(props: {
    index: number
    highlight: boolean
    checkbox: ReactNode
    name: string
    warning?: { layout: MeasuredTableLayout, content: ReactNode }
}): ReactNode {
    const { warning } = props
    return (
        <TableRowContainer index={props.index}>
            <EditCheckboxLabel
                highlight={props.highlight}
                style={{ width: warning === undefined ? '100%' : `${warning.layout.widthLeftHeader}%`, paddingLeft: `${indentEm}em` }}
                checkbox={props.checkbox}
            >
                {props.name}
            </EditCheckboxLabel>
            {warning !== undefined && <WarningRowMessage layout={warning.layout} content={warning.content} />}
        </TableRowContainer>
    )
}

function EditStatRow({ layout, index, spec }: { layout: MeasuredTableLayout, index: number, spec: EditStatSpec }): ReactNode {
    const adornments = useStatisticNameAdornments(spec.editRow.row)
    return (
        <StatisticTableRow
            layout={layout}
            index={index}
            leftHeader={(
                <div style={{ width: `${layout.widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: `${spec.indent * indentEm}em` }}>
                    <EditCheckboxLabel
                        highlight={spec.highlight}
                        htmlFor={spec.checkboxId}
                        checkbox={spec.checkbox}
                    >
                        {reifyReact(spec.editRow.displayName)}
                    </EditCheckboxLabel>
                    {adornments}
                </div>
            )}
            cellSpecs={spec.editRow.cellSpecs}
            plotSpec={spec.editRow.plotSpec}
            // Only render the (large) representatives table for enabled stats, matching the normal table.
            withCongressional={spec.enabled}
        />
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
 *
 * A group the year and source selection leaves with no statistics is that header alone: a
 * row with a checkbox and no value. It exists for this geography, so dropping it from the
 * tree would leave no way to reach it; its warning stands where the value would be.
 */
function categoryBodyRows(groups: GroupTreeState[], rowsByGroup: Map<string, EditRow[]>, warningsByGroup: Map<string, ReactNode>): EditBodyRow[] {
    return groups.flatMap(({ group, enabled, setEnabled, highlight }): EditBodyRow[] => {
        const groupRows = rowsByGroup.get(group.id) ?? []
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
            { kind: 'group-header', key: `group-${group.id}`, highlight, enabled, checkbox, name: group.name, warning: warningsByGroup.get(group.id) },
            ...groupRows.map(editRow => ({ ...statSpec(editRow, 2), checkboxId })),
        ]
    })
}

/** A run of a category's rows that collapse together, or one that stays visible. */
interface EditBodySegment {
    key: string
    collapsible: boolean
    rows: { spec: EditBodyRow, index: number }[]
}

/**
 * Splits a category's rows into runs of selected rows, which the category shows whether or
 * not it is expanded, and runs of unselected ones, which only the expanded category shows.
 *
 * Rows are striped by the position they end up at, counting only the rows currently on
 * display, so the alternation is unbroken in either state. The category header is row 0.
 */
function editBodySegments(bodyRows: EditBodyRow[], expanded: boolean): EditBodySegment[] {
    const segments: EditBodySegment[] = []
    let segment: EditBodySegment | undefined
    let index = 1
    for (const spec of bodyRows) {
        const collapsible = !spec.enabled
        if (segment === undefined || segment.collapsible !== collapsible) {
            segment = { key: spec.key, collapsible, rows: [] }
            segments.push(segment)
        }
        segment.rows.push({ spec, index })
        if (expanded || !collapsible) {
            index++
        }
    }
    return segments
}

const toggleSize: CSSProperties = { width: '20px', height: '20px', flex: '0 0 auto' }

function EditCategory(props: {
    layout: MeasuredTableLayout
    category: Category
    rowsByGroup: Map<string, EditRow[]>
    warningsByGroup: Map<string, ReactNode>
    searching: boolean
}): ReactNode {
    const tree = useCategoryTreeState(props.category)
    const expanded = props.searching || tree.expanded
    const segments = editBodySegments(categoryBodyRows(tree.groups, props.rowsByGroup, props.warningsByGroup), expanded)
    // With every statistic selected there is nothing left for expanding to reveal.
    const anythingToExpand = segments.some(segment => segment.collapsible)

    return (
        <>
            <TableRowContainer index={0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25em', padding: '1px', width: '100%' }}>
                    {!props.searching && (anythingToExpand
                        ? (
                                <ExpandButton
                                    isExpanded={expanded}
                                    data-category-id={props.category.id}
                                    onClick={() => { tree.setExpanded(!tree.expanded) }}
                                    style={{ ...toggleSize, backgroundSize: '16px' }}
                                    aria-label={expanded ? `Collapse ${props.category.name} category` : `Expand ${props.category.name} category`}
                                />
                            )
                        // Categories without a toggle keep its space, so every category name lines up.
                        : <div style={toggleSize} />)}
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
            {segments.map((segment) => {
                const rows = segment.rows.map(({ spec, index }) => spec.kind === 'group-header'
                    ? (
                            <EditLabelRow
                                key={spec.key}
                                index={index}
                                highlight={spec.highlight}
                                checkbox={spec.checkbox}
                                name={spec.name}
                                warning={spec.warning === undefined ? undefined : { layout: props.layout, content: spec.warning }}
                            />
                        )
                    : <EditStatRow key={spec.key} layout={props.layout} index={index} spec={spec} />,
                )
                return segment.collapsible
                    ? <AnimatedCollapse key={segment.key} expanded={expanded}>{rows}</AnimatedCollapse>
                    : <React.Fragment key={segment.key}>{rows}</React.Fragment>
            })}
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
        <EditLabelRow
            index={props.index}
            highlight={highlight}
            name={props.name}
            checkbox={(
                <EditCheckbox
                    checked={checked}
                    forcedOn={props.forcedOn}
                    onChange={setChecked}
                    testId={props.testId}
                    highlight={highlight}
                />
            )}
        />
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
 * which double as Done. Opening it while staged also expands the categories that would
 * otherwise hide a staged change.
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

    useExpandCategoriesHidingStagedChanges(editMode && staged)

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
    layout: MeasuredTableLayout
    editState: EditModeState
    superHeaderSpec?: SuperHeaderSpec
    /** As the normal table's, so the two agree on what the left column is called. */
    topLeftSpec: TopLeftCellSpec
}): ReactNode {
    const { filter, setFilter, exitEditMode } = props.editState
    const categories = useCategoriesMatchingSearch(filter)
    const staged = useIsStaged()
    const warningsByGroup = useWarningsByGroup()
    const nothingSelected = useSelectedGroups().length === 0

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
                layout={props.layout}
                superHeaderSpec={props.superHeaderSpec}
                topLeftSpec={{ ...props.topLeftSpec, editMode: editModeHeader }}
            >
                <EditSourceAndYearSections />
                <EditSectionHeader name="Statistics" />
                {/* No group's row can carry this one, so it goes above the tree the user selects from. */}
                {nothingSelected && (
                    <TableRowContainer index={0}>
                        <WarningRowMessage layout={props.layout} content={noCategoriesSelectedContent} fullRow />
                    </TableRowContainer>
                )}
                {categories.map(category => (
                    <EditCategory
                        key={category.id}
                        layout={props.layout}
                        category={category}
                        rowsByGroup={props.rowsByGroup}
                        warningsByGroup={warningsByGroup}
                        searching={filter !== ''}
                    />
                ))}
            </TableFrame>
        </>
    )
}
