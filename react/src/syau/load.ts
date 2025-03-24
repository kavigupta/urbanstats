import { CountsByUT } from '../components/countsByArticleType'
import { forType } from '../components/load-article'
import { loadProtobuf, loadStatisticsPage } from '../load_json'
import { centroidsPath } from '../navigation/links'
import { Statistic, allGroups } from '../page_template/statistic-tree'
import { ICoordinate, IDataList } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

export const populationStatcols: Statistic[] = allGroups.find(g => g.id === 'population')!.contents.find(g => g.year === 2020)!.stats[0].bySource

const suffixFreqThresholdPct = 0.01
const suffixFreqThresholdRaw = 3

type MatchChunks = string[]

export interface SYAUData {
    longnames: string[]
    commonSuffixes: string[]
    matchChunks: MatchChunks[]
    populations: number[]
    longnameToIndex: Record<string, number>
    centroids: ICoordinate[]
}

function computeMatchChunks(longname: string): MatchChunks {
    longname = longname.toLowerCase()
    // split longname by comma and take the first part
    longname = longname.split(',')[0]
    // remove portions in parentheses and brackets
    longname = longname.replace(/\(.*\)/g, '')
    longname = longname.replace(/\[.*\]/g, '')
    // split longname by -
    const longnameParts = longname.split('-').map(s => s.trim())
    // check if query is equal to any part of the longname
    return longnameParts
}

function suffixes(s: string): string[] {
    // all suffixes of a string s; they must all begin with a space
    const sxs = []
    for (let i = 0; i < s.length; i++) {
        if (s[i] === ' ')
            sxs.push(s.slice(i))
    }
    return sxs
}

function removeSuffix(s: string, sxs: string[]): string {
    for (const suffix of sxs) {
        if (s.endsWith(suffix))
            return s.slice(0, s.length - suffix.length)
    }
    return s
}

function computeMatchChunksAll(longnames: string[]): [string[], MatchChunks[]] {
    const chunksAll = longnames.map(computeMatchChunks)
    const chunksFlat = chunksAll.flat()
    const suffixCount = new Map<string, number>()
    for (const chunk of chunksFlat) {
        for (const suffix of suffixes(chunk)) {
            suffixCount.set(suffix, (suffixCount.get(suffix) ?? 0) + 1)
        }
    }
    // list of suffixes that appear in at least 5% of flat chunks
    const commonSuffixes = Array.from(suffixCount.entries())
        .filter(([, count]) => count >= suffixFreqThresholdRaw && count >= suffixFreqThresholdPct * chunksFlat.length)
        .map(([suffix]) => suffix)
    // sort them by length, long to short
    commonSuffixes.sort((a, b) => b.length - a.length)
    const chunksAllCleaned = chunksAll.map(chunks => chunks.map(chunk => removeSuffix(chunk, commonSuffixes)))
    return [commonSuffixes.reverse(), chunksAllCleaned]
}

export function confirmMatch(target: MatchChunks, query: string): boolean {
    return target.includes(query.toLowerCase())
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
    console.log(statPath)
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
    const values = articleNames.map(name => articleNameToValue.get(name)!)

    const centroids = await loadCentroids(universe, typ, articleNames)

    const [commonSuffixes, matchChunks] = computeMatchChunksAll(articleNames)

    console.log(values)

    return {
        longnames: articleNames,
        commonSuffixes,
        matchChunks,
        populations: values,
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
