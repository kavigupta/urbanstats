import React, { ReactNode } from 'react'

import { checkboxCategoryName } from '../page_template/settings'
import { useMissingGroups, useSelectedGroups } from '../page_template/statistic-settings'
import { Category, Group, StatPath, statPathToOrder, Year } from '../page_template/statistic-tree'

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
            content: reason.kind === 'year'
                ? (
                        <>
                            {'Select '}
                            <YearList years={reason.years} />
                            {` to see ${theseStatistics(groupOrCategory)}.`}
                        </>
                    )
                : (
                        <>
                            {'All '}
                            <b>{checkboxCategoryName(reason.category)}</b>
                            {` are disabled. Enable one to see ${theseStatistics(groupOrCategory)}.`}
                        </>
                    ),
        }))
        .sort((a, b) => a.order - b.order)
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
