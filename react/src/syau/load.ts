import { CountsByUT } from '../components/countsByArticleType'
import { forType } from '../components/load-article'
import { loadStatisticsPage } from '../load_json'
import { Statistic, allGroups } from '../page_template/statistic-tree'

export const populationStatcols: Statistic[] = allGroups.find(g => g.id === 'population')!.contents.find(g => g.year === 2020)!.stats[0].bySource

export interface SYAUData {
    longnames: string[]
    populations: number[]
    longnameToIndex: Record<string, number>
}

export async function loadSYAUData(
    typ: string | undefined,
    universe: string | undefined,
    counts: CountsByUT,
): Promise<SYAUData | undefined> {
    if (typ === undefined || universe === undefined) {
        return undefined
    }

    const statPath = populationColumn(counts, typ, universe)?.path
    if (statPath === undefined) {
        return undefined
    }

    const [data, articleNames] = await loadStatisticsPage(universe, statPath, typ)

    return {
        longnames: articleNames,
        populations: data.value,
        longnameToIndex: Object.fromEntries(articleNames.map((name, i) => [name, i])),
    }
}

export function populationColumn(counts: CountsByUT, typ: string, universe: string): Statistic | undefined {
    return populationStatcols.find(stat => forType(counts, universe, stat.statcol, typ) > 0)
}
