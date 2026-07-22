import React, { ReactNode, useContext, useMemo } from 'react'

import { CountsByUT } from '../components/countsByArticleType'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { displayType, separateNumber } from '../utils/text'

import { crossSourceBorderExclusion } from './crossSourceBorder'
import { Statistic, View } from './types'

/**
 * Warns that regions straddling a data source border are missing from this ranking, and
 * points at a version of the page that includes them. Rendered alongside the page headers
 * so that it's part of the screenshot.
 */
export function CrossSourceBorderDisclaimer({ stat, view, counts }: {
    stat: Statistic
    view: View
    counts: CountsByUT
}): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const exclusion = useMemo(
        () => stat.type === 'simple'
            ? crossSourceBorderExclusion({
                statName: stat.statName,
                articleType: stat.articleType,
                universe: stat.universe,
                counts,
            })
            : undefined,
        [stat, counts],
    )

    if (exclusion === undefined || stat.type !== 'simple') {
        return null
    }

    const typ = displayType(stat.universe, stat.articleType)

    // Same page, but for a statistic or region type that covers the missing regions
    const link = (articleType: string, statname: typeof stat.statName): ReactNode => (
        <a
            style={{ color: colors.blueLink }}
            {...navContext.link({
                kind: 'statistic',
                universe: stat.universe,
                statname,
                article_type: articleType,
                start: 1,
                amount: view.amount,
                order: view.order,
                sort_column: 0,
                edit: false,
            }, { scroll: { kind: 'position', top: 0 } })}
            data-test-id="cross-source-border-link"
        >
            {statname === stat.statName ? displayType(stat.universe, articleType) : statname}
        </a>
    )

    return (
        <div
            style={{
                backgroundColor: colors.slightlyDifferentBackgroundFocused,
                borderRadius: '5px',
                padding: '0.5em 1em',
                marginTop: '8px',
                fontSize: '14px',
            }}
            data-test-id="cross-source-border-disclaimer"
        >
            <b>
                {separateNumber(exclusion.excludedCount.toString())}
                {' of the '}
                {separateNumber(exclusion.totalCount.toString())}
                {` ${typ} in ${stat.universe} are missing from this ranking.`}
            </b>
            {` ${typ} can span more than one country, and ${stat.statName} is not available for the ones that do.`}
            {exclusion.broaderVariant !== undefined
                ? (
                        <>
                            {' See '}
                            {link(stat.articleType, exclusion.broaderVariant)}
                            {' instead, which covers all of them.'}
                        </>
                    )
                : exclusion.domesticArticleType !== undefined
                    ? (
                            <>
                                {` See ${stat.statName} for `}
                                {link(exclusion.domesticArticleType, stat.statName)}
                                {' instead, which never cross a data source border.'}
                            </>
                        )
                    : null}
        </div>
    )
}
