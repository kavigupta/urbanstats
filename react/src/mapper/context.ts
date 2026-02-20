import insets from '../data/insets'
import statistic_variables_info from '../data/statistic_variables_info'
import { Universe } from '../universe'
import { UrbanStatsASTExpression, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { Inset, insetNameToConstantName } from '../urban-stats-script/constants/insets'
import { Context } from '../urban-stats-script/context'
import { Effect, InterpretationError } from '../urban-stats-script/interpreter'
import { noLocation } from '../urban-stats-script/location'
import { allIdentifiers } from '../urban-stats-script/parser'
import { TypeEnvironment, USSValue } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'
import { firstNonNan } from '../utils/math'

export async function mapperContext(stmts: UrbanStatsASTStatement, getVariable: (name: string) => Promise<USSValue | undefined>, effects: Effect[], universe: Universe): Promise<Context> {
    const ctx = new Context(
        (eff) => { effects.push(eff) },
        (msg, loc) => { return new InterpretationError(msg, loc) },
        defaultConstants,
        new Map(),
    )

    await addVariablesToContext(ctx, stmts, getVariable, universe)
    return ctx
}

async function addVariablesToContext(ctx: Context, stmts: UrbanStatsASTStatement, getVariable: (name: string) => Promise<USSValue | undefined>, universe: Universe): Promise<void> {
    const dte = defaultTypeEnvironment(universe)
    const ids = allIdentifiers(stmts, ctx)

    const variables = [...statistic_variables_info.variableNames.map(v => v.varName), 'geoName', 'geo', 'geoCentroid', 'defaultInsets']

    // Some variables are always loaded, regardless of whether they are used in the statements
    // This is helpful for some operations, such as CSV export
    const forceName = (name: string): boolean => name === 'geoName'

    // Load all variables in parallel
    const variablePromises = variables
        .filter(name => ids.has(name) || forceName(name))
        .map(async (name) => {
            const va = await getVariable(name)
            if (va !== undefined) {
                ctx.assignVariable(name, va)
            }
        })

    await Promise.all(variablePromises)

    // Handle multi-source variables in parallel
    const multiSourcePromises = statistic_variables_info.multiSourceVariables
        .filter(([name]) => ids.has(name))
        .map(async ([name, info]) => {
            const subvars = info.individualVariables
            const vsPromise: Promise<USSValue | undefined>[] = []
            for (const subvar of subvars) {
                const existing = ctx.getVariable(subvar)
                if (existing !== undefined) {
                    vsPromise.push(Promise.resolve(existing))
                }
                else {
                    vsPromise.push(getVariable(subvar))
                }
            }
            const vs = await Promise.all(vsPromise)
            const values = vs.map(v => v?.value as (undefined | number[]))
            if (values.some(v => v === undefined)) {
                return
            }
            const valuesNotNull = values as number[][] // cast is fine because we checked for undefined above
            const value = valuesNotNull[0].map((_, i) => firstNonNan(valuesNotNull.map(v => v[i]))) // take first non-NaN value

            const typeInfo = dte.get(name)!
            ctx.assignVariable(name, {
                type: typeInfo.type,
                value,
                documentation: typeInfo.documentation,
            })
        })

    await Promise.all(multiSourcePromises)
}

export const defaultTypeEnvironment = (universe: Universe | undefined): TypeEnvironment => {
    const te: TypeEnvironment = new Map()

    for (const [key, value] of defaultConstants) {
        te.set(key, value)
    }

    te.set('geoName', {
        type: { type: 'vector', elementType: { type: 'string' } },
        documentation: {
            humanReadableName: 'Default Universe Geography Names',
            category: 'mapper',
            longDescription: 'A vector containing the names of geographic units for the current universe. Each element represents a geographic unit (e.g., census block, county) and can be used for labeling and identification purposes in mapping and spatial analysis.',
            includedInOutputContext: true,
        },
    })

    te.set('geo', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } },
        documentation: {
            humanReadableName: 'Default Universe Geography',
            category: 'map',
            longDescription: 'A vector containing geographic feature handles for the current universe. Each element represents a geographic unit (e.g., census block, county) that can be used for mapping and spatial analysis.',
        },
    })

    te.set('geoCentroid', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoCentroidHandle' } },
        documentation: {
            humanReadableName: 'Default Universe Geography (Centroids)',
            category: 'mapper',
            longDescription: 'A vector containing geographic centroid handles for the current universe. Each element represents the center point of a geographic unit, useful for point-based visualizations and distance calculations.',
        },
    })

    te.set('defaultInsets', {
        type: { type: 'opaque', name: 'insets' },
        documentation: {
            humanReadableName: 'Default Insets',
            category: 'mapper',
            longDescription: 'Predefined map inset configurations for the current universe (whatever that is). E.g., for the US, it would be the continental US, Alaska, Hawaii, Puerto Rico, and Guam.',
            equivalentExpressions: universe !== undefined ? [loadInsetExpression(universe)] : [],
            selectorRendering: { kind: 'subtitleLongDescription' },
        },
    })

    for (const variableInfo of statistic_variables_info.variableNames) {
        const order = variableInfo.order
        te.set(variableInfo.varName, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: {
                humanReadableName: variableInfo.humanReadableName,
                priority: variableInfo.comesFromMultiSourceSet ? 1000 + order : order,
                category: 'mapper',
                longDescription: `Data from ${variableInfo.humanReadableName}`,
                documentationTable: 'mapper-data-variables',
                includedInOutputContext: true,
                fromStatisticColumn: true,
                deprecated: (variableInfo as { deprecated: string | null }).deprecated ?? undefined,
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
                category: 'mapper',
                longDescription: `Data from ${info.humanReadableName} (from whatever source is most reliable)`,
                documentationTable: 'mapper-data-variables',
                isDefault: name === 'density_pw_1km',
                selectorRendering: { kind: 'subtitleLongDescription' },
                includedInOutputContext: true,
                fromStatisticColumn: true,
            },
        })
    }

    return te
}

export function loadInsets(universe: Universe): Inset[] {
    const insetsU = insets[universe]
    assert(insetsU.length > 0, `No insets for universe ${universe}`)
    assert(insetsU[0].mainMap, `No main map for universe ${universe}`)
    const insetsProc = insetsU.map((inset) => {
        return {
            bottomLeft: [inset.bottomLeft[0], inset.bottomLeft[1]],
            topRight: [inset.topRight[0], inset.topRight[1]],
            // copy to get rid of readonly
            coordBox: [...inset.coordBox],
            mainMap: inset.mainMap,
        } satisfies Inset
    })
    return insetsProc
}

export function loadInsetExpression(universe: Universe): UrbanStatsASTExpression {
    const insetsU = insets[universe]
    const names = insetsU.map(x => x.name)

    const exprs = names.map((name) => {
        const expr = insetNameToConstantName.get(name)
        assert(expr !== undefined, `No inset constant for ${name}`)
        return { type: 'identifier', name: { node: expr, location: noLocation } } satisfies UrbanStatsASTExpression
    })

    return {
        type: 'call',
        fn: { type: 'identifier', name: { node: 'constructInsets', location: noLocation } },
        args: [{
            type: 'unnamed',
            value: {
                type: 'vectorLiteral',
                elements: exprs,
                entireLoc: noLocation,
            } satisfies UrbanStatsASTExpression,
        }],
        entireLoc: noLocation,
    } satisfies UrbanStatsASTExpression
}
