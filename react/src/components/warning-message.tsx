import React, { ReactNode } from 'react'

import { checkboxCategoryName } from '../page_template/settings'
import type { MissingGroupReason } from '../page_template/statistic-settings'
import type { Category, Group, Year } from '../page_template/statistic-tree'

/** What a warning says about the setting that is keeping a group's statistics off the page. */
export function warningMessage(reason: MissingGroupReason, groupOrCategory: Group | Category): ReactNode {
    switch (reason.kind) {
        case 'year':
            return (
                <>
                    {'Select '}
                    <YearList years={reason.years} />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        case 'source':
            return (
                <>
                    {'All '}
                    <b>{checkboxCategoryName(reason.category)}</b>
                    {` are disabled. Enable one to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
    }
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
