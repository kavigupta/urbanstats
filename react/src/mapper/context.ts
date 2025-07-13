import statistic_variables_info from '../data/statistic_variables_info'
import { UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { Context } from '../urban-stats-script/context'
import { InterpretationError } from '../urban-stats-script/interpreter'
import { allIdentifiers } from '../urban-stats-script/parser'
import { USSDocumentedType, USSValue } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'
import { firstNonNan } from '../utils/math'

export async function mapperContext(stmts: UrbanStatsASTStatement, getVariable: (name: string) => Promise<USSValue | undefined>): Promise<Context> {
    const ctx = new Context(
        () => undefined,
        (msg, loc) => { return new InterpretationError(msg, loc) },
        defaultConstants,
        new Map(),
    )

    await addVariablesToContext(ctx, stmts, getVariable)
    return ctx
}

async function addVariablesToContext(ctx: Context, stmts: UrbanStatsASTStatement, getVariable: (name: string) => Promise<USSValue | undefined>): Promise<void> {
    const ids = allIdentifiers(stmts, ctx)

    const variables = [...statistic_variables_info.variableNames.map(v => v.varName), 'geo']

    for (const name of variables) {
        if (!ids.has(name)) {
            continue
        }
        const va = await getVariable(name)
        if (va !== undefined) {
            ctx.assignVariable(name, va)
        }
    }

    for (const content of statistic_variables_info.multiSourceVariables) {
        const [name, info] = content
        const subvars = info.individualVariables
        if (!ids.has(name)) {
            continue
        }
        const vs: (USSValue | undefined)[] = []
        for (const subvar of subvars) {
            const existing = ctx.getVariable(subvar)
            vs.push(existing ?? await getVariable(subvar))
        }
        const values = vs.map(v => v?.value as (undefined | number[]))
        if (values.some(v => v === undefined)) {
            continue
        }
        const valuesNotNull = values as number[][] // cast is fine because we checked for undefined above
        const value = valuesNotNull[0].map((_, i) => firstNonNan(valuesNotNull.map(v => v[i]))) // take first non-NaN value

        const typeInfo = defaultTypeEnvironment.get(name)!
        ctx.assignVariable(name, {
            type: typeInfo.type,
            value,
            documentation: typeInfo.documentation,
        })
    }
}

export const defaultTypeEnvironment = ((): Map<string, USSDocumentedType> => {
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
