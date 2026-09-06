import React, { CSSProperties, ReactNode, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName, sourceEnabledKey, useIsStaged, useUnitSettings } from '../page_template/settings'
import { ExpansionState, GroupTreeState, SectionTreeState, useAvailableYears, useCategoriesMatchingSearch, useCategoryTreeState, useDataSourceCheckboxes, useExpansionState } from '../page_template/statistic-settings'
import { Category, statParents } from '../page_template/statistic-tree'
import { Universe } from '../universe'
import { HumanReadableName } from '../utils/human-readable-element'
import { reifyReact } from '../utils/human-readable-name'

import { useWarningsByGroup } from './ArticleWarnings'
import { ExpandButton } from './ExpandButton'
import { BooleanSettingKey, CheckboxSettingCustomJustInputProps, CheckboxSettingJustBox, useBooleanSetting, useHighlightStyle } from './checkbox-setting'
import { EditModeOpenHeader } from './edit-mode-header'
import { ArticleRow } from './load-article'
import { useScreenshotMode } from './screenshot'
import { computeNameSpecsWithGroups, nameSpecsForRows } from './statistic-name-specs'
import { CellSpec, measureColumns, measuredLayout, MeasuredTableLayout, PlotSpec, StatisticTableRow, SuperHeaderSpec, TableFrame, TableLayout, TopLeftCellSpec, WarningRowMessage } from './supertable'
import { TableRowContainer, useStatisticNameAdornments } from './table'

const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

// The label is a flex row, so the box has to opt out of being stretched by the row's text.
const editCheckboxStyle: CSSProperties = { cursor: 'pointer', flex: '0 0 auto' }

function EditCheckbox(props: Omit<CheckboxSettingCustomJustInputProps, 'style' | 'fontSize'>): ReactNode {
    return <CheckboxSettingJustBox {...props} style={editCheckboxStyle} />
}

export function useEditTableLayout(columnLayout: TableLayout, columnRows: ArticleRow[][], universe: Universe): MeasuredTableLayout {
    const { simpleOrdinals } = columnLayout
    // Memoized on the measurement's own dependencies, rather than on `columnLayout`, which
    // callers rebuild on every render.
    const columnWidthsInfo = useMemo(
        () => measureColumns(columnRows, universe, simpleOrdinals),
        [columnRows, universe, simpleOrdinals],
    )
    return measuredLayout(columnLayout, columnWidthsInfo, () => 0)
}

const indentEm = 0.75

const togglePx = 20
const toggleGapEm = 0.25

function treeIndent(level: number): string {
    return `calc(${togglePx}px + ${toggleGapEm + level * indentEm}em)`
}

export interface EditRow {
    displayName: HumanReadableName
    row: ArticleRow
    cellSpecs: CellSpec[]
    plotSpec?: PlotSpec
}

/** Rows that aren't in the statistic tree are dropped. */
export function editRowsByGroup(
    rows: ArticleRow[],
    longname: string,
    currentUniverse: Universe,
    cells: (row: ArticleRow, index: number) => { cellSpecs: CellSpec[], plotSpec?: PlotSpec },
): Map<string, EditRow[]> {
    const { updatedNameSpecs } = computeNameSpecsWithGroups(nameSpecsForRows(rows, longname, currentUniverse))
    const displayNames = updatedNameSpecs.map(spec => spec.displayName ?? spec.renderedStatname)
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

/** The collapsible run an unselected row belongs to. Absent on rows that are always shown. */
interface RowCollapse {
    key: string
    expanded: boolean
}

interface EditHeaderSpec {
    kind: 'header'
    key: string
    indent: number
    highlight: boolean
    collapse?: RowCollapse
    checkbox: ReactNode
    toggle?: ReactNode
    name: string
    /** Set for a group the year or source selection leaves with nothing to show. */
    warning?: ReactNode
}

interface EditStatSpec {
    kind: 'stat'
    key: string
    highlight: boolean
    indent: number
    enabled: boolean
    collapse?: RowCollapse
    editRow: EditRow
    checkbox: { kind: 'own', node: ReactNode } | { kind: 'headers', id: string }
}

type EditBodyRow = EditHeaderSpec | EditStatSpec

function EditCheckboxLabel(props: {
    highlight: boolean
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

function EditLabelRow(props: {
    index: number
    highlight: boolean
    checkbox: ReactNode
    toggle?: ReactNode
    name: string
    paddingLeft: string
    warning?: { layout: MeasuredTableLayout, content: ReactNode }
}): ReactNode {
    const { warning, toggle } = props
    const width = warning === undefined ? '100%' : `${warning.layout.widthLeftHeader}%`
    const label = (
        <EditCheckboxLabel
            highlight={props.highlight}
            style={toggle === undefined ? { width, paddingLeft: props.paddingLeft } : undefined}
            checkbox={props.checkbox}
        >
            {props.name}
        </EditCheckboxLabel>
    )
    return (
        <TableRowContainer index={props.index}>
            {toggle === undefined
                ? label
                : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: `${toggleGapEm}em`, width, paddingLeft: props.paddingLeft }}>
                            {toggle}
                            {label}
                        </div>
                    )}
            {warning !== undefined && <WarningRowMessage layout={warning.layout} content={warning.content} />}
        </TableRowContainer>
    )
}

function EditStatRow({ layout, index, spec }: { layout: MeasuredTableLayout, index: number, spec: EditStatSpec }): ReactNode {
    const unitSettings = useUnitSettings()
    const adornments = useStatisticNameAdornments(spec.editRow.row)
    return (
        <StatisticTableRow
            layout={layout}
            index={index}
            leftHeader={(
                <div style={{ width: `${layout.widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: treeIndent(spec.indent) }}>
                    <EditCheckboxLabel
                        highlight={spec.highlight}
                        htmlFor={spec.checkbox.kind === 'headers' ? spec.checkbox.id : undefined}
                        checkbox={spec.checkbox.kind === 'own' ? spec.checkbox.node : undefined}
                    >
                        {reifyReact(spec.editRow.displayName, unitSettings)}
                    </EditCheckboxLabel>
                    {adornments}
                </div>
            )}
            cellSpecs={spec.editRow.cellSpecs}
            plotSpec={spec.editRow.plotSpec}
            withCongressional={spec.enabled}
        />
    )
}

// The body is always mounted so the height transition has content to reveal; `inert` keeps
// the collapsed (clipped) content out of the tab order and off screen readers.
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
 * A group the year and source selection leaves with no statistics is a header row alone: a
 * checkbox and no value. It exists for this geography, so dropping it from the tree would
 * leave no way to reach it; its warning stands where the value would be.
 */
function groupBodyRows(
    { group, enabled, setEnabled, highlight }: GroupTreeState,
    indent: number,
    collapse: RowCollapse,
    rowsByGroup: Map<string, EditRow[]>,
    warningsByGroup: Map<string, ReactNode>,
): EditBodyRow[] {
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
    const rowCollapse = enabled ? undefined : collapse
    const statSpec = (editRow: EditRow, statIndent: number, whoseCheckbox: EditStatSpec['checkbox']): EditStatSpec => ({
        kind: 'stat',
        key: `stat-${editRow.row.statpath}`,
        highlight,
        indent: statIndent,
        enabled,
        collapse: rowCollapse,
        editRow,
        checkbox: whoseCheckbox,
    })
    if (groupRows.length === 1) {
        return [statSpec(groupRows[0], indent, { kind: 'own', node: checkbox })]
    }
    return [
        { kind: 'header', key: `group-${group.id}`, indent, highlight, collapse: rowCollapse, checkbox, name: group.name, warning: warningsByGroup.get(group.id) },
        ...groupRows.map(editRow => statSpec(editRow, indent + 1, { kind: 'headers', id: checkboxId })),
    ]
}

function categoryBodyRows(
    sections: SectionTreeState[],
    { categoryExpanded, searching }: { categoryExpanded: boolean, searching: boolean },
    rowsByGroup: Map<string, EditRow[]>,
    warningsByGroup: Map<string, ReactNode>,
): EditBodyRow[] {
    const categoryCollapse = { key: 'category', expanded: categoryExpanded }
    return sections.flatMap((section): EditBodyRow[] => {
        if (section.kind === 'Group') {
            return groupBodyRows(section.group, 1, categoryCollapse, rowsByGroup, warningsByGroup)
        }
        const { subcategory, status, toggle, highlight, expanded, setExpanded, groups } = section
        const shown = searching || (categoryExpanded && expanded)
        const anythingToExpand = groups.some(group => !group.enabled)
        return [
            {
                kind: 'header',
                key: `subcategory-${subcategory.id}`,
                indent: 1,
                highlight,
                // The header stays out of the category's collapsible run whenever it has something to show
                collapse: groups.some(group => group.enabled) ? undefined : categoryCollapse,
                checkbox: (
                    <EditCheckbox
                        checked={status === true}
                        indeterminate={status === 'indeterminate'}
                        onChange={toggle}
                        testId={`edit_subcategory_${subcategory.id}`}
                        highlight={highlight}
                    />
                ),
                toggle: anythingToExpand && !searching
                    ? (
                            <ExpandButton
                                isExpanded={shown}
                                data-subcategory-id={subcategory.id}
                                onClick={() => { setExpanded(!expanded) }}
                                style={{ ...toggleSize, backgroundSize: '16px' }}
                                aria-label={shown ? `Collapse ${subcategory.name} subcategory` : `Expand ${subcategory.name} subcategory`}
                            />
                        )
                    : <div style={toggleSize} />,
                name: subcategory.name,
            },
            ...groups.flatMap(group => groupBodyRows(group, 2, { key: `subcategory-${subcategory.id}`, expanded: shown }, rowsByGroup, warningsByGroup)),
        ]
    })
}

interface EditBodySegment {
    key: string
    /** Unset on a run that is always shown. */
    expanded?: boolean
    rows: { spec: EditBodyRow, index: number }[]
}

/**
 * Splits a category's rows into runs of selected rows, which are shown whether or not the
 * category is expanded, and runs of unselected ones, each belonging to the category's or a
 * subcategory's collapse.
 *
 * Rows are striped by the position they end up at, counting only the rows currently on
 * display, so the alternation is unbroken in either state. The category header is row 0.
 */
function editBodySegments(bodyRows: EditBodyRow[]): EditBodySegment[] {
    const segments: EditBodySegment[] = []
    let segment: EditBodySegment | undefined
    let collapseKey: string | undefined
    let index = 1
    for (const spec of bodyRows) {
        if (segment === undefined || collapseKey !== spec.collapse?.key) {
            collapseKey = spec.collapse?.key
            segment = { key: spec.key, expanded: spec.collapse?.expanded, rows: [] }
            segments.push(segment)
        }
        segment.rows.push({ spec, index })
        if (spec.collapse?.expanded !== false) {
            index++
        }
    }
    return segments
}

const toggleSize: CSSProperties = { width: `${togglePx}px`, height: `${togglePx}px`, flex: '0 0 auto' }

function EditCategory(props: {
    layout: MeasuredTableLayout
    category: Category
    rowsByGroup: Map<string, EditRow[]>
    warningsByGroup: Map<string, ReactNode>
    searching: boolean
    expansion: ExpansionState
}): ReactNode {
    const tree = useCategoryTreeState(props.category, props.expansion)
    const expanded = props.searching || tree.expanded
    const bodyRows = categoryBodyRows(
        tree.sections,
        { categoryExpanded: expanded, searching: props.searching },
        props.rowsByGroup,
        props.warningsByGroup,
    )
    const segments = editBodySegments(bodyRows)
    const anythingToExpand = bodyRows.some(row => row.collapse !== undefined)

    return (
        <>
            <TableRowContainer index={0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: `${toggleGapEm}em`, padding: '1px', width: '100%' }}>
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
                const rows = segment.rows.map(({ spec, index }) => spec.kind === 'header'
                    ? (
                            <EditLabelRow
                                key={spec.key}
                                index={index}
                                highlight={spec.highlight}
                                checkbox={spec.checkbox}
                                toggle={spec.toggle}
                                name={spec.name}
                                // A toggle takes up the space treeIndent reserves for one, so the checkboxes stay in line
                                paddingLeft={spec.toggle === undefined ? treeIndent(spec.indent) : `${spec.indent * indentEm}em`}
                                warning={spec.warning === undefined ? undefined : { layout: props.layout, content: spec.warning }}
                            />
                        )
                    : <EditStatRow key={spec.key} layout={props.layout} index={index} spec={spec} />,
                )
                return segment.expanded === undefined
                    ? <React.Fragment key={segment.key}>{rows}</React.Fragment>
                    : <AnimatedCollapse key={segment.key} expanded={segment.expanded}>{rows}</AnimatedCollapse>
            })}
        </>
    )
}

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
            // Section headers have no expand toggle, so these indent straight from the left edge.
            paddingLeft={`${indentEm}em`}
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

/** Not part of the statistic tree, so the search box doesn't filter these. */
function EditSourceAndYearSections(): ReactNode {
    const sourceCheckboxes = useDataSourceCheckboxes()
    const years = useAvailableYears()
    return (
        <>
            {sourceCheckboxes.map(({ category, checkboxSpecs }) => (
                <React.Fragment key={category}>
                    <EditSectionHeader name={checkboxCategoryName(category)} />
                    {checkboxSpecs.map(({ source, forcedOn }, index) => (
                        <EditSettingRow
                            key={source.name}
                            index={index}
                            name={source.name}
                            settingKey={sourceEnabledKey(source)}
                            forcedOn={forcedOn}
                            testId={`edit_source ${source.category} ${source.name}`}
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
 * Edit mode is deliberately not a setting, so it resets on navigation or reload. It opens on
 * its own whenever the page enters staging mode (e.g. from a settings link) so the pending
 * changes are visible on the table. Leaving staging only closes it when the user does so via
 * the Discard/Apply buttons, which double as Done.
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

    const [filter, setFilter] = useState('')

    const isScreenshot = useScreenshotMode()

    return {
        editMode: editMode && !isScreenshot,
        setEditMode,
        filter,
        setFilter,
        exitEditMode: () => {
            setEditMode(false)
            setFilter('')
        },
    }
}

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
    const expansion = useExpansionState()

    const editModeHeader: EditModeOpenHeader = {
        open: true,
        filter,
        setFilter,
        // In staging mode the Discard/Apply buttons below double as Done.
        onDone: staged ? undefined : exitEditMode,
    }

    return (
        <TableFrame
            layout={props.layout}
            superHeaderSpec={props.superHeaderSpec}
            topLeftSpec={{ ...props.topLeftSpec, editMode: editModeHeader }}
        >
            <EditSourceAndYearSections />
            <EditSectionHeader name="Statistics" />
            {categories.map(category => (
                <EditCategory
                    key={category.id}
                    layout={props.layout}
                    category={category}
                    rowsByGroup={props.rowsByGroup}
                    warningsByGroup={warningsByGroup}
                    searching={filter !== ''}
                    expansion={expansion}
                />
            ))}
        </TableFrame>
    )
}
