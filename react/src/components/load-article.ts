import explanation_page from '../data/explanation_page'
import extra_stats from '../data/extra_stats'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import { StatGroupSettings, statIsEnabled } from '../page_template/statistic-settings'
import { findAmbiguousSourcesAll, statParents, StatName, StatPath, statPathToOrder } from '../page_template/statistic-tree'
import { Article, IFirstOrLast, IMetadata } from '../utils/protos'
import { UnitType } from '../utils/unit'

import { CountsByUT, forType } from './countsByArticleType'
import { electionDisclaimerForRow, type Disclaimer } from './disclaimer-text'

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

export interface FirstLastStatus { isFirst: boolean, isLast: boolean }

export interface ArticleStatisticRow {
    kind: 'statistic'
    statname: StatName
    statval: number
    ordinal: number
    percentileByPopulation: number
    statcol: StatCol
    statpath: StatPath
    explanationPage: string
    articleType: string
    totalCountInClass: number
    totalCountOverall: number
    index: number
    renderedStatname: string
    extraStat?: ExtraStat
    disclaimer?: Disclaimer
    overallFirstLast: FirstLastStatus
}

/** Metadata shown as an extra table row (same UI pipeline as statistics). */
export interface MetadataArticleRow {
    kind: 'metadata'
    statname: string
    statpath: StatPath
    renderedStatname: string
    articleType: string
    statval: string
    extraStat: undefined
    disclaimer: undefined
}

export type ArticleRow = ArticleStatisticRow | MetadataArticleRow

interface StatisticCellRenderingInfoCommon {
    articleType: string
    statname: string
    unit?: UnitType
    statpath?: StatPath
}

interface StatisticCellRenderingInfoStatistic extends StatisticCellRenderingInfoCommon {
    kind: 'statistic'
    ordinal: number
    totalCountInClass: number
    totalCountOverall: number
    percentileByPopulation: number
    statval: number
    overallFirstLast: FirstLastStatus
}

interface StatisticCellRenderingInfoMetadata extends StatisticCellRenderingInfoCommon {
    kind: 'metadata'
    statval: string
    statpath: StatPath
}

export type StatisticCellRenderingInfo = StatisticCellRenderingInfoStatistic | StatisticCellRenderingInfoMetadata

// statParents is built in statistic-tree order (via statParentsList),
// so filtering preserves the desired UI ordering.
const metadataStatPathsInTreeOrder = Array.from(statParents.entries())
    .flatMap(([path, parent]) => parent.kind === 'metadata' ? [path] : [])

function metadataValueByIndex(metadataProtos: IMetadata[] | null | undefined): Map<number, string> {
    const values = new Map<number, string>()
    for (const metadataProto of metadataProtos ?? []) {
        if (metadataProto.metadataIndex === undefined || metadataProto.metadataIndex === null) {
            continue
        }
        if (metadataProto.stringValue === undefined || metadataProto.stringValue === null) {
            continue
        }
        values.set(metadataProto.metadataIndex, metadataProto.stringValue)
    }
    return values
}

function metadataRowsForArticle(article: Article, enabledMetadataPaths: StatPath[]): MetadataArticleRow[] {
    const values = metadataValueByIndex(article.metadata)
    return enabledMetadataPaths.flatMap((path) => {
        const parent = statParents.get(path)
        if (parent?.kind !== 'metadata' || parent.metadataIndex === undefined) {
            return []
        }
        return [{
            kind: 'metadata' as const,
            statpath: path,
            statname: parent.groupYearName,
            renderedStatname: parent.groupYearName,
            articleType: article.articleType,
            statval: values.get(parent.metadataIndex) ?? '',
            extraStat: undefined,
            disclaimer: undefined,
        }]
    })
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

function loadSingleArticle(data: Article, counts: CountsByUT, universe: string): ArticleStatisticRow[] {
    // index of universe in data.universes
    const universeIndex = data.universes.indexOf(universe)
    const articleType = data.articleType

    const extraStatIdxToCol: number[] = extra_stats.map(xy => xy[0])

    const indices = unpackBytes(data.statisticIndicesPacked)

    const overallFirstOrLast = data.overallFirstOrLast.filter((x: IFirstOrLast) => x.articleUniversesIdx === universeIndex)

    // Find population value if available
    const populationIndex = paths.indexOf('population')
    const populationRowIndex = populationIndex >= 0 ? indices.indexOf(populationIndex) : -1
    const population = populationRowIndex >= 0 && data.rows[populationRowIndex]?.statval ? data.rows[populationRowIndex].statval : null

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
        const overallFirstLastThis = overallFirstOrLast.filter((x: IFirstOrLast) => x.articleRowIdx === rowIndex)

        // Determine disclaimer for election statistics
        const disclaimer = electionDisclaimerForRow(paths[i], population)

        return {
            kind: 'statistic' as const,
            statval: rowOriginal.statval!,
            ordinal: rowOriginal.ordinalByUniverse![universeIndex],
            percentileByPopulation: rowOriginal.percentileByPopulationByUniverse![universeIndex],
            statcol: stats[i],
            statname: names[i],
            statpath: paths[i],
            explanationPage: explanation_page[i],
            articleType,
            totalCountInClass: forType(counts, universe, stats[i], articleType),
            totalCountOverall: forType(counts, universe, stats[i], 'overall'),
            index: i,
            renderedStatname: names[i],
            extraStat,
            disclaimer,
            overallFirstLast: {
                isFirst: overallFirstLastThis.some((x: IFirstOrLast) => x.isFirst),
                isLast: overallFirstLastThis.some((x: IFirstOrLast) => !x.isFirst),
            },
        } satisfies ArticleStatisticRow
    })
}

export function loadArticles(datas: Article[], counts: CountsByUT, universe: string): {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    statPaths: StatPath[][]
} {
    const availableRowsAll = datas.map(data => loadSingleArticle(data, counts, universe))
    const statPathsEach = availableRowsAll.map((availableRows) => {
        const statPathsThis = new Set<StatPath>()
        availableRows.forEach((row) => {
            statPathsThis.add(row.statpath)
        })
        metadataStatPathsInTreeOrder.forEach((statPath) => {
            statPathsThis.add(statPath)
        })
        return Array.from(statPathsThis)
    })

    const ambiguousSourcesAll = findAmbiguousSourcesAll(statPathsEach)

    return { rows: (settings: StatGroupSettings) => {
        const enabledMetadataPaths = metadataStatPathsInTreeOrder.filter(path => statIsEnabled(path, settings, ambiguousSourcesAll))
        const rows = availableRowsAll.map((availableRows, articleIndex) => [
            ...availableRows
                .filter(row => statIsEnabled(row.statpath, settings, ambiguousSourcesAll))
                // sort by order in statistics tree.
                .sort((a, b) => statPathToOrder.get(a.statpath)! - statPathToOrder.get(b.statpath)!),
            ...metadataRowsForArticle(datas[articleIndex], enabledMetadataPaths),
        ])

        const rowsNothingMissing = insertMissing(rows)
        return collapseAlternateSources(rowsNothingMissing)
    }, statPaths: statPathsEach }
}

function insertMissing(rows: ArticleRow[][]): ArticleRow[][] {
    if (rows.length === 0) {
        return rows
    }
    if (rows[0].length === 0) {
        return rows
    }

    // Compute the global set of statpaths for these enabled rows, then align each article's
    // row list to that same ordered statpath list.
    const statpathToExample = new Map<StatPath, ArticleRow>()
    for (const articleRows of rows) {
        for (const row of articleRows) {
            if (!statpathToExample.has(row.statpath)) {
                statpathToExample.set(row.statpath, row)
            }
        }
    }

    const orderedStatpaths = Array.from(statpathToExample.keys())
        .sort((a, b) => statPathToOrder.get(a)! - statPathToOrder.get(b)!)

    const emptyRowExample = new Map<StatPath, ArticleRow>()
    for (const statpath of orderedStatpaths) {
        const example = statpathToExample.get(statpath)!
        if (example.kind === 'statistic') {
            const empty = JSON.parse(JSON.stringify(example)) as ArticleStatisticRow
            for (const key of Object.keys(empty) as (keyof ArticleStatisticRow)[]) {
                if (typeof empty[key] === 'number') {
                    // @ts-expect-error -- Writing NaN into numeric fields
                    empty[key] = NaN
                }
                else if (key === 'extraStat') {
                    empty[key] = undefined
                }
            }
            empty.articleType = 'none' // doesn't matter since we are using simple mode
            emptyRowExample.set(statpath, empty)
        }
        else {
            const empty = JSON.parse(JSON.stringify(example)) as MetadataArticleRow
            empty.statval = ''
            empty.articleType = 'none' // doesn't matter since we are using simple mode
            emptyRowExample.set(statpath, empty)
        }
    }

    return rows.map((articleRows) => {
        const byStatpath = new Map(articleRows.map(row => [row.statpath, row] as const))
        return orderedStatpaths.map(statpath => byStatpath.get(statpath) ?? emptyRowExample.get(statpath)!)
    })
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
        const statpath = rows[0][i].statpath
        const { group, year, groupYearName } = statParents.get(statpath)!
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
    // Metadata rows do not participate in alternate-source collapsing.
    // Each metadata StatPath is its own group/year in the tree.
    if (rows[0][0].kind === 'metadata') {
        return rows
    }
    // convert to a bitmap of whether each thing has a value (alternative is nan)
    const statisticRows = rows as ArticleStatisticRow[][]
    const hasValue = statisticRows.map(row => row.map(x => !Number.isNaN(x.statval)))
    const rowsC: ArticleRow[][] = []
    const collapsedRows = computeCollapsedRows(new Map(hasValue.map((x, i) => [i, x])))
    for (const collapsedRow of collapsedRows) {
        rowsC.push(collapse(collapsedRow.map(i => statisticRows[i]), groupYearName))
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

function collapse(rows: ArticleStatisticRow[][], groupYearName: string): ArticleStatisticRow[] {
    // rows[stat_column][article]
    if (rows.length === 1) {
        return rows[0]
    }
    const rowsByArticle = rows[0].map((_, i) => rows.map(row => row[i]))
    return rowsByArticle.map((rowsForArticle) => {
        const rowsWithValues = rowsForArticle.filter(row => !Number.isNaN(row.statval))
        if (rowsWithValues.length > 1) {
            throw new Error(`Cannot collapse rows with ${rowsWithValues.length} values (expected <= 1)`)
        }
        return {
            // If we can't find any rows with values, just use the first one
            ...(rowsWithValues[0] ?? rowsForArticle[0]),
            renderedStatname: groupYearName,
            disclaimer: 'heterogenous-sources',
        }
    })
}
