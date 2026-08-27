import explanation_page from '../data/explanation_page'
import statistic_name_list from '../data/statistic_name_list'
import statistic_variables_info from '../data/statistic_variables_info'
import { defaultTypeEnvironment } from '../mapper/context'
import { attemptParseAsTopLevel, MapUSS, mapUSSFromString } from '../mapper/settings/map-uss'
import type { PageDescriptor } from '../navigation/PageDescriptor'
import { StatName } from '../page_template/statistic-tree'
import { Universe } from '../universe'
import { orderNonNan, Table, tableType } from '../urban-stats-script/constants/table'
import { deriveTableColumnLabel, deriveTableLabel, tableLabel } from '../urban-stats-script/derive-human-readable-name'
import { deriveTableColumnUnit } from '../urban-stats-script/derive-unit'
import { unparse } from '../urban-stats-script/parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'
import { reifyString } from '../utils/human-readable-name'
import { unitTypeToStoredUnit } from '../utils/unit'

import { StatData, Statistic, StatSettings, View } from './types'

export function pageDescriptor({ stat, view }: StatSettings): PageDescriptor & { kind: 'statistic' } {
    return {
        kind: 'statistic',
        article_type: stat.articleType,
        start: view.start,
        amount: view.amount,
        order: view.order,
        highlight: view.highlight,
        universe: stat.universe === 'world' ? undefined : stat.universe,
        edit: view.edit,
        sort_column: view.sortColumn,
        // Needs `undefined` since used with `Navigator.unsafeUpdateCurrentDescriptor`
        ...(stat.type === 'uss' ? { uss: unparse(stat.uss), statname: undefined } : { statname: stat.statName, uss: undefined }),
    }
}

/** @public this is included dynamically */
export function parseStatUSS(uss: string, universe: Universe): MapUSS {
    return attemptParseAsTopLevel(mapUSSFromString(uss), defaultTypeEnvironment(universe), true, [tableType])
}

/** @public this is included dynamically */
export function tableTitle(uss: MapUSS, universe: Universe): string | undefined {
    const label = tableLabel(uss, defaultTypeEnvironment(universe))
    return label === undefined ? undefined : reifyString(label, {})
}

/** What a table is titled before it runs, the way `mapPageTitle` titles a map. */
export function statPageTitle(stat: Statistic): string {
    if (stat.type === 'simple') {
        return stat.statName
    }
    return tableTitle(stat.uss, stat.universe) ?? 'Urban Stats: Custom Table'
}

export function mapUSSFromStat(stat: Statistic): MapUSS {
    return stat.type === 'uss'
        ? stat.uss
        : parseStatUSS(`customNode(""); condition (true); table(columns=[column(values=${variable(stat.statName).varName})])`, stat.universe)
}

export function variable(statname: StatName): typeof statistic_variables_info['variableNames'][number] {
    const index = statistic_name_list.indexOf(statname)
    const result = statistic_variables_info.variableNames.find(v => v.index === index)
    assert(result !== undefined, `No variable name found for statistic ${statname}`)
    return result
}

/** Descending rank by value, which is the ordinal a statistic cell shows. */
function computeOrdinals(values: number[]): number[] {
    const indices: number[] = values.map((_, idx) => idx)
    indices.sort((a, b) => orderNonNan(values[b], values[a])) // descending: 1 = largest value
    const ordinals: number[] = new Array<number>(values.length)
    indices.forEach((rowIdx, rank) => {
        ordinals[rowIdx] = rank + 1
    })
    return ordinals
}

/**
 * What the panel draws, out of the table its script produced. The names and units a column or the
 * table does not state are derived from the script, and a name that cannot be derived is reported
 * through `warn`; a unit that cannot be is simply not written.
 */
export function statDataFromTable({ table, stat, mapUSS, typeEnvironment, warn }: {
    table: Table
    stat: Statistic
    mapUSS: MapUSS
    typeEnvironment: TypeEnvironment
    warn: (message: string) => void
}): StatData {
    const columns = table.columns.map((column, index) => {
        let name = column.name ?? deriveTableColumnLabel(mapUSS, typeEnvironment, index)
        if (name === undefined) {
            warn(`Name could not be derived for column ${index}, please pass name="<your name here>" to column(...)`)
            name = '[Unnamed Column]'
        }
        return {
            value: column.values,
            populationPercentile: column.populationPercentiles,
            ordinal: computeOrdinals(column.values),
            name,
            unit: column.unit === undefined
                ? deriveTableColumnUnit(mapUSS, typeEnvironment, index)
                : unitTypeToStoredUnit(column.unit),
        }
    })

    let title = table.title ?? deriveTableLabel(mapUSS, typeEnvironment, columns.map(column => column.name))
    if (title === undefined) {
        warn(`Name could not be derived for table, please pass title="<your name here>" to table(...)`)
        title = '[Unnamed Table]'
    }

    const statIndex = stat.type === 'simple' ? statistic_name_list.indexOf(stat.statName) : undefined

    return {
        table: columns,
        articleNames: table.geo,
        renderedStatname: title,
        totalCountInClass: table.columns[0].values.length,
        totalCountOverall: table.columns[0].values.length,
        hideOrdinalsPercentiles: table.hideOrdinalsPercentiles,
        explanationPage: statIndex === undefined ? undefined : explanation_page[statIndex],
    }
}

/** Every row with a value in the sorted column, in the order the panel puts them in. */
export function sortedRowIndices(data: StatData, sortColumn: View['sortColumn'], order: View['order']): number[] {
    if (data.table.length === 0) {
        return []
    }
    const sortBy = data.table[Math.max(0, Math.min(sortColumn, data.table.length - 1))]
    const indices = sortBy.value.map((_, i) => i).filter(i => !Number.isNaN(sortBy.value[i]))
    indices.sort((a, b) => order === 'ascending'
        ? orderNonNan(sortBy.value[a], sortBy.value[b])
        : orderNonNan(sortBy.value[b], sortBy.value[a]))
    return indices
}

/** The page of those rows the view is on. Short of a full page where the rows run out. */
export function pageRowIndices(sorted: number[], start: View['start'], amount: View['amount']): number[] {
    const perPage = amount === 'All' ? sorted.length : amount
    const from = start - 1
    let to = from + perPage
    if (to + perPage > sorted.length) {
        to = sorted.length
    }
    return sorted.slice(from, Math.max(from, to))
}
