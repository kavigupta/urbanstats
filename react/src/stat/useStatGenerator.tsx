import React, { ReactNode, useCallback } from 'react'

import { CountsByUT, forType, getCountsByArticleType } from '../components/countsByArticleType'
import { CSVExportData, generateStatisticsPanelCSVData } from '../components/csv-export'
import explanation_pages from '../data/explanation_page'
import validGeographies from '../data/mapper/used_geographies'
import stats from '../data/statistic_list'
import statistic_name_list from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import { loadStatisticsPage } from '../load_json'
import { RelativeLoader } from '../navigation/loading'
import { Universe } from '../universe'
import { toStatement } from '../urban-stats-script/ast'
import { orderNonNan, TableColumnWithPopulationPercentiles } from '../urban-stats-script/constants/table'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { renderType } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { sanitize } from '../utils/paths'
import { pluralize } from '../utils/text'
import { useDebouncedResolve } from '../utils/useDebouncedResolve'

import { StatisticPanelTable } from './StatisticPanelTable'
import { StatData, Statistic } from './types'

/**
 * For next time:
 * - Bring in the stats panel UI
 * - UI props for editing
 */

const statUpdateInterval = 500

const emptyStat = ({ loading }: { loading: boolean }): ReactNode => <EmptyLayout loading={loading} />

export function useStatGenerator({ stat }: { stat: Statistic }): StatGenerator {
    const compute = useCallback((previousGenerator: Promise<StatGenerator<{ loading: boolean }>> | undefined) => makeStatGenerator({ stat, previousGenerator }), [stat])

    return useDebouncedResolve(
        compute,
        {
            interval: statUpdateInterval,
            initial: {
                ui: emptyStat,
                errors: [],
            },
            ui: (generator, loading) => ({
                ...generator,
                ui: props => generator.ui({ ...props, loading }),
            }),
        },
    )
}

export interface StatGenerator<T = unknown> {
    ui: (props: T & Omit<Parameters<typeof StatisticPanelTable>[0], 'stat' | 'data'>) => ReactNode
    exportCSV?: CSVExportData
    errors: EditorError[]
}

async function makeStatGenerator({ stat, previousGenerator }: { stat: Statistic, previousGenerator: Promise<StatGenerator<{ loading: boolean }>> | undefined }): Promise<StatGenerator<{ loading: boolean }>> {
    const errorResult = async (errors: EditorError[]): Promise<StatGenerator<{ loading: boolean }>> => {
        const prev = await previousGenerator
        return {
            ...prev,
            ui: prev?.ui ?? emptyStat,
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
        const statIndex = statistic_name_list.indexOf(stat.statName)
        const [data, articleNames] = await loadStatisticsPage(stat.universe, paths[statIndex], stat.articleType)
        const totalCountInClass = forType(counts, stat.universe, stats[statIndex], stat.articleType)
        const totalCountOverall = forType(counts, stat.universe, stats[statIndex], 'overall')

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
            statcol: stats[statIndex],
            explanationPage: explanation_pages[statIndex],
            totalCountInClass,
            totalCountOverall,
            hideOrdinalsPercentiles: false, // Statistics pages show ordinals/percentiles by default (false = show)
        }

        return {
            exportCSV: exportCSV(statData),
            errors: [],
            ui: props => <StatisticPanelTable {...props} stat={stat} data={statData} />,
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
            exportCSV: exportCSV(statData),
            errors: execErrors,
            ui: props => <StatisticPanelTable {...props} stat={stat} data={statData} />,
        }
    }
    catch (e) {
        const error: EditorError = { type: 'error', value: e instanceof Error ? e.message : 'Unknown error', location: noLocation, kind: 'error' }
        return errorResult([error])
    }
}

function EmptyLayout({ loading }: { loading: boolean }): ReactNode {
    return (
        <div style={{ position: 'relative' }}>
            <RelativeLoader loading={loading} />
        </div>
    )
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

function exportCSV(data: StatData): CSVExportData {
    return () => ({
        csvData: generateStatisticsPanelCSVData(data.articleNames, data.table, data.hideOrdinalsPercentiles),
        csvFilename: `${sanitize(data.renderedStatname)}.csv`,
    })
}
