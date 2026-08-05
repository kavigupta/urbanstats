import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName } from '../page_template/settings'
import { MissingGroupReason, useMissingGroups, useSelectedGroups } from '../page_template/statistic-settings'
import { Category, Group, GroupIdentifier, StatPath, statPathToOrder, Year } from '../page_template/statistic-tree'

import { useScreenshotMode } from './screenshot'
import { warningRowIndices } from './warning-placement'

/** An explanation of why some statistics aren't there, shown where they would have been. */
export interface ArticleWarning {
    /** Where the missing statistics sit in statistic tree order. */
    order: number
    /** Goes in the left header, where the statistic's name would be. */
    name?: string
    content: ReactNode
}

/** A warning, placed before the row it takes the place of. */
export interface WarningRow {
    index: number
    name?: string
    content: ReactNode
}

/** A warning that stands in for a column, at its index among the table's final columns. */
export interface WarningColumn {
    columnIndex: number
    content: ReactNode
}

/** Stands in for the table as a whole, which has no rows for the warning to be placed against. */
const nothingSelectedContent: ReactNode = <b>No Statistics are selected</b>

export function useArticleWarnings(onEdit: () => void): ArticleWarning[] {
    const screenshotMode = useScreenshotMode()
    const selectedGroups = useSelectedGroups()
    const missingGroups = useMissingGroups()

    if (screenshotMode) {
        return []
    }

    if (selectedGroups.length === 0) {
        return [{
            order: 0,
            content: nothingSelectedContent,
        }]
    }

    return missingGroups
        .map(({ groupOrCategory, reason }) => ({
            order: firstStatOrder(groupOrCategory),
            name: groupOrCategory.name,
            content: warningContent(groupOrCategory, reason, onEdit),
        }))
        .sort((a, b) => a.order - b.order)
}

/**
 * The warning each empty group carries, for the edit tree: it lists every group, so a warning
 * goes in the row the group already has rather than standing in for one. A warning that covers
 * a whole category is repeated on each of its groups, since they're rows apart on the tree.
 */
export function useWarningsByGroup(): Map<GroupIdentifier, ReactNode> {
    const screenshotMode = useScreenshotMode()
    const missingGroups = useMissingGroups()

    const result = new Map<GroupIdentifier, ReactNode>()
    if (screenshotMode) {
        return result
    }
    for (const { groupOrCategory, reason } of missingGroups) {
        const content = warningContent(groupOrCategory, reason)
        const groups = groupOrCategory.kind === 'Group' ? [groupOrCategory] : groupOrCategory.contents
        for (const group of groups) {
            result.set(group.id, content)
        }
    }
    return result
}

/** `onEdit` is unset on the edit tree's own warnings, which are already where the user would be sent. */
function warningContent(groupOrCategory: Group | Category, reason: MissingGroupReason, onEdit?: () => void): ReactNode {
    return reason.kind === 'year'
        ? (
                <>
                    <EditAction onEdit={onEdit}>Select</EditAction>
                    {' '}
                    <YearList years={reason.years} />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        : (
                <>
                    {'All '}
                    <b>{checkboxCategoryName(reason.category)}</b>
                    {' are disabled. '}
                    <EditAction onEdit={onEdit}>Enable one</EditAction>
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
}

/**
 * The part of a warning that names what to do about it, as a button into edit mode where the
 * settings it refers to are.
 */
function EditAction({ onEdit, children }: { onEdit?: () => void, children: ReactNode }): ReactNode {
    const colors = useColors()
    if (onEdit === undefined) {
        return children
    }
    return (
        <button
            type="button"
            onClick={onEdit}
            style={{
                display: 'inline',
                padding: 0,
                border: 'none',
                background: 'none',
                font: 'inherit',
                color: colors.blueLink,
                cursor: 'pointer',
            }}
            data-test-id="warning-edit-action"
        >
            {children}
        </button>
    )
}

/** A category's warning stands in for a whole run of statistics, a group's for just its own. */
function theseStatistics(groupOrCategory: Group | Category): string {
    switch (groupOrCategory.kind) {
        case 'Group':
            return 'this statistic'
        case 'Category':
            return 'these statistics'
    }
}

function firstStatOrder(groupOrCategory: Group | Category): number {
    return Math.min(...Array.from(groupOrCategory.statPaths).map(path => statPathToOrder.get(path)!))
}

/** Places each warning at the row its statistics would have gone in, given the table's rows. */
export function placeWarnings(statPaths: StatPath[], warnings: ArticleWarning[]): WarningRow[] {
    const indices = warningRowIndices(statPaths, warnings.map(({ order }) => order))
    return warnings.map(({ name, content }, warningIndex) => ({ index: indices[warningIndex], name, content }))
}

function YearList({ years }: { years: Year[] }): ReactNode {
    switch (years.length) {
        case 0:
            return null
        case 1:
            return <b>{years[0]}</b>
        case 2:
            return (
                <>
                    <b>{years[0]}</b>
                    {' or '}
                    <b>{years[1]}</b>
                </>
            )
        case 3:
            return (
                <>
                    <b>{years[0]}</b>
                    {', '}
                    <b>{years[1]}</b>
                    {', or '}
                    <b>{years[2]}</b>
                </>
            )
        default:
            return (
                <>
                    <b>{years[0]}</b>
                    {', '}
                    <YearList years={years.slice(1)} />
                </>
            )
    }
}
