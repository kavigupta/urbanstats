import React, { ReactNode } from 'react'

import type { MissingGroupReason, MissingSources } from '../page_template/statistic-settings'
import type { Category, Group } from '../page_template/statistic-tree'

export function warningMessage(reason: MissingGroupReason, groupOrCategory: Group | Category): ReactNode {
    switch (reason.kind) {
        case 'year':
            return (
                <>
                    {'Select '}
                    <BoldList items={reason.years} conjunction="or" />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        case 'source':
            return (
                <>
                    <BoldList items={reason.sources} conjunction="and" />
                    {reason.sources.length === 1 ? ' is disabled. Enable it' : ` are disabled. Enable ${enableHowMany(reason)}`}
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
        case 'yearAndSource':
            return (
                <>
                    {'Select '}
                    <BoldList items={reason.years} conjunction="or" />
                    {' and enable '}
                    <BoldList items={reason.sources} conjunction={reason.anySourceSuffices ? 'or' : 'and'} />
                    {` to see ${theseStatistics(groupOrCategory)}.`}
                </>
            )
    }
}

function enableHowMany({ anySourceSuffices }: MissingSources): string {
    return anySourceSuffices ? 'one' : 'them'
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
