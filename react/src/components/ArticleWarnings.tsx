import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { Category, Group, useGroupsMissingYearData, useGroupsMissingYearSelection, useSelectedGroups } from '../page_template/statistic-settings'

import { useScreenshotMode } from './screenshot'

export function ArticleWarnings(): ReactNode {
    const screenshotMode = useScreenshotMode()
    const selectedGroups = useSelectedGroups()
    const groupsMissingYearSelection = useGroupsMissingYearSelection()
    const groupsMissingYearData = useGroupsMissingYearData()

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
                        No year selected for
                        {' '}
                        <b><HierarchicalName groupOrCategory={groupOrCategory} /></b>
                    </>
                )),
                ...groupsMissingYearData.flatMap(({ year, groups }) => groups.map(group => (
                    <>
                        <b><HierarchicalName groupOrCategory={group} /></b>
                        {' '}
                        is missing for the year
                        {' '}
                        <b>{year}</b>
                    </>
                ))),
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
