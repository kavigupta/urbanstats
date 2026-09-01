import { useCallback } from 'react'

import { CountsByUT, forType, getCountsByArticleType } from '../components/countsByArticleType'
import validGeographies from '../data/mapper/used_geographies'
import stats from '../data/statistic_list'
import statistic_name_list from '../data/statistic_name_list'
import universes_ordered from '../data/universes_ordered'
import { Universe } from '../universe'
import { toStatement } from '../urban-stats-script/ast'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { renderType, TypeEnvironment } from '../urban-stats-script/types-values'
import { AssignmentsResult, executeAsync } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { pluralize } from '../utils/text'
import { useDebouncedResolve } from '../utils/useDebouncedResolve'

import { StatData, Statistic } from './types'
import { mapUSSFromStat, statDataFromTable } from './utils'

const statUpdateInterval = 500

export function useStatGenerator({ stat, typeEnvironment }: { stat: Statistic, typeEnvironment: TypeEnvironment }): StatGenerator & { loading: boolean } {
    const compute = useCallback((previousGenerator: () => Promise<StatGenerator>) => makeStatGenerator({ stat, typeEnvironment, previousGenerator }), [stat, typeEnvironment])

    return useDebouncedResolve(
        compute,
        {
            interval: statUpdateInterval,
            initial: {
                data: undefined,
                errors: [],
                universesFiltered: universes_ordered,
                assignments: new Map(),
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
    universesFiltered: readonly Universe[]
    assignments: AssignmentsResult
}

async function makeStatGenerator({ stat, typeEnvironment, previousGenerator }: { stat: Statistic, typeEnvironment: TypeEnvironment, previousGenerator: () => Promise<StatGenerator> }): Promise<StatGenerator> {
    const errorResult = async (errors: EditorError[], assignments: AssignmentsResult): Promise<StatGenerator> => {
        const prev = await previousGenerator()
        return {
            ...prev,
            errors,
            assignments,
        }
    }

    const counts = await getCountsByArticleType()

    // Check if there are no geographic entities using counts before executing
    const countErrors = checkArticleCount(counts, stat.universe, stat.articleType)
    if (countErrors.length > 0) {
        return {
            ...(await previousGenerator()),
            data: undefined,
            errors: countErrors,
        }
    }

    try {
        const mapUSS = mapUSSFromStat(stat)
        const exec = await executeAsync({ descriptor: {
            kind: 'statistics',
            geographyKind: stat.articleType as (typeof validGeographies)[number], // Verified above in `checkArticleCount`
            universe: stat.universe,
        }, stmts: toStatement(mapUSS) })

        const execErrors = exec.error

        if (exec.resultingValue === undefined) {
            return await errorResult(execErrors, exec.assignments)
        }
        const res = exec.resultingValue

        assert(res.type.name === 'table', `Expected resulting value to be of type table, got ${renderType(res.type)}. This was checked earlier (hence assertion not error)`)

        const tableValue = exec.resultingValue.value
        const table = tableValue.value
        assert(table.columns.length > 0, 'Table has no columns. This was checked earlier (hence assertion not error)')

        if (table.columns.length === 0) {
            const error: EditorError = { type: 'error', value: 'Table has no columns', location: noLocation, kind: 'error' }
            const allErrors = [...execErrors, error]
            return await errorResult(allErrors, exec.assignments)
        }

        const statData = statDataFromTable({
            table,
            stat,
            mapUSS,
            typeEnvironment,
            warn: (message, location) => {
                execErrors.push({ type: 'error', kind: 'warning', value: message, location: location ?? noLocation })
            },
        })

        const statIndex = stat.type === 'simple' ? statistic_name_list.indexOf(stat.statName) : undefined

        return {
            data: statData,
            errors: execErrors,
            universesFiltered: statIndex !== undefined
                ? universes_ordered.filter(
                    universe => forType(counts, universe, stats[statIndex], stat.articleType) > 0)
                : universes_ordered,
            assignments: exec.assignments,
        }
    }
    catch (e) {
        const error: EditorError = { type: 'error', value: e instanceof Error ? e.message : 'Unknown error', location: noLocation, kind: 'error' }
        return errorResult([error], new Map())
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
