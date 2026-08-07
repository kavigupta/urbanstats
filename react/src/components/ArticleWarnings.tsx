import React, { ReactNode } from 'react'

import { useMissingGroups, useSelectedGroups } from '../page_template/statistic-settings'
import { Category, Group, GroupIdentifier, StatPath, statPathToOrder } from '../page_template/statistic-tree'

import { useScreenshotMode } from './screenshot'
import { warningMessage } from './warning-message'
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

/** About the table as a whole, so there is no row to place this against. */
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
            content: warningMessage(reason, groupOrCategory, onEdit),
        }))
        .sort((a, b) => a.order - b.order)
}

export function useWarningsByGroup(): Map<GroupIdentifier, ReactNode> {
    const screenshotMode = useScreenshotMode()
    const missingGroups = useMissingGroups()

    const result = new Map<GroupIdentifier, ReactNode>()
    if (screenshotMode) {
        return result
    }
    for (const { groupOrCategory, reason } of missingGroups) {
        const content = warningMessage(reason, groupOrCategory)
        const groups = groupOrCategory.kind === 'Group' ? [groupOrCategory] : groupOrCategory.contents
        for (const group of groups) {
            result.set(group.id, content)
        }
    }
    return result
}

function firstStatOrder(groupOrCategory: Group | Category): number {
    return Math.min(...Array.from(groupOrCategory.statPaths).map(path => statPathToOrder.get(path)!))
}

/** Places each warning at the row its statistics would have gone in, given the table's rows. */
export function placeWarnings(statPaths: StatPath[], warnings: ArticleWarning[]): WarningRow[] {
    const indices = warningRowIndices(statPaths, warnings.map(({ order }) => order))
    return warnings.map(({ name, content }, warningIndex) => ({ index: indices[warningIndex], name, content }))
}
