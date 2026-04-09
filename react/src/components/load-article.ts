import { mergeMergeableRows } from '../collapse-rows/mergeable-rows'
import explanation_page from '../data/explanation_page'
import extra_stats from '../data/extra_stats'
import metadata from '../data/metadata'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import { StatGroupSettings, statIsEnabled } from '../page_template/statistic-settings'
import { findAmbiguousSourcesAll, statParents, StatName, StatPath, statPathToOrder } from '../page_template/statistic-tree'
import { assert } from '../utils/defensive'
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
    mergeable: boolean
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
    mergeable: boolean
    statval: string
    extraStat: undefined
    disclaimer: undefined
    dataCreditExplanationPage: string
}

export type ArticleRow = ArticleStatisticRow | MetadataArticleRow

const dataCreditExplanationPageByMetadataIndex = new Map<number, string>(
    metadata.displayed_metadata.map(e => [e.index, e.data_credit_explanation_page]),
)

interface StatisticCellRenderingInfoCommon {
    articleType: string
    statname: string
    unit?: UnitType
    statpath?: StatPath
    mergeable?: boolean
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

type MetadataValueKind = 'string'

const metadataValueKindByIndex = new Map<number, MetadataValueKind>(
    metadata.displayed_metadata.map(entry => [entry.index, entry.value_kind]),
)

function metadataValueFromProto(metadataProto: IMetadata): Promise<string | undefined> {
    if (metadataProto.metadataIndex === undefined || metadataProto.metadataIndex === null) {
        return Promise.resolve(undefined)
    }

    const valueKind = metadataValueKindByIndex.get(metadataProto.metadataIndex) ?? 'string'
    switch (valueKind) {
        case 'string': {
            return Promise.resolve(metadataProto.stringValue ?? undefined)
        }
    }
}

async function metadataValueByIndex(metadataProtos: IMetadata[] | null | undefined): Promise<Map<number, string>> {
    const values = new Map<number, string>()
    for (const metadataProto of metadataProtos ?? []) {
        if (metadataProto.metadataIndex === undefined || metadataProto.metadataIndex === null) {
            continue
        }

        const value = await metadataValueFromProto(metadataProto)
        if (value === undefined) {
            continue
        }
        values.set(metadataProto.metadataIndex, value)
    }
    return values
}

async function metadataRowsForArticle(article: Article, enabledMetadataPaths: StatPath[]): Promise<MetadataArticleRow[]> {
    const values = await metadataValueByIndex(article.metadata)
    return enabledMetadataPaths.flatMap((path) => {
        const parent = statParents.get(path)
        if (parent?.kind !== 'metadata' || parent.metadataIndex === undefined) {
            return []
        }
        const statval = values.get(parent.metadataIndex)
        if (statval === undefined) {
            return []
        }
        const dataCreditExplanationPage = dataCreditExplanationPageByMetadataIndex.get(parent.metadataIndex)
        assert(dataCreditExplanationPage !== undefined, `metadata index ${parent.metadataIndex} missing data_credit_explanation_page in metadata.ts`)
        return [{
            kind: 'metadata' as const,
            statpath: path,
            statname: parent.groupYearName,
            renderedStatname: parent.groupYearName,
            articleType: article.articleType,
            mergeable: parent.mergeable,
            statval,
            extraStat: undefined,
            disclaimer: undefined,
            dataCreditExplanationPage,
        }]
    })
}

async function availableMetadataPathsForArticle(article: Article): Promise<StatPath[]> {
    const values = await metadataValueByIndex(article.metadata)
    return metadataStatPathsInTreeOrder.filter((path) => {
        const parent = statParents.get(path)
        return parent?.kind === 'metadata'
            && parent.metadataIndex !== undefined
            && values.has(parent.metadataIndex)
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
        const mergeable = statParents.get(paths[i])?.mergeable ?? false

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
            mergeable,
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

export async function loadArticles(datas: Article[], counts: CountsByUT, universe: string): Promise<{
    rows: (settings: StatGroupSettings) => Promise<ArticleRow[][]>
    statPaths: StatPath[][]
}> {
    const availableRowsAll = datas.map(data => loadSingleArticle(data, counts, universe))
    const statPathsEach = []
    for (const [articleIndex, availableRows] of availableRowsAll.entries()) {
        const statPathsThis = new Set<StatPath>()
        for (const row of availableRows) {
            statPathsThis.add(row.statpath)
        }
        (await availableMetadataPathsForArticle(datas[articleIndex])).forEach((statPath) => {
            statPathsThis.add(statPath)
        })
        statPathsEach.push(Array.from(statPathsThis))
    }

    const ambiguousSourcesAll = findAmbiguousSourcesAll(statPathsEach)

    return { rows: async (settings: StatGroupSettings) => {
        const enabledMetadataPaths = metadataStatPathsInTreeOrder.filter(path => statIsEnabled(path, settings, ambiguousSourcesAll))
        const rows = []
        for (const [articleIndex, availableRows] of availableRowsAll.entries()) {
            const filteredRows = availableRows
                .filter(row => statIsEnabled(row.statpath, settings, ambiguousSourcesAll))
                // sort by order in statistics tree.
                .sort((a, b) => statPathToOrder.get(a.statpath)! - statPathToOrder.get(b.statpath)!)
            const metadataRows = await metadataRowsForArticle(datas[articleIndex], enabledMetadataPaths)
            rows.push([...filteredRows, ...metadataRows])
        }

        const rowsNothingMissing = insertMissing(rows)
        const rowsCollapsed = collapseAlternateSources(rowsNothingMissing)
        return rowsCollapsed
    }, statPaths: statPathsEach }
}

function insertMissing(rows: ArticleRow[][]): ArticleRow[][] {
    const idxs = rows.map(row => row.map(x => x.statpath))

    const emptyRowExample = new Map<StatPath, ArticleRow>()
    for (const dataI of rows.keys()) {
        for (const rowI of rows[dataI].keys()) {
            const idx = idxs[dataI][rowI]
            emptyRowExample.set(idx, JSON.parse(JSON.stringify(rows[dataI][rowI])) as typeof rows[number][number])
            for (const key of Object.keys(emptyRowExample.get(idx)!) as (keyof ArticleRow)[]) {
                if (typeof emptyRowExample.get(idx)![key] === 'number') {
                    // @ts-expect-error Typescript is fucking up this assignment
                    emptyRowExample.get(idx)![key] = NaN
                }
                else if (key === 'statval') {
                    assert(emptyRowExample.get(idx)!.kind === 'metadata', 'if statval is not a numbre, it\'s metadata')
                    emptyRowExample.get(idx)![key] = ''
                }
                else if (key === 'extraStat') {
                    emptyRowExample.get(idx)![key] = undefined
                }
            }
            emptyRowExample.get(idx)!.articleType = 'none' // doesn't matter since we are using simple mode
        }
    }

    const allIdxs = idxs.flat().filter((x, i, a) => a.indexOf(x) === i)
    // sort all_idxs in ascending order numerically
    allIdxs.sort((a, b) => statPathToOrder.get(a)! - statPathToOrder.get(b)!)

    const newRowsAll = []
    for (const dataI of rows.keys()) {
        const newRows = []
        for (const idx of allIdxs) {
            if (idxs[dataI].includes(idx)) {
                const indexToPull = idxs[dataI].findIndex(x => x === idx)
                newRows.push(rows[dataI][indexToPull])
            }
            else {
                newRows.push(emptyRowExample.get(idx)!)
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
        const statParent = statParents.get(rows[0][i].statpath)
        assert(statParent !== undefined, `stat parent not found for statpath ${rows[0][i].statpath}`)
        const { group, year, groupYearName } = statParent
        const key = `${group.id}_${year}`
        if (!rowsByStatGroupAndYear.has(key)) {
            rowsByStatGroupAndYear.set(key, [])
        }
        rowsByStatGroupAndYear.get(key)!.push(rows.map(row => row[i]))
        groupYearToName.set(key, groupYearName)
    }
    let rowsCollapsed: ArticleRow[][] = []
    for (const key of rowsByStatGroupAndYear.keys()) {
        rowsCollapsed.push(...collapseAlternateSourcesSingleGroupYear(
            rowsByStatGroupAndYear.get(key)!,
            groupYearToName.get(key)!,
        ))
    }
    rowsCollapsed = mergeMergeableRows(rowsCollapsed)
    return rowsCollapsed[0].map((_, i) => rowsCollapsed.map(row => row[i]))
}

export function isNoValue(statval: number | string): boolean {
    if (typeof statval === 'number') {
        return Number.isNaN(statval)
    }
    switch (typeof statval) {
        case 'string':
            return statval === ''
    }
}

function collapseAlternateSourcesSingleGroupYear(rows: ArticleRow[][], groupYearName: string): ArticleRow[][] {
    // rows[stat_column][article]
    if (rows.length === 1) {
        return rows
    }
    // convert to a bitmap of whether each thing has a value (alternative is nan)
    const hasValue = rows.map(row => row.map(x => !isNoValue(x.statval)))
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
        const rowsWithValues = rowsForArticle.filter(row => !isNoValue(row.statval))
        if (rowsWithValues.length > 1) {
            throw new Error(`Cannot collapse rows with ${rowsWithValues.length} values (expected <= 1)`)
        }
        const rowToUse = rowsWithValues.length > 0 ? rowsWithValues[0] : rowsForArticle[0]
        assert(rowToUse.kind === 'statistic', 'We only support collapsing statistic rows right now')
        return {
            // If we can't find any rows with values, just use the first one
            ...rowToUse,
            renderedStatname: groupYearName,
            disclaimer: 'heterogenous-sources',
        }
    })
}
