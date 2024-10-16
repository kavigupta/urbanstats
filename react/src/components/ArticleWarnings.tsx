import React, { ReactNode } from 'react'

import { Category, Group, sortYears, useAnachronisticSelectedGroups, useSelectedGroups } from '../page_template/statistic-settings'

import { useScreenshotMode } from './screenshot'

export function ArticleWarnings(): ReactNode {
    const screenshotMode = useScreenshotMode()
    const selectedGroups = useSelectedGroups()
    const anachronisticSelectedGroups = useAnachronisticSelectedGroups()

    if (screenshotMode) {
        return null
    }
    const warnings = selectedGroups.length === 0
        ? [
                <>
                    No Statistic Categories are selected
                </>,
            ]
        : [
                ...anachronisticSelectedGroups.map(groupOrCategory => (
                    <>
                        No data for
                        {' '}
                        <b><HierarchicalName groupOrCategory={groupOrCategory} /></b>
                        {' '}
                        is part of the selected years. Select one of Year
                        {' '}
                        {Array.from(groupOrCategory.years).filter(year => year !== null).sort(sortYears).map((year, key, years) => (
                            <>
                                <b key={key}>{year}</b>
                                {key === years.length - 1 ? null : ', '}
                            </>
                        ))}
                    </>
                )),
            ]

    if (warnings.length === 0) {
        return null
    }

    return <WarningBox warnings={warnings} />
}

function WarningBox({ warnings }: { warnings: ReactNode[] }): ReactNode {
    const warningStyle: React.CSSProperties = {

    }

    return (
        <div style={warningStyle}>
            <ul>
                {
                    warnings.map(
                        (warning, key) => (
                            <li key={key}>
                                {warning}
                            </li>
                        ),
                    )
                }
            </ul>
        </div>
    )
}

function HierarchicalName({ groupOrCategory }: { groupOrCategory: Group | Category }): ReactNode {
    switch (groupOrCategory.kind) {
        case 'Group':
            return `${groupOrCategory.parent.name} > ${groupOrCategory.name}`
        case 'Category':
            return groupOrCategory.name
    }
}
