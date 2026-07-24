import { CountsByUT, forTypeByIndex, totalForType } from '../components/countsByArticleType'
import crossSourceBorderTypes from '../data/cross_source_border_types'
import geographyDataSourceCountry from '../data/geography_data_source_country'
import statisticDataSourceCountry from '../data/statistic_data_source_country'
import statNames from '../data/statistic_name_list'
import statPaths from '../data/statistic_path_list'
import universeDataSourceCountry from '../data/universe_data_source_country'
import { multiSourceStatisticByPath, StatName } from '../page_template/statistic-tree'
import { Universe } from '../universe'

export type CrossSourceBorderAlternative =
    /** The same statistic from a source that covers every region, e.g. Population [GHS-POP]. */
    | { kind: 'broader-source', statName: StatName }
    /** The closest region type that never crosses a data source border, e.g. Urban Area. */
    | { kind: 'domestic-type', articleType: string }
    /** No alternative exists, with an explanation of why (e.g. for person circles). */
    | { kind: 'no-equivalent', reason: string }

/**
 * Why some regions of the current type are missing from the ranking, tagged so the
 * component can render each case and unit tests can assert the reason directly. Ordered by
 * priority: the first matching case wins.
 */
export type CrossSourceBorderExclusion =
    /**
     * The region type itself is defined within a single country (e.g. a US city), and this
     * universe is broader, so the ranking silently shows only that country's regions.
     */
    | { kind: 'geography-limited-to-country', geographyCountry: string }
    /**
     * The statistic comes from a single country's statistics agency, this universe sits
     * inside that country, and the missing regions are the ones straddling its border.
     */
    | { kind: 'straddles-border', excludedCount: number, totalCount: number, statisticCountry: string, alternative: CrossSourceBorderAlternative | undefined }
    /**
     * The statistic comes from a single country's statistics agency and this universe is
     * broader, so the missing regions are the ones lying outside that country entirely.
     */
    | { kind: 'outside-jurisdiction', excludedCount: number, totalCount: number, statisticCountry: string, alternative: CrossSourceBorderAlternative | undefined }

export function crossSourceBorderExclusion({ statName, articleType, universe, counts }: {
    statName: StatName
    articleType: string
    universe: Universe
    counts: CountsByUT
}): CrossSourceBorderExclusion | undefined {
    const universeCountry = universeDataSourceCountry[universe] as string | undefined

    const geographyCountry = geographyDataSourceCountry[articleType] as string | undefined
    if (geographyCountry !== undefined && universeCountry !== geographyCountry) {
        return { kind: 'geography-limited-to-country', geographyCountry }
    }

    const statIndex = statNames.indexOf(statName)

    // A statistic computed the same way everywhere (no single-country source) can't be
    // missing regions because of a data source border.
    const statisticCountry = statisticDataSourceCountry[statIndex]
    if (statisticCountry === null) {
        return undefined
    }

    const totalCount = totalForType(counts, universe, articleType)
    const shownCount = forTypeByIndex(counts, universe, statIndex, articleType)
    const excludedCount = totalCount - shownCount

    // No regions, or no missing regions
    if (shownCount === 0 || excludedCount <= 0) {
        return undefined
    }

    // Defined iff the region type's regions can straddle a data source border.
    const borderInfo = crossSourceBorderTypes[articleType] as BorderInfo | undefined
    const payload = {
        excludedCount,
        totalCount,
        statisticCountry,
        alternative: computeAlternative({ statIndex, shownCount, articleType, universe, counts, borderInfo }),
    } as const

    if (universeCountry === statisticCountry) {
        // Some regions must straddle the border
        return borderInfo === undefined ? undefined : { kind: 'straddles-border', ...payload }
    }

    // Some regions must lie outside the statistic's jurisdiction
    return { kind: 'outside-jurisdiction', ...payload }
}

interface BorderInfo { alternativeGeographyTypes: string[], reasonForNoAlternatives: string | null }

function computeAlternative({ statIndex, shownCount, articleType, universe, counts, borderInfo }: {
    statIndex: number
    shownCount: number
    articleType: string
    universe: Universe
    counts: CountsByUT
    borderInfo: BorderInfo | undefined
}): CrossSourceBorderAlternative | undefined {
    const broaderVariant = findBroaderVariant({ statIndex, shownCount, articleType, universe, counts })
    if (broaderVariant !== undefined) {
        return { kind: 'broader-source', statName: broaderVariant }
    }
    const domesticArticleType = borderInfo?.alternativeGeographyTypes.find(typ => forTypeByIndex(counts, universe, statIndex, typ) > 0)
    if (domesticArticleType !== undefined) {
        return { kind: 'domestic-type', articleType: domesticArticleType }
    }
    if (borderInfo?.reasonForNoAlternatives) {
        return { kind: 'no-equivalent', reason: borderInfo.reasonForNoAlternatives }
    }
    return undefined
}

/**
 * Among the same statistic's other sources, the one covering the most of this region set,
 * as long as it covers more than the currently displayed one does.
 */
function findBroaderVariant({ statIndex, shownCount, articleType, universe, counts }: {
    statIndex: number
    shownCount: number
    articleType: string
    universe: Universe
    counts: CountsByUT
}): StatName | undefined {
    const multiSource = multiSourceStatisticByPath.get(statPaths[statIndex])
    if (multiSource === undefined) {
        return undefined
    }
    let best: { statName: StatName, count: number } | undefined
    for (const variant of multiSource.bySource) {
        if (variant.kind !== 'data') {
            continue
        }
        const variantIndex = statNames.indexOf(variant.name)
        const count = forTypeByIndex(counts, universe, variantIndex, articleType)
        if (count > shownCount && (best === undefined || count > best.count)) {
            best = { statName: variant.name, count }
        }
    }
    return best?.statName
}
