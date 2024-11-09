import { StatGroupSettings, statIsEnabled } from '../page_template/statistic-settings'
import { StatPath, statPathToOrder } from '../page_template/statistic-tree'
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

export interface ArticleRow {
    statval: number
    ordinal: number
    overallOrdinal: number
    percentile_by_population: number
    statcol: string | string[]
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

export function for_type(universe: string, statcol: string | string[], typ: string): number {
    const statnames = require('../data/statistic_list.json') as (string | string[])[]
    const idx = statnames.indexOf(statcol) // Works because `require` is global
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

export function load_article(universe: string, data: Article, settings: StatGroupSettings, exclusively_american: boolean): {
    result: readonly [ArticleRow[], number[]]
    availableStatPaths: StatPath[]
} {
    // index of universe in data.universes
    const universe_index = data.universes.indexOf(universe)
    const article_type = data.articleType

    const names = require('../data/statistic_name_list.json') as string[]
    const paths = require('../data/statistic_path_list.json') as StatPath[]
    const stats = require('../data/statistic_list.json') as (string | string[])[]
    const explanation_page = require('../data/explanation_page.json') as string[]

    const extra_stats = require('../data/extra_stats.json') as [number, ExtraStatSpec][]
    const extra_stat_idx_to_col = extra_stats.map(xy => xy[0])

    const indices = compute_indices(data.longname, article_type)

    const modified_rows: ArticleRow[] = data.rows.map((row_original, row_index) => {
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
            if (index_list_info.index_lists.gpw.includes(indices[row._index])) {
                return false
            }
        }
        else {
            if (index_list_info.index_lists.usa.includes(indices[row._index])) {
                return false
            }
        }
        return true
    })
    const filtered_rows = availableRows.filter(row => statIsEnabled(row.statpath, settings))
        // sort by order in statistics tree.
        .sort((a, b) => statPathToOrder.get(a.statpath)! - statPathToOrder.get(b.statpath)!)

    const filtered_indices = filtered_rows.map(x => x._index)

    return {
        result: [filtered_rows, filtered_indices] as const,
        availableStatPaths: availableRows.map(row => row.statpath),
    }
}

export function render_statname(statindex: number, statname: string, exclusively_american: boolean): string {
    const usa_stat = index_list_info.index_lists.usa.includes(statindex)
    if (!exclusively_american && usa_stat) {
        // TODO I think we can probably remove this check
        return `${statname} (USA only)`
    }
    return statname
}
