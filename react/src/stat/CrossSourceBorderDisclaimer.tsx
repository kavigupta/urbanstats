import React, { ReactNode, useContext, useMemo } from 'react'

import { CountsByUT } from '../components/countsByArticleType'
import { useScreenshotMode } from '../components/screenshot'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { displayType, separateNumber } from '../utils/text'

import { CrossSourceBorderAlternative, CrossSourceBorderExclusion, crossSourceBorderExclusion } from './crossSourceBorder'
import { Statistic, View } from './types'

// "USA" reads as "the USA"; other country names take no article.
function withArticle(country: string): string {
    return country === 'USA' ? 'the USA' : country
}

export function CrossSourceBorderDisclaimer({ stat, view, counts, placement }: {
    stat: Statistic
    view: View
    counts: CountsByUT
    // 'header' shows it at the top when viewing the page normally; 'footnote' shows it as a
    // de-emphasized footnote in the screenshot. Each is hidden in the other's context. Note
    // this hook only flips because this component renders inside PageTemplate's
    // ScreenshotContext.Provider -- calling it in a parent of PageTemplate reads the default
    // context and never updates.
    placement: 'header' | 'footnote'
}): ReactNode {
    const colors = useColors()
    const screenshotMode = useScreenshotMode()

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

    const footnote = placement === 'footnote'

    // The footnote is for the screenshot; the header is for normal viewing.
    if (exclusion === undefined || stat.type !== 'simple' || screenshotMode !== footnote) {
        return null
    }

    const style: React.CSSProperties = footnote
        ? { marginTop: '8px', fontSize: '12px', color: colors.ordinalTextColor }
        : {
                backgroundColor: colors.slightlyDifferentBackgroundFocused,
                borderRadius: '5px',
                padding: '0.5em 1em',
                marginTop: '8px',
                fontSize: '14px',
            }

    return (
        <div style={style} data-test-id="cross-source-border-disclaimer">
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
        case 'outside-jurisdiction': {
            const country = withArticle(exclusion.statisticCountry)
            return (
                <>
                    <b>
                        {separateNumber(exclusion.excludedCount.toString())}
                        {' of the '}
                        {separateNumber(exclusion.totalCount.toString())}
                        {` ${typ} are missing from this ranking.`}
                    </b>
                    {` ${stat.statName} is only available in ${country} (and we only compute it for regions contained entirely within ${country}).`}
                    <AlternativeLink stat={stat} view={view} alternative={exclusion.alternative} />
                </>
            )
        }
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

    // No version of the page includes the missing regions; just explain why.
    if (alternative.kind === 'no-equivalent') {
        return ` ${alternative.reason}`
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
