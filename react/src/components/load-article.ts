import counts_by_article_type from '../data/counts_by_article_type'
import explanation_page from '../data/explanation_page'
import extra_stats from '../data/extra_stats'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import { StatGroupSettings, statIsEnabled } from '../page_template/statistic-settings'
import { findAmbiguousSourcesAll, statDataOrderToOrder, statParents, StatName, StatPath, statPathToOrder } from '../page_template/statistic-tree'
import { Article } from '../utils/protos'

export interface HistogramExtraStat {
    type: 'histogram'
    binMin: number
    binSize: number
    counts: number[]
    universeTotal: number
}

export interface TimeSeriesExtraStat {
    type: 'time_series'
    name: string
    years: number[]
    timeSeries: number[]
}

export type ExtraStat = HistogramExtraStat | TimeSeriesExtraStat

export type StatCol = (typeof stats)[number]

export type Disclaimer = 'heterogenous-sources'

export interface ArticleRow {
    statval: number
    ordinal: number
    overallOrdinal: number
    percentileByPopulation: number
    statcol: StatCol
    statname: StatName
    statpath: StatPath
    explanationPage: string
    articleType: string
    totalCountInClass: number
    totalCountOverall: number
    index: number
    renderedStatname: string
    extraStat?: ExtraStat
    disclaimer?: Disclaimer
}

function lookupInCompressedSequence(seq: [number, number][], idx: number): number {
    // translation of sharding.py::lookup_in_compressed_sequence
    for (const [value, length] of seq) {
        if (idx < length) {
            return value
        }
        idx -= length
    }
    throw new Error('Index out of bounds')
}

export function forType(universe: string, statcol: StatCol, typ: string): number {
    const idx = stats.indexOf(statcol) // Works because `require` is global
    if (!(universe in counts_by_article_type)) {
        return 0
    }
    if (!(typ in counts_by_article_type[universe])) {
        return 0
    }
    const countsByType = counts_by_article_type[universe][typ]

    return lookupInCompressedSequence(countsByType, idx)
}

function unpackBytes(bytes: Uint8Array): number[] {
    const result = []
    for (let i = 0; i < bytes.length; i += 1) {
        const byte = bytes[i]
        for (let j = 0; j < 8; j += 1) {
            if (byte & (1 << j)) {
                result.push(i * 8 + j)
            }
        }
    }
    return result
}

export function loadSingleArticle(data: Article, universe: string): ArticleRow[] {
    // index of universe in data.universes
    const universeIndex = data.universes.indexOf(universe)
    const articleType = data.articleType

    const extraStatIdxToCol: number[] = extra_stats.map(xy => xy[0])

    const indices = unpackBytes(data.statisticIndicesPacked)

    return data.rows.map((rowOriginal, rowIndex) => {
        const i = indices[rowIndex]
        // fresh row object
        let extraStat: ExtraStat | undefined = undefined
        if (extraStatIdxToCol.includes(i)) {
            const extraStatIdx = extraStatIdxToCol.indexOf(i)
            const [, spec] = extra_stats[extraStatIdx]
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this is for future proofing
            if (spec.type === 'histogram') {
                const universeTotalIdx = spec.universe_total_idx
                const histogram = data.extraStats[extraStatIdx].histogram!
                extraStat = {
                    type: 'histogram',
                    binMin: histogram.binMin,
                    binSize: histogram.binSize,
                    counts: histogram.counts,
                    universeTotal: data.rows.find((_, universeRowIndex) => indices[universeRowIndex] === universeTotalIdx)!.statval!,
                } as HistogramExtraStat
            }
        }
        return {
            statval: rowOriginal.statval!,
            ordinal: rowOriginal.ordinalByUniverse![universeIndex],
            overallOrdinal: rowOriginal.overallOrdinalByUniverse![universeIndex],
            percentileByPopulation: rowOriginal.percentileByPopulationByUniverse![universeIndex],
            statcol: stats[i],
            statname: names[i],
            statpath: paths[i],
            explanationPage: explanation_page[i],
            articleType,
            totalCountInClass: forType(universe, stats[i], articleType),
            totalCountOverall: forType(universe, stats[i], 'overall'),
            index: i,
            renderedStatname: names[i],
            extraStat,
        } satisfies ArticleRow
    })
}

export function loadArticles(datas: Article[], universe: string): {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    statPaths: StatPath[][]
} {
    const availableRowsAll = datas.map(data => loadSingleArticle(data, universe))
    const statPathsEach = availableRowsAll.map((availableRows) => {
        const statPathsThis = new Set<StatPath>()
        availableRows.forEach((row) => {
            statPathsThis.add(row.statpath)
        })
        return Array.from(statPathsThis)
    })

    const ambiguousSourcesAll = findAmbiguousSourcesAll(statPathsEach)

    return { rows: (settings: StatGroupSettings) => {
        const rows = availableRowsAll.map(availableRows => availableRows
            .filter(row => statIsEnabled(row.statpath, settings, ambiguousSourcesAll))
            // sort by order in statistics tree.
            .sort((a, b) => statPathToOrder.get(a.statpath)! - statPathToOrder.get(b.statpath)!),
        )
        const rowsNothingMissing = insertMissing(rows)
        const rowsCollapsed = collapseAlternateSources(rowsNothingMissing)
        return rowsCollapsed
    }, statPaths: statPathsEach }
}

function insertMissing(rows: ArticleRow[][]): ArticleRow[][] {
    const idxs = rows.map(row => row.map(x => x.index))

    const emptyRowExample: Record<number, ArticleRow> = {}
    for (const dataI of rows.keys()) {
        for (const rowI of rows[dataI].keys()) {
            const idx = idxs[dataI][rowI]
            emptyRowExample[idx] = JSON.parse(JSON.stringify(rows[dataI][rowI])) as typeof rows[number][number]
            for (const key of Object.keys(emptyRowExample[idx]) as (keyof ArticleRow)[]) {
                if (typeof emptyRowExample[idx][key] === 'number') {
                    // @ts-expect-error Typescript is fucking up this assignment
                    emptyRowExample[idx][key] = NaN
                }
                else if (key === 'extraStat') {
                    emptyRowExample[idx][key] = undefined
                }
            }
            emptyRowExample[idx].articleType = 'none' // doesn't matter since we are using simple mode
        }
    }

    const allIdxs = idxs.flat().filter((x, i, a) => a.indexOf(x) === i)
    // sort all_idxs in ascending order numerically
    allIdxs.sort((a, b) => statDataOrderToOrder.get(a)! - statDataOrderToOrder.get(b)!)

    const newRowsAll = []
    for (const dataI of rows.keys()) {
        const newRows = []
        for (const idx of allIdxs) {
            if (idxs[dataI].includes(idx)) {
                const indexToPull = idxs[dataI].findIndex(x => x === idx)
                newRows.push(rows[dataI][indexToPull])
            }
            else {
                newRows.push(emptyRowExample[idx])
            }
        }
        newRowsAll.push(newRows)
    }
    return newRowsAll
}

function collapseAlternateSources(rows: ArticleRow[][]): ArticleRow[][] {
    // collapses multiple rows if they
    // (1) have the same stat group and year
    // (2) no two rows apply to the same article
    // the set of rows must also be a set of all rows with the same stat group and year,
    // minus any rows that apply to every article
    // rows[article][stat_column]
    if (rows.length === 0) {
        return rows
    }
    const numRows = rows[0].length
    if (numRows === 0) {
        return rows
    }
    // ts Map guarantees insertion order
    // rowsByStatGroupAndYear.get(key)[stat_column][article]
    const rowsByStatGroupAndYear = new Map<string, ArticleRow[][]>()
    const groupYearToName = new Map<string, string>()
    for (let i = 0; i < numRows; i++) {
        const { group, year, groupYearName } = statParents.get(rows[0][i].statpath)!
        const key = `${group.id}_${year}`
        if (!rowsByStatGroupAndYear.has(key)) {
            rowsByStatGroupAndYear.set(key, [])
        }
        rowsByStatGroupAndYear.get(key)!.push(rows.map(row => row[i]))
        groupYearToName.set(key, groupYearName)
    }
    const rowsCollapsed: ArticleRow[][] = []
    for (const key of rowsByStatGroupAndYear.keys()) {
        rowsCollapsed.push(...collapseAlternateSourcesSingleGroupYear(
            rowsByStatGroupAndYear.get(key)!,
            groupYearToName.get(key)!,
        ))
    }
    return rowsCollapsed[0].map((_, i) => rowsCollapsed.map(row => row[i]))
}

function collapseAlternateSourcesSingleGroupYear(rows: ArticleRow[][], groupYearName: string): ArticleRow[][] {
    // rows[stat_column][article]
    if (rows.length === 1) {
        return rows
    }
    // convert to a bitmap of whether each thing has a value (alternative is nan)
    const hasValue = rows.map(row => row.map(x => !Number.isNaN(x.statval)))
    const rowsC: ArticleRow[][] = []
    const collapsedRows = computeCollapsedRows(new Map(hasValue.map((x, i) => [i, x])))
    for (const collapsedRow of collapsedRows) {
        rowsC.push(collapse(collapsedRow.map(i => rows[i]), groupYearName))
    }
    return rowsC
}

function computeCollapsedRows(hasValue: Map<number, boolean[]>): number[][] {
    /**
     * Takes the given hasValue array and computes the rows that should be collapsed
     *
     * We collapse a set of rows together if there is no overlap in the articles that have values
     * for those rows. For now, we will just greedily construct sets of rows that should be
     * collapsed together
     *
     * @param hasValue: A 2D array of booleans, where hasValue[stat_column][article]
     *  is true if the article has a value for the stat column
     *
     * @returns: A list of lists of numbers. Each list of numbers is a set of rows that should
     * be collapsed together. The numbers are the indices of the rows in the original array.
     */
    // if (hasValue.length === 0) {
    //     return []
    // }
    if (hasValue.size === 0) {
        return []
    }
    const idx = Array.from(hasValue.keys())[0]
    const byArticle = hasValue.get(idx)!
    // const lastIdx = hasValue.length - 1
    // if last stat is available in all articles, it cannot be collapsed with anything
    // same if it is not available in any article
    if (byArticle.every(x => x) || byArticle.every(x => !x)) {
        return [[idx], ...computeCollapsedRows(new Map(Array.from(hasValue).slice(1)))]
    }
    const rowIdxs = [idx]
    const covered: boolean[] = [...byArticle]
    for (const [idx2, byArticle2] of hasValue) {
        if (byArticle2.every((x, i) => !x || !covered[i])) {
            rowIdxs.push(idx2)
            for (let i = 0; i < covered.length; i++) {
                covered[i] = covered[i] || byArticle2[i]
            }
        }
    }
    const filtMap = new Map(Array.from(hasValue).filter(([idx2]) => !rowIdxs.includes(idx2)))
    return [rowIdxs, ...computeCollapsedRows(filtMap)]
}

function collapse(rows: ArticleRow[][], groupYearName: string): ArticleRow[] {
    // rows[stat_column][article]
    if (rows.length === 1) {
        return rows[0]
    }
    const rowsByArticle = rows[0].map((_, i) => rows.map(row => row[i]))
    return rowsByArticle.map((rowsForArticle) => {
        const rowsWithValues = rowsForArticle.filter(row => !Number.isNaN(row.statval))
        if (rowsWithValues.length !== 1) {
            throw new Error('Cannot collapse rows with none, or multiple, values')
        }
        // row is a copy of rowsWithValues[0]
        const row = JSON.parse(JSON.stringify(rowsWithValues[0])) as ArticleRow
        row.renderedStatname = groupYearName
        row.disclaimer = 'heterogenous-sources'
        return row
    })
}
