import { CountsByUT, forTypeByIndex, totalForType } from '../components/countsByArticleType'
import crossSourceBorderTypes from '../data/cross_source_border_types'
import statisticDataSourceCountry from '../data/statistic_data_source_country'
import statNames from '../data/statistic_name_list'
import statPaths from '../data/statistic_path_list'
import universeDataSourceCountry from '../data/universe_data_source_country'
import { multiSourceStatisticByPath, StatName } from '../page_template/statistic-tree'
import { Universe } from '../universe'

export interface CrossSourceBorderExclusion {
    excludedCount: number
    totalCount: number
    /** Same statistic from a source that covers more of the region set, if there is one. */
    broaderVariant: StatName | undefined
    /** Closest region type that never crosses a data source border, if there is one. */
    domesticArticleType: string | undefined
}

/**
 * Statistics that come from a single country's statistics agency have no value for regions
 * that span multiple countries, so those regions vanish from the statistic panel entirely.
 * Returns what's needed to disclaim that, or undefined if this page isn't affected.
 */
export function crossSourceBorderExclusion({ statName, articleType, universe, counts }: {
    statName: StatName
    articleType: string
    universe: Universe
    counts: CountsByUT
}): CrossSourceBorderExclusion | undefined {
    const alternativeTypes = crossSourceBorderTypes[articleType] as string[] | undefined
    if (alternativeTypes === undefined) {
        return undefined
    }

    const statIndex = statNames.indexOf(statName)

    // Regions can only be missing because they straddle a border if the statistic's
    // jurisdiction is the one this universe sits in. Where the two differ, the regions
    // without a value are the ones outside the statistic's country altogether.
    // TODO TODO TODO we should handle this separately.
    if (statisticDataSourceCountry[statIndex] !== (universeDataSourceCountry[universe] as string | undefined)) {
        return undefined
    }

    const totalCount = totalForType(counts, universe, articleType)
    const shownCount = forTypeByIndex(counts, universe, statIndex, articleType)
    const excludedCount = totalCount - shownCount

    // A statistic with no value anywhere in the region set isn't missing the regions that
    // straddle a border, it just isn't computed for this region type at all.
    if (shownCount === 0 || excludedCount <= 0) {
        return undefined
    }

    return {
        excludedCount,
        totalCount,
        broaderVariant: findBroaderVariant({ statIndex, shownCount, articleType, universe, counts }),
        domesticArticleType: alternativeTypes.find(typ => forTypeByIndex(counts, universe, statIndex, typ) > 0),
    }
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
