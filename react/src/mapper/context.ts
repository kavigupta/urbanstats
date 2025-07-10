import statistic_variables_info from '../data/statistic_variables_info'
import { UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { Context } from '../urban-stats-script/context'
import { InterpretationError } from '../urban-stats-script/interpreter'
import { allIdentifiers } from '../urban-stats-script/parser'
import { USSDocumentedType, USSRawValue, USSValue } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'
import { firstNonNan } from '../utils/math'

import { StatisticsForGeography } from './settings/utils'

export function mapperContext(stmts: UrbanStatsASTStatement, statisticsForGeography: StatisticsForGeography, longnames: string[]): Context {
    const ctx = new Context(
        () => undefined,
        (msg, loc) => { return new InterpretationError(msg, loc) },
        defaultConstants,
        new Map(),
    )

    const annotateType = (name: string, val: USSRawValue): USSValue => {
        const typeInfo = defaultTypeEnvironment.get(name)
        assert(typeInfo !== undefined, `Type info for ${name} not found`)
        return {
            type: typeInfo.type,
            documentation: typeInfo.documentation,
            value: val,
        }
    }

    const getVariable = (name: string): USSValue | undefined => {
        if (name === 'geo') {
            return annotateType('geo', longnames)
        }
        const variableInfo = statistic_variables_info.variableNames.find(v => v.varName === name)
        if (!variableInfo) {
            return undefined
        }
        const index = variableInfo.index
        return annotateType(name, statisticsForGeography.map(stat => stat.stats[index]))
    }

    addVariablesToContext(ctx, stmts, getVariable)
    return ctx
}

function addVariablesToContext(ctx: Context, stmts: UrbanStatsASTStatement, getVariable: (name: string) => USSValue | undefined): void {
    const ids = allIdentifiers(stmts, ctx)

    const variables = [...statistic_variables_info.variableNames.map(v => v.varName), 'geo']

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
        const [name, info] = content
        const subvars = info.individualVariables
        if (!ids.has(name)) {
            return
        }
        const vs: (USSValue | undefined)[] = subvars.map((subvar) => {
            const existing = ctx.getVariable(subvar)
            return existing ?? getVariable(subvar)
        })
        const values = vs.map(v => v?.value as (undefined | number[]))
        if (values.some(v => v === undefined)) {
            return
        }
        const valuesNotNull = values as number[][] // cast is fine because we checked for undefined above
        const value = valuesNotNull[0].map((_, i) => firstNonNan(valuesNotNull.map(v => v[i]))) // take first non-NaN value

        const typeInfo = defaultTypeEnvironment.get(name)!
        ctx.assignVariable(name, {
            type: typeInfo.type,
            value,
            documentation: typeInfo.documentation,
        })
    })
} export const defaultTypeEnvironment = ((): Map<string, USSDocumentedType> => {
    const te = new Map<string, USSDocumentedType>()

    for (const [key, value] of defaultConstants) {
        te.set(key, value)
    }

    te.set('geo', {
        type: { type: 'vector', elementType: { type: 'string' } },
        documentation: { humanReadableName: 'Geography Name' },
    })

    for (const variableInfo of statistic_variables_info.variableNames) {
        const order = variableInfo.order
        te.set(variableInfo.varName, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: {
                humanReadableName: variableInfo.humanReadableName,
                priority: variableInfo.comesFromMultiSourceSet ? 1000 + order : order,
            },
        })
    }
    for (const [name, info] of statistic_variables_info.multiSourceVariables) {
        // Find the minimum priority of the individual variables (using raw order values)
        const individualPriorities = info.individualVariables.map((varName) => {
            const variableInfo = statistic_variables_info.variableNames.find(v => v.varName === varName)
            assert(variableInfo !== undefined, `Variable info for ${varName} not found`)
            return variableInfo.order
        })
        const minPriority = Math.min(...individualPriorities)

        te.set(name, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: {
                humanReadableName: info.humanReadableName,
                priority: minPriority,
            },
        })
    }

    return te
})()
