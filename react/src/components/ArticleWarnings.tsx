import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { useGroupsMissingYearSelection, useSelectedGroups } from '../page_template/statistic-settings'
import { Category, Group, sortYears } from '../page_template/statistic-tree'

import { useScreenshotMode } from './screenshot'

export function ArticleWarnings(): ReactNode {
    const screenshotMode = useScreenshotMode()
    const selectedGroups = useSelectedGroups()
    const groupsMissingYearSelection = useGroupsMissingYearSelection()

    if (screenshotMode) {
        return null
    }
    const warnings = selectedGroups.length === 0
        ? [
                <b key="noneSelected">
                    No Statistic Categories are selected
                </b>,
            ]
        : [
                ...groupsMissingYearSelection.map(groupOrCategory => (
                    <>
                        To see
                        {' '}
                        <b><HierarchicalName groupOrCategory={groupOrCategory} /></b>
                        {' statistics, select '}
                        <YearList years={Array.from(groupOrCategory.years).filter(year => year !== null).sort(sortYears)} />
                        .
                    </>
                )),
            ]

    if (warnings.length === 0) {
        return null
    }

    return <WarningBox warnings={warnings} />
}

function WarningBox({ warnings }: { warnings: ReactNode[] }): ReactNode {
    const colors = useColors()

    return (
        <div style={{
            backgroundColor: colors.slightlyDifferentBackgroundFocused,
            borderRadius: '5px',
        }}
        >
            <ul style={{
                paddingTop: '1em',
                paddingBottom: '1em',
            }}
            >
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

function YearList({ years }: { years: number[] }): ReactNode {
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
