import { useCallback } from 'react'

import { CountsByUT, forType, getCountsByArticleType } from '../components/countsByArticleType'
import explanation_pages from '../data/explanation_page'
import validGeographies from '../data/mapper/used_geographies'
import stats from '../data/statistic_list'
import statistic_name_list from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import { loadStatisticsPage } from '../load_json'
import { Universe } from '../universe'
import { toStatement } from '../urban-stats-script/ast'
import { orderNonNan, TableColumnWithPopulationPercentiles } from '../urban-stats-script/constants/table'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { renderType } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { pluralize } from '../utils/text'
import { useDebouncedResolve } from '../utils/useDebouncedResolve'

import { StatData, Statistic } from './types'

/**
 * For next time:
 * - Bring in the stats panel UI
 * - UI props for editing
 */

const statUpdateInterval = 500

export function useStatGenerator({ stat }: { stat: Statistic }): StatGenerator & { loading: boolean } {
    const compute = useCallback((previousGenerator: Promise<StatGenerator>) => makeStatGenerator({ stat, previousGenerator }), [stat])

    return useDebouncedResolve(
        compute,
        {
            interval: statUpdateInterval,
            initial: {
                data: undefined,
                errors: [],
            },
            ui: (generator, loading) => ({
                ...generator,
                loading,
            }),
        },
    )
}

export interface StatGenerator {
    data: StatData | undefined
    errors: EditorError[]
}

async function makeStatGenerator({ stat, previousGenerator }: { stat: Statistic, previousGenerator: Promise<StatGenerator> }): Promise<StatGenerator> {
    const errorResult = async (errors: EditorError[]): Promise<StatGenerator> => {
        const prev = await previousGenerator
        return {
            ...prev,
            errors,
        }
    }

    const counts = await getCountsByArticleType()

    // Check if there are no geographic entities using counts before executing
    const countErrors = checkArticleCount(counts, stat.universe, stat.articleType)
    if (countErrors.length > 0) {
        return errorResult(countErrors)
    }

    if (stat.type === 'simple') {
        // TODO: Maybe just convert to USS?
        const statIndex = statistic_name_list.indexOf(stat.statName)
        const [data, articleNames] = await loadStatisticsPage(stat.universe, paths[statIndex], stat.articleType)

        const statcol = stats[statIndex]

        const totalCountInClass = forType(counts, stat.universe, statcol, stat.articleType)
        const totalCountOverall = forType(counts, stat.universe, statcol, 'overall')

        const table = [{
            value: data.value,
            populationPercentile: data.populationPercentile,
            ordinal: computeOrdinals(data.value),
            name: stat.statName,
            unit: undefined,
        }]

        const statData: StatData = {
            table,
            articleNames,
            renderedStatname: stat.statName,
            statcol,
            explanationPage: explanation_pages[statIndex],
            totalCountInClass,
            totalCountOverall,
            hideOrdinalsPercentiles: false, // Statistics pages show ordinals/percentiles by default (false = show)
        }

        return {
            data: statData,
            errors: [],
        }
    }

    try {
        const exec = await executeAsync({ descriptor: {
            kind: 'statistics',
            geographyKind: stat.articleType as (typeof validGeographies)[number], // Verified above in `checkArticleCount`
            universe: stat.universe,
        }, stmts: toStatement(stat.uss) })

        const execErrors = exec.error

        if (exec.resultingValue === undefined) {
            return await errorResult(execErrors)
        }
        const res = exec.resultingValue

        assert(res.type.name === 'table', `Expected resulting value to be of type table, got ${renderType(res.type)}. This was checked earlier (hence assertion not error)`)

        const tableValue = exec.resultingValue.value
        const table = tableValue.value
        assert(table.columns.length > 0, 'Table has no columns. This was checked earlier (hence assertion not error)')

        if (table.columns.length === 0) {
            const error: EditorError = { type: 'error', value: 'Table has no columns', location: noLocation, kind: 'error' }
            const allErrors = [...execErrors, error]
            return await errorResult(allErrors)
        }

        // Convert all columns to the data format
        const firstColumn = table.columns[0]
        const geonames = table.geo

        const dataColumns = table.columns.map((col: TableColumnWithPopulationPercentiles) => ({
            value: col.values,
            populationPercentile: col.populationPercentiles,
            ordinal: computeOrdinals(col.values),
            name: col.name,
            unit: col.unit,
        }))

        const statData: StatData = {
            table: dataColumns,
            articleNames: geonames,
            renderedStatname: table.title ?? table.columns.map(col => col.name).join(', '),
            totalCountInClass: firstColumn.values.length,
            totalCountOverall: firstColumn.values.length,
            hideOrdinalsPercentiles: table.hideOrdinalsPercentiles,
        }

        return {
            data: statData,
            errors: execErrors,
        }
    }
    catch (e) {
        const error: EditorError = { type: 'error', value: e instanceof Error ? e.message : 'Unknown error', location: noLocation, kind: 'error' }
        return errorResult([error])
    }
}

function checkArticleCount(counts: CountsByUT, universe: Universe, articleType: string): EditorError[] {
    let maxCount = 0
    for (const statcol of stats) {
        const count = forType(counts, universe, statcol, articleType)
        if (count > maxCount) {
            maxCount = count
        }
    }
    if (maxCount === 0) {
        return [{ type: 'error', value: `There are no ${pluralize(articleType)} in ${universe}. Either adjust your universe or geography kind.`, location: noLocation, kind: 'error' }]
    }
    return []
}

function computeOrdinals(values: number[]): number[] {
    const indices: number[] = values.map((_, idx) => idx)
    indices.sort((a, b) => orderNonNan(values[b], values[a])) // descending: 1 = largest value
    const ordinals: number[] = new Array<number>(values.length)
    indices.forEach((rowIdx, rank) => {
        ordinals[rowIdx] = rank + 1
    })
    return ordinals
}
