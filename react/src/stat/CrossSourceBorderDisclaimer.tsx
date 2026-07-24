import React, { ReactNode, useContext, useMemo } from 'react'

import { CountsByUT } from '../components/countsByArticleType'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { displayType, separateNumber } from '../utils/text'

import { CrossSourceBorderAlternative, CrossSourceBorderExclusion, crossSourceBorderExclusion } from './crossSourceBorder'
import { Statistic, View } from './types'

// "USA" reads as "the USA"; other country names take no article.
function withArticle(country: string): string {
    return country === 'USA' ? 'the USA' : country
}

/**
 * Warns that some regions are missing from this ranking -- because the geography is
 * country-specific, or because a single-country statistic drops the regions outside its
 * country -- and where a version that includes them exists, links to it. Rendered alongside
 * the page headers so that it's part of the screenshot.
 */
export function CrossSourceBorderDisclaimer({ stat, view, counts }: {
    stat: Statistic
    view: View
    counts: CountsByUT
}): ReactNode {
    const colors = useColors()

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
            <DisclaimerContents stat={stat} view={view} exclusion={exclusion} />
        </div>
    )
}

function DisclaimerContents({ stat, view, exclusion }: {
    stat: Statistic & { type: 'simple' }
    view: View
    exclusion: CrossSourceBorderExclusion
}): ReactNode {
    const typ = displayType(stat.universe, stat.articleType)

    switch (exclusion.kind) {
        case 'geography-limited-to-country':
            return `${typ} are only defined in ${withArticle(exclusion.geographyCountry)}; regions elsewhere are not included in this ranking.`
        case 'straddles-border':
            return (
                <>
                    <b>
                        {separateNumber(exclusion.excludedCount.toString())}
                        {' of the '}
                        {separateNumber(exclusion.totalCount.toString())}
                        {` ${typ} in ${stat.universe} are missing from this ranking.`}
                    </b>
                    {` ${typ} can span more than one country, and ${stat.statName} is not available for the ones that do.`}
                    <AlternativeLink stat={stat} view={view} alternative={exclusion.alternative} />
                </>
            )
        case 'outside-jurisdiction':
            return (
                <>
                    <b>
                        {separateNumber(exclusion.excludedCount.toString())}
                        {' of the '}
                        {separateNumber(exclusion.totalCount.toString())}
                        {` ${typ} are missing from this ranking.`}
                    </b>
                    {` ${stat.statName} is only available in ${withArticle(exclusion.statisticCountry)}.`}
                    <AlternativeLink stat={stat} view={view} alternative={exclusion.alternative} />
                </>
            )
    }
}

function AlternativeLink({ stat, view, alternative }: {
    stat: Statistic & { type: 'simple' }
    view: View
    alternative: CrossSourceBorderAlternative | undefined
}): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    if (alternative === undefined) {
        return null
    }

    // Same page, but for the statistic or region type that covers the missing regions
    const statname = alternative.kind === 'broader-source' ? alternative.statName : stat.statName
    const articleType = alternative.kind === 'domestic-type' ? alternative.articleType : stat.articleType
    const link = (
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
            {alternative.kind === 'broader-source' ? statname : displayType(stat.universe, articleType)}
        </a>
    )

    switch (alternative.kind) {
        case 'broader-source':
            return (
                <>
                    {' See '}
                    {link}
                    {' instead, which covers all of them.'}
                </>
            )
        case 'domestic-type':
            return (
                <>
                    {` See ${stat.statName} for `}
                    {link}
                    {' instead, which never cross a data source border.'}
                </>
            )
    }
}
