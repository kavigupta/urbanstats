import React, { ReactNode } from 'react'

import { sortYears, useAnachronisticSelectedGroups, useEmptyYears, useSelectedGroups } from '../page_template/statistic-settings'

import { useScreenshotMode } from './screenshot'

export function ArticleWarnings(): ReactNode {
    const screenshotMode = useScreenshotMode()
    const emptyYears = useEmptyYears()
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
                ...emptyYears.map(year => (
                    <>
                        No Statistic Categories are selected which have data for Year
                        {' '}
                        <b>{year}</b>
                    </>
                )),
                ...anachronisticSelectedGroups.map(group => (
                    <>
                        No data for
                        {' '}
                        <b>{group.hierarchicalName}</b>
                        {' '}
                        is part of the selected years. Select one of Year
                        {' '}
                        {Array.from(group.years).filter(year => year !== null).sort(sortYears).map((year, key, years) => (
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
