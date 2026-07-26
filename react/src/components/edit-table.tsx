import React, { CSSProperties, Fragment, ReactNode, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName, isStagedChange, sourceEnabledKey, useIsStaged, useSetting, useSettingInfo, useSettings } from '../page_template/settings'
import { GroupTreeState, StatGroupSettings, useAvailableYears, useCategoriesMatchingSearch, useCategoryTreeState, useDataSourceCheckboxes, yearSourceKeys } from '../page_template/statistic-settings'
import { allGroups, Category, StatPath, statParents } from '../page_template/statistic-tree'
import { HumanReadableName, reifyReact } from '../utils/human-readable-name'

import { ExpandButton } from './ExpandButton'
import { StagingControls } from './StagingControls'
import { CongressionalColumnData, congressionalDataForRow } from './congressional-table/model'
import { ArticleRow } from './load-article'
import { BooleanSettingKey, CheckboxSettingJustBox, useHighlightStyle } from './sidebar'
import { Cell, CellSpec, EditModeHeader, PlotSpec, RowExtras, SuperHeaderSpec } from './supertable'
import { ColumnIdentifier, CommonLayoutInformation, MainHeaderRow, SuperHeaderHorizontal, TableHeaderContainer, TableRowContainer, useStatisticNameAdornments } from './table'

// Wrapping the name in a label lets a click anywhere on it toggle the associated
// checkbox. Child rows of a multi-stat group have no checkbox of their own, so
// they point at the group's checkbox by id.
const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

// `height: auto` opts out of the sidebar checkbox's font-size-derived height, so the
// box keeps its intrinsic (square) size against the table's row text.
const editCheckboxStyle: CSSProperties = { cursor: 'pointer', flex: '0 0 auto', height: 'auto' }

/** The column shape every row of an edit table is laid out against. */
export interface EditTableLayout {
    widthLeftHeader: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    simpleOrdinals: boolean
    /** Per column, the space reserved to its right, matching what `TableContents` computes. */
    extraSpaceRight: number[]
    columnWidthsInfo: (CommonLayoutInformation | undefined)[]
}

/** Each level of the tree is indented by this much relative to the one above it. */
const indentEm = 0.75

/** A statistic as the edit tree renders it: the name it appears under, and the cells that follow. */
export interface EditRow {
    statpath: StatPath
    displayName: HumanReadableName
    /** Supplies the name's adornments (the plot expander and the disclaimer marker). */
    adornmentRow: ArticleRow
    cellSpecs: CellSpec[]
    plotSpec?: PlotSpec
}

/** Buckets rows by the statistic tree group they belong to, dropping any that aren't in the tree. */
export function editRowsByGroup(rows: EditRow[]): Map<string, EditRow[]> {
    const result = new Map<string, EditRow[]>()
    for (const row of rows) {
        const parent = statParents.get(row.statpath)
        if (parent === undefined) {
            continue
        }
        const existing = result.get(parent.group.id) ?? []
        existing.push(row)
        result.set(parent.group.id, existing)
    }
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
    row: EditRow
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

function congressionalRegionsFor(cellSpecs: CellSpec[]): CongressionalColumnData[] {
    return cellSpecs.flatMap((cell) => {
        if (cell.type !== 'statistic-row') {
            return []
        }
        const data = congressionalDataForRow(cell.row, cell.longname)
        return data === undefined ? [] : [data]
    })
}

function EditStatRow({ layout, index, spec }: { layout: EditTableLayout, index: number, spec: EditStatSpec }): ReactNode {
    const { widthLeftHeader, columnWidth, extraSpaceRight, columnWidthsInfo } = layout
    const adornments = useStatisticNameAdornments(spec.row.adornmentRow)
    // Only render the (large) representatives table for enabled stats, matching the normal table.
    const congressionalRegions = spec.enabled ? congressionalRegionsFor(spec.row.cellSpecs) : []
    return (
        <>
            <TableRowContainer index={index}>
                <div style={{ width: `${widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: `${spec.indent * indentEm}em` }}>
                    <EditCheckboxLabel
                        highlight={spec.highlight}
                        htmlFor={spec.checkboxId}
                        checkbox={spec.checkbox}
                    >
                        {reifyReact(spec.row.displayName)}
                    </EditCheckboxLabel>
                    {adornments}
                </div>
                {spec.row.cellSpecs.map((cellSpec, colIndex) => (
                    <Fragment key={colIndex}>
                        <Cell
                            {...(cellSpec.type === 'statistic-row' ? { ...cellSpec, columnWidthsInfo: columnWidthsInfo[colIndex] } : cellSpec)}
                            width={columnWidth}
                        />
                        <div style={{ width: `${extraSpaceRight[colIndex]}%` }}></div>
                    </Fragment>
                ))}
            </TableRowContainer>
            <RowExtras
                plotSpec={spec.row.plotSpec}
                congressionalRegions={congressionalRegions}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                extraSpaceRight={extraSpaceRight}
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
            <CheckboxSettingJustBox
                id={checkboxId}
                checked={enabled}
                onChange={setEnabled}
                testId={`edit_group_${group.id}`}
                highlight={highlight}
                style={editCheckboxStyle}
            />
        )
        const statSpec = (row: EditRow, indent: number): EditStatSpec => ({
            kind: 'stat',
            key: `stat-${row.statpath}`,
            highlight,
            indent,
            enabled,
            row,
        })
        if (groupRows.length === 1) {
            return [{ ...statSpec(groupRows[0], 1), checkbox }]
        }
        return [
            { kind: 'group-header', key: `group-${group.id}`, highlight, indent: 1, checkbox, name: group.name },
            ...groupRows.map(row => ({ ...statSpec(row, 2), checkboxId })),
        ]
    })
}

function EditCategory(props: {
    layout: EditTableLayout
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
                {/*
                  * Rows are striped by the position they end up at, not by which group they came
                  * from, so the alternation is unbroken. The category header is row 0.
                  */}
                {bodyRows.map((spec, position) => spec.kind === 'group-header'
                    ? <EditGroupHeaderRow key={spec.key} index={position + 1} spec={spec} />
                    : <EditStatRow key={spec.key} layout={props.layout} index={position + 1} spec={spec} />,
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
    const [checked, setChecked] = useSetting(props.settingKey)
    const highlight = isStagedChange(useSettingInfo(props.settingKey))
    return (
        <TableRowContainer index={props.index}>
            <EditCheckboxLabel
                highlight={highlight}
                style={{ width: '100%', paddingLeft: `${indentEm}em` }}
                checkbox={(
                    <CheckboxSettingJustBox
                        checked={(checked ?? false) || (props.forcedOn ?? false)}
                        forcedOn={props.forcedOn}
                        onChange={setChecked}
                        testId={props.testId}
                        highlight={highlight}
                        style={editCheckboxStyle}
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
 * Every available row, regardless of which stat groups are currently enabled, so the
 * edit tree can show the whole category/group tree. Only computed while edit mode is
 * open, since building it means re-running the filter and sort over every statistic.
 *
 * Deliberately not subscribed to the group settings: they're all forced on here, so a
 * checkbox toggle can't change the result, and subscribing would redo that work on
 * every click.
 */
export function useAllRows(rows: (settings: StatGroupSettings) => ArticleRow[][]): ArticleRow[][] {
    const yearSourceSettings = useSettings(yearSourceKeys())
    return useMemo(() => {
        const allGroupsEnabled = { ...yearSourceSettings } as StatGroupSettings
        for (const group of allGroups) {
            allGroupsEnabled[`show_stat_group_${group.id}`] = true
        }
        return rows(allGroupsEnabled)
    }, [rows, yearSourceSettings])
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
    filter: string
    setFilter: (filter: string) => void
    onExit: () => void
    superHeaderSpec?: SuperHeaderSpec
    /** Which flavor of top-left cell to use, since the comparison's carries a color bar. */
    topLeftType: 'top-left-header' | 'comparison-top-left-header'
}): ReactNode {
    const { widthLeftHeader, columnWidth, onlyColumns, simpleOrdinals, extraSpaceRight, columnWidthsInfo } = props.layout
    const categories = useCategoriesMatchingSearch(props.filter)
    const staged = useIsStaged()

    const editModeHeader: EditModeHeader = {
        open: true,
        filter: props.filter,
        setFilter: props.setFilter,
        // In staging mode the Discard/Apply buttons below double as Done.
        onDone: staged ? undefined : props.onExit,
    }
    const topLeftSpec: CellSpec = props.topLeftType === 'comparison-top-left-header'
        ? { type: 'comparison-top-left-header', editMode: editModeHeader }
        : { type: 'top-left-header', editMode: editModeHeader }

    return (
        <>
            {staged && <StagingControls horizontal onExitStaging={props.onExit} />}
            {props.superHeaderSpec !== undefined && (
                <SuperHeaderHorizontal
                    {...props.superHeaderSpec}
                    leftSpacerWidth={widthLeftHeader}
                    widthsEach={extraSpaceRight.map(extra => columnWidth + extra)}
                />
            )}
            <div style={{ position: 'relative' }}>
                <TableHeaderContainer>
                    <MainHeaderRow
                        columnWidth={columnWidth}
                        topLeftSpec={topLeftSpec}
                        topLeftWidth={widthLeftHeader}
                        onlyColumns={onlyColumns}
                        extraSpaceRight={extraSpaceRight}
                        simpleOrdinals={simpleOrdinals}
                        columnWidthsInfo={columnWidthsInfo}
                    />
                </TableHeaderContainer>
                <EditSourceAndYearSections />
                <EditSectionHeader name="Statistics" />
                {categories.map(category => (
                    <EditCategory
                        key={category.id}
                        layout={props.layout}
                        category={category}
                        rowsByGroup={props.rowsByGroup}
                        searching={props.filter !== ''}
                    />
                ))}
            </div>
        </>
    )
}
