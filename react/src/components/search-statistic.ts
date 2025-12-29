import used_geographies from '../data/mapper/used_geographies'
import statistic_name_list from '../data/statistic_name_list'
import universes_ordered from '../data/universes_ordered'
import { debugPerformance } from '../search'
import { Universe } from '../universe'

import { CountsByUT, forTypeByIndex, getCountsByArticleType } from './countsByArticleType'

export interface StatisticPage {
    statisticIndex: number
    articleType: string
    universe: Universe
}

function findUniverse(counts: CountsByUT, statIdx: number, articleType: string, universes: readonly Universe[]): Universe | undefined {
    // find the last universe in the list that ties with the maximum count
    let bestUniverse = undefined
    let bestCount = 1
    for (const universe of universes) {
        const count = forTypeByIndex(counts, universe, statIdx, articleType)
        if (count >= bestCount) {
            bestCount = count
            bestUniverse = universe
        }
    }
    return bestUniverse
}

function generateStatisticStrings(counts: CountsByUT, universe: Universe | undefined): [string[], StatisticPage[]] {
    // Generate strings like "Population by Judicial District" for the given universe. If universe is undefined, try all universes
    const universes: readonly Universe[] = universe !== undefined ? [universe] : universes_ordered
    const names: string[] = []
    const pages: StatisticPage[] = []
    for (let i = 0; i < statistic_name_list.length; i++) {
        for (const articleType of used_geographies) {
            const u = findUniverse(counts, i, articleType, universes)
            if (u === undefined) {
                continue
            }
            const name = `${statistic_name_list[i]} by ${articleType}`
            names.push(name)
            pages.push({
                statisticIndex: i,
                articleType,
                universe: u,
            })
        }
    }
    return [names, pages]
}

export async function computeStatisticsPages(shouldIncludeStatisticsPages: boolean, universe: Universe | undefined): Promise<[string[], StatisticPage[]] | undefined> {
    const counts = shouldIncludeStatisticsPages ? await getCountsByArticleType() : undefined
    if (counts === undefined) {
        return undefined
    }
    const time = Date.now()
    const res = generateStatisticStrings(counts, universe)
    debugPerformance(`Generated statistic strings for universe ${universe} in ${Date.now() - time} ms`)
    return res
}
