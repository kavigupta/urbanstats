import React, { ReactNode } from 'react'

import { useMissingGroups, useSelectedGroups } from '../page_template/statistic-settings'
import { Category, Group, StatPath, statPathToOrder } from '../page_template/statistic-tree'

import { useScreenshotMode } from './screenshot'
import { warningMessage } from './warning-message'
import { warningRowIndices } from './warning-placement'

export interface ArticleWarning {
    /** Where the missing statistics sit in statistic tree order. */
    order: number
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

export function useArticleWarnings(): ArticleWarning[] {
    const screenshotMode = useScreenshotMode()
    const selectedGroups = useSelectedGroups()
    const missingGroups = useMissingGroups()

    if (screenshotMode) {
        return []
    }

    if (selectedGroups.length === 0) {
        return [{
            order: 0,
            content: <b>No Statistic Categories are selected</b>,
        }]
    }

    return missingGroups
        .map(({ groupOrCategory, reason }) => ({
            order: firstStatOrder(groupOrCategory),
            name: groupOrCategory.name,
            content: warningMessage(reason, groupOrCategory),
        }))
        .sort((a, b) => a.order - b.order)
}

function firstStatOrder(groupOrCategory: Group | Category): number {
    return Math.min(...Array.from(groupOrCategory.statPaths).map(path => statPathToOrder.get(path)!))
}

export function placeWarnings(statPaths: StatPath[], warnings: ArticleWarning[]): WarningRow[] {
    const indices = warningRowIndices(statPaths, warnings.map(({ order }) => order))
    return warnings.map(({ name, content }, warningIndex) => ({ index: indices[warningIndex], name, content }))
}
