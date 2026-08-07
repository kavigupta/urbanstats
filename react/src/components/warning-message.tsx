import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import type { MissingGroupReason, MissingSources } from '../page_template/statistic-settings'
import type { Category, Group } from '../page_template/statistic-tree'

/** `onEdit` is unset on the edit tree's own warnings, which are already where it would send the user. */
export function warningMessage(reason: MissingGroupReason, groupOrCategory: Group | Category, onEdit?: () => void): ReactNode {
    switch (reason.kind) {
        case 'year':
            return (
                <>
                    {editAction('Select', onEdit)}
                    {' '}
                    <BoldList items={reason.years} conjunction="or" />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        case 'source':
            return (
                <>
                    <BoldList items={reason.sources} conjunction="and" />
                    {reason.sources.length === 1 ? ' is disabled. ' : ' are disabled. '}
                    {editAction(enableAction(reason), onEdit)}
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        case 'yearAndSource':
            return (
                <>
                    {editAction('Select', onEdit)}
                    {' '}
                    <BoldList items={reason.years} conjunction="or" />
                    {' and enable '}
                    <BoldList items={reason.sources} conjunction={reason.anySourceSuffices ? 'or' : 'and'} />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
    }
}

function enableAction({ sources, anySourceSuffices }: MissingSources): string {
    if (sources.length === 1) {
        return 'Enable it'
    }
    return anySourceSuffices ? 'Enable one' : 'Enable them'
}

function editAction(label: string, onEdit?: () => void): ReactNode {
    return onEdit === undefined ? label : <EditButton onEdit={onEdit}>{label}</EditButton>
}

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

function theseStatistics(groupOrCategory: Group | Category): string {
    switch (groupOrCategory.kind) {
        case 'Group':
            return 'this statistic'
        case 'Category':
            return 'these statistics'
    }
}

/** e.g. `2020`, `2020 or 2010`, `2020, 2010, or 2000`. */
function BoldList({ items, conjunction }: { items: (string | number)[], conjunction: 'or' | 'and' }): ReactNode {
    return items.map((item, index) => (
        <React.Fragment key={item}>
            {index === 0 ? '' : items.length > 2 ? ', ' : ' '}
            {index > 0 && index === items.length - 1 ? `${conjunction} ` : ''}
            <b>{item}</b>
        </React.Fragment>
    ))
}
