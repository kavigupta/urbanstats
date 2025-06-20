import statistic_variables_info from '../data/statistic_variables_info'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { Context } from '../urban-stats-script/context'
import { execute, InterpretationError } from '../urban-stats-script/interpreter'
import { allIdentifiers, locationOfLastExpression, UrbanStatsASTStatement } from '../urban-stats-script/parser'
import { USSValue } from '../urban-stats-script/types-values'
import { firstNonNan } from '../utils/math'

import { StatisticsForGeography } from './settings'

export function colorStatContext(stmts: UrbanStatsASTStatement, statisticsForGeography: StatisticsForGeography, longnames: string[] | undefined = undefined): Context {
    const ctx = new Context(
        () => undefined,
        (msg, loc) => { return new InterpretationError(msg, loc) },
        defaultConstants,
        new Map(),
    )

    const getVariable = (name: string): USSValue | undefined => {
        if (name === 'geo') {
            if (longnames === undefined) {
                return undefined
            }
            return {
                type: { type: 'vector', elementType: { type: 'string' } },
                value: longnames,
            }
        }
        const index = statistic_variables_info.variableNames.indexOf(name as ElementOf<typeof statistic_variables_info.variableNames>)
        if (index === -1) {
            return undefined
        }
        return {
            type: { type: 'vector', elementType: { type: 'number' } },
            value: statisticsForGeography.map(stat => stat.stats[index]),
        }
    }

    addVariablesToContext(ctx, stmts, getVariable)
    return ctx
}

export function colorStatExecute(stmts: UrbanStatsASTStatement, context: Context): USSValue {
    const result = execute(stmts, context)
    if (result.type.type !== 'vector' || (result.type.elementType.type !== 'number' && result.type.elementType.type !== 'boolean')) {
        throw new InterpretationError('USS expression did not return a vector of numbers or booleans:', locationOfLastExpression(stmts))
    }
    return result
}

function addVariablesToContext(ctx: Context, stmts: UrbanStatsASTStatement, getVariable: (name: string) => USSValue | undefined): void {
    const ids = allIdentifiers(stmts)

    const variables = [...statistic_variables_info.variableNames, 'geo']

    variables.forEach((name) => {
        if (!ids.has(name)) {
            return
        }
        const va = getVariable(name)
        if (va !== undefined) {
            ctx.assignVariable(name, va)
        }
    })

    statistic_variables_info.multiSourceVariables.forEach((content) => {
        const [name, subvars] = content
        if (!ids.has(name)) {
            return
        }
        const values = subvars.map((subvar) => {
            const existing = ctx.getVariable(subvar)?.value as (undefined | number[])
            return (existing ?? getVariable(subvar)?.value) as (undefined | number[])
        })
        if (values.some(v => v === undefined)) {
            return
        }
        const valuesNotNull = values as number[][] // cast is fine because we checked for undefined above
        const value = valuesNotNull[0].map((_, i) => firstNonNan(valuesNotNull.map(v => v[i]))) // take first non-NaN value
        ctx.assignVariable(name, {
            type: { type: 'vector', elementType: { type: 'number' } },
            value,
        })
    })
}
