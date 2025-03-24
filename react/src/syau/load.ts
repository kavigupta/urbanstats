import { CountsByUT } from '../components/countsByArticleType'
import { forType } from '../components/load-article'
import { loadProtobuf, loadStatisticsPage } from '../load_json'
import { centroidsPath } from '../navigation/links'
import { Statistic, allGroups } from '../page_template/statistic-tree'
import { ICoordinate } from '../utils/protos'

export const populationStatcols: Statistic[] = allGroups.find(g => g.id === 'population')!.contents.find(g => g.year === 2020)!.stats[0].bySource

export interface SYAUData {
    longnames: string[]
    populations: number[]
    longnameToIndex: Record<string, number>
    centroids: ICoordinate[]
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

    const centroids = await loadCentroids(universe, typ, articleNames)

    return {
        longnames: articleNames,
        populations: data.value,
        longnameToIndex: Object.fromEntries(articleNames.map((name, i) => [name, i])),
        centroids,
    }
}

async function loadCentroids(universe: string, typ: string, namesInOrder: string[]): Promise<ICoordinate[]> {
    // put the results in the order of namesInOrder (currently they're in order of the sorted version)
    const result = (await loadProtobuf(centroidsPath(universe, typ), 'PointSeries')).coords
    const sortedNames = namesInOrder.slice().sort()
    const nameToIndex = new Map(sortedNames.map((name, i) => [name, i]))
    const sortedR = namesInOrder.map(name => result[nameToIndex.get(name)!])
    return sortedR
}

export function populationColumn(counts: CountsByUT, typ: string, universe: string): Statistic | undefined {
    return populationStatcols.find(stat => forType(counts, universe, stat.statcol, typ) > 0)
}
