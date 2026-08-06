import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { checkboxCategoryName } from '../page_template/settings'
import type { MissingGroupReason } from '../page_template/statistic-settings'
import type { Category, Group, Year } from '../page_template/statistic-tree'

/**
 * What a warning says about the setting that is keeping a group's statistics off the page.
 * `onEdit` is unset on the edit tree's own warnings, which are already where the user would be sent.
 */
export function warningMessage(reason: MissingGroupReason, groupOrCategory: Group | Category, onEdit?: () => void): ReactNode {
    switch (reason.kind) {
        case 'year':
            return (
                <>
                    {editAction('Select', onEdit)}
                    {' '}
                    <YearList years={reason.years} />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        case 'source':
            return (
                <>
                    {'All '}
                    <b>{checkboxCategoryName(reason.category)}</b>
                    {' are disabled. '}
                    {editAction('Enable one', onEdit)}
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
    }
}

/** The part of a warning that names what to do about it, plain text when there's nowhere to send the user. */
function editAction(label: string, onEdit?: () => void): ReactNode {
    return onEdit === undefined ? label : <EditButton onEdit={onEdit}>{label}</EditButton>
}

/** A button into edit mode where the settings the warning refers to are. */
function EditButton({ onEdit, children }: { onEdit: () => void, children: ReactNode }): ReactNode {
    const colors = useColors()
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
