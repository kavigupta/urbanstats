import insets from '../data/insets'
import statistic_unit_list from '../data/statistic_unit_list'
import statistic_variables_info from '../data/statistic_variables_info'
import { Universe } from '../universe'
import { UrbanStatsASTExpression, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { deconstruct, Inset, insetNameToConstantName } from '../urban-stats-script/constants/insets'
import { Context } from '../urban-stats-script/context'
import { Effect, InterpretationError } from '../urban-stats-script/interpreter'
import { noLocation } from '../urban-stats-script/location'
import { allIdentifiers } from '../urban-stats-script/parser'
import { TypeEnvironment, USSValue } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'
import { firstNonNan } from '../utils/math'
import { CoordBox, extendCoordBoxes, partitionBoxes } from '../utils/partition-boxes'

export async function mapperContext(stmts: UrbanStatsASTStatement, getVariable: (name: string) => Promise<USSValue | undefined>, effects: Effect[], universes: Universe[]): Promise<Context> {
    const ctx = new Context(
        (eff) => { effects.push(eff) },
        (msg, loc) => { return new InterpretationError(msg, loc) },
        defaultConstants,
        new Map(),
    )

    await addVariablesToContext(ctx, stmts, getVariable, universes)
    return ctx
}

async function addVariablesToContext(ctx: Context, stmts: UrbanStatsASTStatement, getVariable: (name: string) => Promise<USSValue | undefined>, universes: Universe[]): Promise<void> {
    const dte = defaultTypeEnvironment(universes)
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

export const defaultTypeEnvironment = (universe: Universe | Universe[] | undefined): TypeEnvironment => {
    const universes = universe === undefined ? [] : normalizeUniverses(universe)
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
            equivalentExpressions: universes.length > 0 ? [loadInsetExpression(universes)] : [],
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
                fromStatisticColumn: true,
                deprecated: (variableInfo as { deprecated: string | null }).deprecated ?? undefined,
                unit: statistic_unit_list[variableInfo.index],
            },
        })
    }
    for (const [name, info] of statistic_variables_info.multiSourceVariables) {
        const individualInfos = info.individualVariables.map((varName) => {
            const variableInfo = statistic_variables_info.variableNames.find(v => v.varName === varName)
            assert(variableInfo !== undefined, `Variable info for ${varName} not found`)
            return variableInfo
        })
        const minPriority = Math.min(...individualInfos.map(variableInfo => variableInfo.order))

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
                fromStatisticColumn: true,
                // whichever source answers, the statistics behind it are in one unit
                unit: statistic_unit_list[individualInfos[0].index],
            },
        })
    }

    return te
}

function normalizeUniverses(universe: Universe | Universe[]): Universe[] {
    return typeof universe === 'string' ? [universe] : Array.from(new Set(universe))
}

export function loadInsets(universe: Universe | Universe[]): Inset[] {
    const universes = normalizeUniverses(universe)
    assert(universes.length > 0, 'No universes to load insets for')
    return universes.length === 1 ? insetsFor(universes[0]) : combineInsets(universes)
}

function insetsFor(universe: Universe): Inset[] {
    const insetsU = insets[universe]
    assert(insetsU.length > 0, `No insets for universe ${universe}`)
    assert(insetsU[0].mainMap, `No main map for universe ${universe}`)
    return insetsU.map((inset) => {
        return {
            bottomLeft: [inset.bottomLeft[0], inset.bottomLeft[1]],
            topRight: [inset.topRight[0], inset.topRight[1]],
            // copy to get rid of readonly
            coordBox: [...inset.coordBox],
            mainMap: inset.mainMap,
        } satisfies Inset
    })
}

/**
 * Several universes share one canvas: their main maps are grouped the way the comparison map groups
 * regions, and each group becomes one main map. Every other inset carries over as it is.
 */
function combineInsets(universes: Universe[]): Inset[] {
    const all = universes.flatMap(universe => insetsFor(universe).map((inset, i) => ({ ...inset, name: insets[universe][i].name })))
    const mains = all.filter(inset => inset.mainMap)
    const groups = partitionBoxes(mains.map(inset => inset.coordBox)).map(group => ({
        coordBox: extendCoordBoxes(group.map(i => mains[i].coordBox)),
        name: group.map(i => mains[i].name).join(' + '),
    }))
    const screenExtent = extendCoordBoxes(mains.map(inset => [...inset.bottomLeft, ...inset.topRight]))
    return [
        ...layOutMainMaps(groups, screenExtent),
        ...all.filter(inset => !inset.mainMap),
    ]
}

/** Splits the screen space the old main maps took along whichever axis the maps are more spread over. */
function layOutMainMaps(groups: { coordBox: CoordBox, name: string }[], [west, south, east, north]: CoordBox): Inset[] {
    const overall = extendCoordBoxes(groups.map(group => group.coordBox))
    const axis = overall[2] - overall[0] >= overall[3] - overall[1] ? 0 : 1
    const center = (box: CoordBox): number => (box[axis] + box[axis + 2]) / 2
    // Along x the westmost map goes leftmost; along y the northmost goes topmost, and screen y points up
    const ordered = Array.from(groups).sort((a, b) => (center(a.coordBox) - center(b.coordBox)) * (axis === 0 ? 1 : -1))
    return ordered.map((group, i) => {
        const fraction = (j: number): number => j / ordered.length
        const bottomLeft: [number, number] = axis === 0
            ? [west + (east - west) * fraction(i), south]
            : [west, north - (north - south) * fraction(i + 1)]
        const topRight: [number, number] = axis === 0
            ? [west + (east - west) * fraction(i + 1), north]
            : [east, north - (north - south) * fraction(i)]
        return { bottomLeft, topRight, coordBox: group.coordBox, mainMap: true, name: group.name }
    })
}

export function loadInsetExpression(universe: Universe | Universe[]): UrbanStatsASTExpression {
    const universes = normalizeUniverses(universe)
    const exprs = universes.length === 1
        ? insets[universes[0]].map((inset) => {
            const expr = insetNameToConstantName.get(inset.name)
            assert(expr !== undefined, `No inset constant for ${inset.name}`)
            return { type: 'identifier', name: { node: expr, location: noLocation } } satisfies UrbanStatsASTExpression
        })
        : combineInsets(universes).map(deconstruct)

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
