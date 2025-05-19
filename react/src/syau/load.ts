import { CountsByUT } from '../components/countsByArticleType'
import { forType } from '../components/load-article'
import syau_suffixes from '../data/syau_suffixes'
import { loadProtobuf, loadStatisticsPage } from '../load_json'
import { centroidsPath } from '../navigation/links'
import { Statistic, allGroups } from '../page_template/statistic-tree'
import { normalize } from '../search'
import { ICoordinate } from '../utils/protos'

export const populationStatcols: Statistic[] = allGroups.find(g => g.id === 'population')!.contents.find(g => g.year === 2020)!.stats[0].bySource

type MatchChunks = string[]

export interface SYAUData {
    longnames: string[]
    matchChunks: MatchChunks[]
    populations: number[]
    populationOrdinals: number[]
    longnameToIndex: Record<string, number>
    centroids: ICoordinate[]
}

function computeMatchChunks(longname: string): MatchChunks {
    longname = normalize(longname, false)
    // split longname by comma and take the first part
    longname = longname.split(',')[0]
    // remove portions in parentheses and brackets
    longname = longname.replace(/\(.*\)/g, '')
    longname = longname.replace(/\[.*\]/g, '')
    // split longname by -
    const longnameParts = longname.split(/[-/]/).map(s => onlyKeepAlpanumeric(s).trim())
    // check if query is equal to any part of the longname
    return longnameParts
}

function removeSuffix(s: string, sxs: string[]): string {
    for (const suffix of sxs) {
        if (s.endsWith(` ${suffix}`))
            return s.slice(0, s.length - suffix.length - 1)
    }
    return s
}

function computeMatchChunksAll(longnames: string[]): MatchChunks[] {
    const chunksAll = longnames.map(computeMatchChunks)
    // list of suffixes that appear in at least 5% of flat chunks
    const commonSuffixes = syau_suffixes
    commonSuffixes.sort((a, b) => b.length - a.length)
    const chunksAllCleaned = chunksAll.map(chunks => chunks.map(chunk => removeSuffix(chunk, commonSuffixes)))
    return chunksAllCleaned
}

export function onlyKeepAlpanumeric(s: string): string {
    // remove all non-alphanumeric characters
    return s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

export function confirmMatch(target: MatchChunks, query: string): boolean {
    return target.includes(onlyKeepAlpanumeric(normalize(query)))
}

export async function loadSYAUData(
    typ: string | undefined,
    universe: string | undefined,
    counts: CountsByUT,
): Promise<SYAUData | undefined> {
    if (typ === undefined || universe === undefined) {
        return undefined
    }

    const statPath = populationColumns(counts, typ, universe).map(stat => stat.path)
    if (statPath.length === 0) {
        return undefined
    }

    const articleNameToValue = new Map<string, number>()

    for (const path of statPath) {
        const [data, articleNames] = await loadStatisticsPage(universe, path, typ)
        for (let i = 0; i < data.value.length; i++) {
            if (isNaN(data.value[i])) {
                continue
            }
            articleNameToValue.set(articleNames[i], data.value[i])
        }
    }

    const articleNames = Array.from(articleNameToValue.keys())
    articleNames.sort((a, b) => articleNameToValue.get(b)! - articleNameToValue.get(a)!)
    const values = articleNames.map(name => articleNameToValue.get(name)!)

    const centroids = await loadCentroids(universe, typ, articleNames)

    const matchChunks = computeMatchChunksAll(articleNames)

    const populationOrdinals = values.map((v, i) => [v, i] as [number, number])
        .sort((a, b) => b[0] - a[0])
        .map(([, i]) => i)
        .map((v, i) => [v, i] as [number, number])
        .sort((a, b) => a[0] - b[0])
        .map(([, i]) => i + 1)

    return {
        longnames: articleNames,
        matchChunks,
        populations: values,
        populationOrdinals,
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

export function populationColumns(counts: CountsByUT, typ: string, universe: string): Statistic[] {
    return populationStatcols.filter(stat => forType(counts, universe, stat.statcol, typ) > 0)
}
