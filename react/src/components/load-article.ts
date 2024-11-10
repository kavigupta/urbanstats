import explanation_page from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import { StatGroupSettings, statIsEnabled } from '../page_template/statistic-settings'
import { statDataOrderToOrder, StatPath, statPathToOrder } from '../page_template/statistic-tree'
import { universe_is_american } from '../universe'
import { Article } from '../utils/protos'

interface HistogramExtraStatSpec {
    type: 'histogram'
    universe_total_idx: number
}

interface TimeSeriesExtraStatSpec {
    type: 'time_series'
    years: number[]
    name: string
}

type ExtraStatSpec = HistogramExtraStatSpec | TimeSeriesExtraStatSpec

export interface HistogramExtraStat {
    type: 'histogram'
    binMin: number
    binSize: number
    counts: number[]
    universe_total: number
}

export interface TimeSeriesExtraStat {
    type: 'time_series'
    name: string
    years: number[]
    time_series: number[]
}

export type ExtraStat = HistogramExtraStat | TimeSeriesExtraStat

export type StatCol = (typeof stats)[number]

export interface ArticleRow {
    statval: number
    ordinal: number
    overallOrdinal: number
    percentile_by_population: number
    statcol: StatCol
    statname: string
    statpath: StatPath
    explanation_page: string
    articleType: string
    total_count_in_class: number
    total_count_overall: number
    _index: number
    rendered_statname: string
    extra_stat?: ExtraStat
}

const index_list_info = require('../data/index_lists.json') as {
    index_lists: {
        universal: number[]
        gpw: number[]
        usa: number[]
    }
    type_to_has_gpw: Record<string, boolean>
}

function lookup_in_compressed_sequence(seq: [number, number][], idx: number): number {
    // translation of sharding.py::lookup_in_compressed_sequence
    for (const [value, length] of seq) {
        if (idx < length) {
            return value
        }
        idx -= length
    }
    throw new Error('Index out of bounds')
}

export function for_type(universe: string, statcol: StatCol, typ: string): number {
    const idx = stats.indexOf(statcol) // Works because `require` is global
    const counts_by_universe = require('../data/counts_by_article_type.json') as Record<string, Record<string, [number, number][]>>
    const counts_by_type = counts_by_universe[universe][typ]

    return lookup_in_compressed_sequence(counts_by_type, idx)
}

function compute_indices(longname: string, typ: string): number[] {
    // translation of statistic_index_lists.py::indices

    const lists = index_list_info.index_lists
    let result: number[] = []
    result = result.concat(lists.universal)
    if (index_list_info.type_to_has_gpw[typ]) {
        result = result.concat(lists.gpw)
    }
    // else {
    if (longname.endsWith(', USA') || longname === 'USA') {
        result = result.concat(lists.usa)
    }
    // sort result by numeric value
    return result.sort((a, b) => a - b)
}

export function load_single_article(data: Article, universe: string, exclusively_american: boolean): ArticleRow[] {
    // index of universe in data.universes
    const universe_index = data.universes.indexOf(universe)
    const article_type = data.articleType

    const extra_stats = require('../data/extra_stats.json') as [number, ExtraStatSpec][]
    const extra_stat_idx_to_col = extra_stats.map(xy => xy[0])

    const indices = compute_indices(data.longname, article_type)

    const modified_rows = data.rows.map((row_original, row_index) => {
        const i = indices[row_index]
        // fresh row object
        let extra_stat: ExtraStat | undefined = undefined
        if (extra_stat_idx_to_col.includes(i)) {
            const extra_stat_idx = extra_stat_idx_to_col.indexOf(i)
            const [, spec] = extra_stats[extra_stat_idx]
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this is for future proofing
            if (spec.type === 'histogram') {
                const universe_total_idx = spec.universe_total_idx
                const histogram = data.extraStats[extra_stat_idx].histogram!
                extra_stat = {
                    type: 'histogram',
                    binMin: histogram.binMin,
                    binSize: histogram.binSize,
                    counts: histogram.counts,
                    universe_total: data.rows.find((_, universe_row_index) => indices[universe_row_index] === universe_total_idx)!.statval!,
                } as HistogramExtraStat
            }
            else {
                const years = spec.years
                const name = spec.name
                const time_series = data.extraStats[extra_stat_idx].timeseries!
                extra_stat = {
                    type: 'time_series',
                    years,
                    name,
                    time_series: time_series.values!,
                } as TimeSeriesExtraStat
            }
        }
        return {
            statval: row_original.statval!,
            ordinal: row_original.ordinalByUniverse![universe_index],
            overallOrdinal: row_original.overallOrdinalByUniverse![universe_index],
            percentile_by_population: row_original.percentileByPopulationByUniverse![universe_index],
            statcol: stats[i],
            statname: names[i],
            statpath: paths[i],
            explanation_page: explanation_page[i],
            articleType: article_type,
            total_count_in_class: for_type(universe, stats[i], article_type),
            total_count_overall: for_type(universe, stats[i], 'overall'),
            _index: i,
            rendered_statname: render_statname(i, names[i], exclusively_american),
            extra_stat,
        } satisfies ArticleRow
    })

    const availableRows = modified_rows.filter((row) => {
        if (universe_is_american(universe)) {
            if (index_list_info.index_lists.gpw.includes(row._index)) {
                return false
            }
        }
        else {
            if (index_list_info.index_lists.usa.includes(row._index)) {
                return false
            }
        }
        return true
    })
    return availableRows
}

export function load_articles(datas: Article[], universe: string, settings: StatGroupSettings, exclusively_american: boolean): {
    rows: ArticleRow[][]
    statPaths: StatPath[][]
} {
    const availableRowsAll = datas.map(data => load_single_article(data, universe, exclusively_american))
    const statPathsEach = availableRowsAll.map((availableRows) => {
        const statPathsThis = new Set<StatPath>()
        availableRows.forEach((row) => {
            statPathsThis.add(row.statpath)
        })
        return Array.from(statPathsThis)
    })

    const rows = availableRowsAll.map(availableRows => availableRows
        .filter(row => statIsEnabled(row.statpath, settings))
        // sort by order in statistics tree.
        .sort((a, b) => statPathToOrder.get(a.statpath)! - statPathToOrder.get(b.statpath)!),
    )
    const rowsNothingMissing = insert_missing(rows)
    return { rows: rowsNothingMissing, statPaths: statPathsEach }
}

export function render_statname(statindex: number, statname: string, exclusively_american: boolean): string {
    const usa_stat = index_list_info.index_lists.usa.includes(statindex)
    if (!exclusively_american && usa_stat) {
        // TODO I think we can probably remove this check
        return `${statname} (USA only)`
    }
    return statname
}

function insert_missing(rows: ArticleRow[][]): ArticleRow[][] {
    const idxs = rows.map(row => row.map(x => x._index))

    const empty_row_example: Record<number, ArticleRow> = {}
    for (const data_i of rows.keys()) {
        for (const row_i of rows[data_i].keys()) {
            const idx = idxs[data_i][row_i]
            empty_row_example[idx] = JSON.parse(JSON.stringify(rows[data_i][row_i])) as typeof rows[number][number]
            for (const key of Object.keys(empty_row_example[idx]) as (keyof ArticleRow)[]) {
                if (typeof empty_row_example[idx][key] === 'number') {
                    // @ts-expect-error Typescript is fucking up this assignment
                    empty_row_example[idx][key] = NaN
                }
                else if (key === 'extra_stat') {
                    empty_row_example[idx][key] = undefined
                }
            }
            empty_row_example[idx].articleType = 'none' // doesn't matter since we are using simple mode
        }
    }

    const all_idxs = idxs.flat().filter((x, i, a) => a.indexOf(x) === i)
    // sort all_idxs in ascending order numerically
    all_idxs.sort((a, b) => statDataOrderToOrder.get(a)! - statDataOrderToOrder.get(b)!)

    const new_rows_all = []
    for (const data_i of rows.keys()) {
        const new_rows = []
        for (const idx of all_idxs) {
            if (idxs[data_i].includes(idx)) {
                const index_to_pull = idxs[data_i].findIndex(x => x === idx)
                new_rows.push(rows[data_i][index_to_pull])
            }
            else {
                new_rows.push(empty_row_example[idx])
            }
        }
        new_rows_all.push(new_rows)
    }
    return new_rows_all
}
