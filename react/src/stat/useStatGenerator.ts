import { useCallback } from 'react'

import { CountsByUT, forType, getCountsByArticleType } from '../components/countsByArticleType'
import stats from '../data/statistic_list'
import statistic_name_list from '../data/statistic_name_list'
import universes_ordered from '../data/universes_ordered'
import { universesByName } from '../mapper/map-rendering'
import { dedupeGeographies } from '../mapper/settings/utils'
import { Universe } from '../universe'
import { toStatement } from '../urban-stats-script/ast'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { renderType, TypeEnvironment } from '../urban-stats-script/types-values'
import { AssignmentsResult, executeAsync, GeographySelection, useClearPreviousAssignments } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { pluralize } from '../utils/text'
import { useDebouncedResolve } from '../utils/useDebouncedResolve'

import { StatData, Statistic } from './types'
import { mapUSSFromStat, statDataFromTable } from './utils'

const statUpdateInterval = 500

export function useStatGenerator({ stat, typeEnvironment }: { stat: Statistic, typeEnvironment: TypeEnvironment }): StatGenerator & { loading: boolean } {
    const compute = useCallback((previousGenerator: () => Promise<StatGenerator>) => makeStatGenerator({ stat, typeEnvironment, previousGenerator }), [stat, typeEnvironment])

    const result: StatGenerator & { loading: boolean } = useDebouncedResolve(
        compute,
        {
            interval: statUpdateInterval,
            initial: {
                data: undefined,
                errors: [],
                universesFiltered: universes_ordered,
                universeByName: undefined,
                assignments: { variables: new Map(), blockValues: new Map() },
            },
            ui: (generator, loading) => ({
                ...generator,
                loading,
            }),
        },
    )

    useClearPreviousAssignments(result.assignments)

    return result
}

export interface StatGenerator {
    data: StatData | undefined
    errors: EditorError[]
    universesFiltered: readonly Universe[]
    /** The universe each row's geography came from. Undefined when the page has just one. */
    universeByName: Map<string, Universe> | undefined
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
    const geographies = dedupeGeographies(stat.geographies)

    // Check if there are no geographic entities using counts before executing
    const countErrors = checkArticleCount(counts, geographies)
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
            geographies,
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
            warn: (message) => {
                execErrors.push({ type: 'error', kind: 'warning', value: message, location: noLocation })
            },
        })

        const statIndex = stat.type === 'simple' ? statistic_name_list.indexOf(stat.statName) : undefined

        return {
            data: statData,
            errors: execErrors,
            universesFiltered: statIndex !== undefined
                ? universes_ordered.filter(
                    universe => forType(counts, universe, stats[statIndex], geographies[0].geographyKind) > 0)
                : universes_ordered,
            universeByName: await universeOfEachRow(geographies),
            assignments: exec.assignments,
        }
    }
    catch (e) {
        const error: EditorError = { type: 'error', value: e instanceof Error ? e.message : 'Unknown error', location: noLocation, kind: 'error' }
        return errorResult([error], { variables: new Map(), blockValues: new Map() })
    }
}

/** The generator reruns on every edit, and each rerun would otherwise load the indices again. */
let loadedUniverseByName: { key: string, universeByName: Promise<Map<string, Universe>> } | undefined

async function universeOfEachRow(geographies: GeographySelection[]): Promise<Map<string, Universe> | undefined> {
    if (geographies.length <= 1) {
        return undefined
    }
    const key = geographies.map(({ universe, geographyKind }) => `${universe}|${geographyKind}`).join(',')
    if (loadedUniverseByName?.key !== key) {
        loadedUniverseByName = { key, universeByName: universesByName(geographies) }
    }
    return await loadedUniverseByName.universeByName
}

function checkArticleCount(counts: CountsByUT, geographies: GeographySelection[]): EditorError[] {
    const error = (value: string): EditorError => ({ type: 'error', value, location: noLocation, kind: 'error' })
    if (geographies.length === 0) {
        return [error('There are no geographies to tabulate. Add one to the list above.')]
    }
    return geographies.flatMap(({ universe, geographyKind }) => {
        const populated = stats.some(statcol => forType(counts, universe, statcol, geographyKind) > 0)
        return populated ? [] : [error(`There are no ${pluralize(geographyKind)} in ${universe}. Either adjust your universe or geography kind.`)]
    })
}
