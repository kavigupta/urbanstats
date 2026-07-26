import React, { CSSProperties, ReactNode, useMemo } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName, isStagedChange, sourceEnabledKey, useIsStaged, useSetting, useSettingInfo, useSettings } from '../page_template/settings'
import { GroupTreeState, StatGroupSettings, useAvailableYears, useCategoriesMatchingSearch, useCategoryTreeState, useDataSourceCheckboxes, yearSourceKeys } from '../page_template/statistic-settings'
import { allGroups, Category, statParents } from '../page_template/statistic-tree'
import { HumanReadableName, reifyReact } from '../utils/human-readable-name'
import { Article } from '../utils/protos'

import { ExpandButton } from './ExpandButton'
import { StagingControls } from './StagingControls'
import { ArticleTableLayout, useArticleTableLayout, useExpandedPlotSpecs } from './article-table'
import { congressionalDataForRow } from './congressional-table/model'
import { ArticleRow } from './load-article'
import { BooleanSettingKey, CheckboxSettingJustBox, useHighlightStyle } from './sidebar'
import { displayNamesForRows } from './statistic-name-specs'
import { CellSpec, PlotSpec, RowExtras } from './supertable'
import { CommonLayoutInformation, MainHeaderRow, maxLayoutInformation, StatisticRowCells, TableHeaderContainer, TableRowContainer, useStatisticNameAdornments } from './table'

// Wrapping the name in a label lets a click anywhere on it toggle the associated
// checkbox. Child rows of a multi-stat group have no checkbox of their own, so
// they point at the group's checkbox by id.
const editLabelStyle: CSSProperties = { padding: '1px', display: 'flex', alignItems: 'center', gap: '0.4em', cursor: 'pointer' }

// `height: auto` opts out of the sidebar checkbox's font-size-derived height, so the
// box keeps its intrinsic (square) size against the table's row text.
const editCheckboxStyle: CSSProperties = { cursor: 'pointer', flex: '0 0 auto', height: 'auto' }

/** Layout shared by every row of the edit table. */
type EditTableLayout = ArticleTableLayout & {
    longname: string
    columnWidthsInfo: CommonLayoutInformation
}

/** Each level of the tree is indented by this much relative to the one above it. */
const indentEm = 0.75

/** A row of the edit tree, paired with the name it renders under. */
interface EditRow {
    row: ArticleRow
    displayName: HumanReadableName
    /** Position in the full row list, which is what the plot specs are indexed by. */
    index: number
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
    displayName: HumanReadableName
    row: ArticleRow
    plotSpec?: PlotSpec
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

function EditStatRow({ layout, index, spec }: { layout: EditTableLayout, index: number, spec: EditStatSpec }): ReactNode {
    const { longname, widthLeftHeader, columnWidth, onlyColumns, simpleOrdinals, columnWidthsInfo } = layout
    const adornments = useStatisticNameAdornments(spec.row)
    // Only render the (large) representatives table for enabled stats, matching the normal table.
    const congressionalRegion = spec.enabled ? congressionalDataForRow(spec.row, longname) : undefined
    return (
        <>
            <TableRowContainer index={index}>
                <div style={{ width: `${widthLeftHeader}%`, display: 'flex', alignItems: 'center', gap: '0.3em', paddingLeft: `${spec.indent * indentEm}em` }}>
                    <EditCheckboxLabel
                        highlight={spec.highlight}
                        htmlFor={spec.checkboxId}
                        checkbox={spec.checkbox}
                    >
                        {reifyReact(spec.displayName)}
                    </EditCheckboxLabel>
                    {adornments}
                </div>
                <StatisticRowCells
                    width={columnWidth}
                    longname={longname}
                    row={spec.row}
                    onlyColumns={onlyColumns}
                    simpleOrdinals={simpleOrdinals}
                    columnWidthsInfo={columnWidthsInfo}
                    extraSpaceRight={0}
                />
            </TableRowContainer>
            <RowExtras
                plotSpec={spec.plotSpec}
                congressionalRegions={congressionalRegion === undefined ? [] : [congressionalRegion]}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                extraSpaceRight={[0]}
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
function categoryBodyRows(
    groups: GroupTreeState[],
    rowsByGroup: Map<string, EditRow[]>,
    plotSpecs: (PlotSpec | undefined)[],
): EditBodyRow[] {
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
        const statSpec = (editRow: EditRow, indent: number): EditStatSpec => ({
            kind: 'stat',
            key: `stat-${editRow.row.statpath}`,
            highlight,
            indent,
            enabled,
            displayName: editRow.displayName,
            row: editRow.row,
            plotSpec: plotSpecs[editRow.index],
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
    category: Category
    rowsByGroup: Map<string, EditRow[]>
    plotSpecs: (PlotSpec | undefined)[]
    searching: boolean
}): ReactNode {
    const tree = useCategoryTreeState(props.category)
    const expanded = props.searching || tree.expanded
    const bodyRows = categoryBodyRows(tree.groups, props.rowsByGroup, props.plotSpecs)

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
    filter: string
    setFilter: (filter: string) => void
    onExit: () => void
}): ReactNode {
    const { filter } = props
    const tableLayout = useArticleTableLayout('edit')
    const { currentUniverse, simpleOrdinals, widthLeftHeader, columnWidth, onlyColumns } = tableLayout
    const allRows = useAllRows(props.rows)
    const categories = useCategoriesMatchingSearch(filter)
    const staged = useIsStaged()

    // Keep the expandable per-stat plots ("extras") available in edit mode, driven
    // by the same rowExpandedKey setting the normal table uses. Kept out of rowsByGroup
    // because it's the only part of a row that changes when the user expands one.
    const plotSpecs = useExpandedPlotSpecs(allRows, props.article)

    const rowsByGroup = useMemo(() => {
        const displayNames = displayNamesForRows(allRows, props.article.longname, currentUniverse)
        const result = new Map<string, EditRow[]>()
        for (const [index, row] of allRows.entries()) {
            const parent = statParents.get(row.statpath)
            if (parent === undefined) {
                continue
            }
            const existing = result.get(parent.group.id) ?? []
            existing.push({ row, displayName: displayNames[index], index })
            result.set(parent.group.id, existing)
        }
        return result
    }, [allRows, props.article.longname, currentUniverse])

    const columnWidthsInfo = useMemo(
        () => maxLayoutInformation(allRows, currentUniverse, simpleOrdinals),
        [allRows, currentUniverse, simpleOrdinals],
    )

    const layout: EditTableLayout = { ...tableLayout, longname: props.article.longname, columnWidthsInfo }
    const topLeftSpec = {
        type: 'top-left-header',
        editMode: {
            open: true,
            filter,
            setFilter: props.setFilter,
            // In staging mode the Discard/Apply buttons below double as Done.
            onDone: staged ? undefined : props.onExit,
        },
    } satisfies CellSpec

    return (
        <>
            {staged && <StagingControls horizontal onExitStaging={props.onExit} />}
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
                <EditSourceAndYearSections />
                <EditSectionHeader name="Statistics" />
                {categories.map(category => (
                    <EditCategory
                        key={category.id}
                        layout={layout}
                        category={category}
                        rowsByGroup={rowsByGroup}
                        plotSpecs={plotSpecs}
                        searching={filter !== ''}
                    />
                ))}
            </div>
        </>
    )
}
