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
import { CoordBox, extendCoordBoxes, mercatorBox, partitionBoxes } from '../utils/partition-boxes'

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
 * Several universes share one canvas. Their main maps are grouped the way the comparison map groups
 * regions, and each group becomes one main map; every other inset moves with the main map it came
 * from, keeping its place relative to it.
 */
function combineInsets(universes: Universe[]): Inset[] {
    const perUniverse = universes.map(universe => insetsFor(universe).map((inset, i) => ({ ...inset, name: insets[universe][i].name })))
    const mains = perUniverse.map((universeInsets) => {
        const main = universeInsets.find(inset => inset.mainMap)
        assert(main !== undefined, 'No main map')
        return main
    })

    const grouping = partitionBoxes(mains.map(inset => inset.coordBox), mapperFillThreshold)
    const groups = grouping.map(group => ({
        coordBox: extendCoordBoxes(group.map(i => mains[i].coordBox)),
        name: group.map(i => mains[i].name).join(' + '),
    }))
    const mainMaps = layOutMainMaps(groups, extendCoordBoxes(mains.map(screenBox)))
    const groupOfUniverse = new Map(grouping.flatMap((group, g) => group.map(i => [i, g] as const)))

    const others = perUniverse.flatMap((universeInsets, u) => {
        const g = groupOfUniverse.get(u)!
        // The part of its group's map this universe covers, which is the whole map when it has one to itself
        const covers = remapBox(mercatorBox(mains[u].coordBox), mercatorBox(groups[g].coordBox), screenBox(mainMaps[g]))
        return universeInsets.filter(inset => !inset.mainMap).map(inset => ({
            ...inset,
            ...screenBounds(remapBox(screenBox(inset), screenBox(mains[u]), covers)),
        }))
    })

    return [...mainMaps, ...others]
}

/** Higher than the comparison map's, so that distant universes get maps of their own rather than an ocean between them. */
const mapperFillThreshold = 0.6

function screenBox(inset: Inset): CoordBox {
    return [...inset.bottomLeft, ...inset.topRight]
}

function screenBounds([west, south, east, north]: CoordBox): Pick<Inset, 'bottomLeft' | 'topRight'> {
    return { bottomLeft: [west, south], topRight: [east, north] }
}

function remapBox(box: CoordBox, from: CoordBox, to: CoordBox): CoordBox {
    const axis = (value: number, i: 0 | 1): number => {
        const span = from[i + 2] - from[i]
        return span === 0 ? to[i] : to[i] + (value - from[i]) / span * (to[i + 2] - to[i])
    }
    return [axis(box[0], 0), axis(box[1], 1), axis(box[2], 0), axis(box[3], 1)]
}

/** Splits the screen space the old main maps took along whichever axis the maps are more spread over. */
function layOutMainMaps(groups: { coordBox: CoordBox, name: string }[], [west, south, east, north]: CoordBox): Inset[] {
    const overall = mercatorBox(extendCoordBoxes(groups.map(group => group.coordBox)))
    const axis = overall[2] - overall[0] >= overall[3] - overall[1] ? 0 : 1
    const center = (box: CoordBox): number => {
        const projected = mercatorBox(box)
        return (projected[axis] + projected[axis + 2]) / 2
    }
    const order = groups.map((_, i) => i).sort((a, b) => center(groups[a].coordBox) - center(groups[b].coordBox))

    const laidOut: Inset[] = []
    order.forEach((group, position) => {
        const at = (offset: number): number => (position + offset) / order.length
        laidOut[group] = {
            ...screenBounds(axis === 0
                ? [west + (east - west) * at(0), south, west + (east - west) * at(1), north]
                : [west, south + (north - south) * at(0), east, south + (north - south) * at(1)]),
            coordBox: groups[group].coordBox,
            mainMap: true,
            name: groups[group].name,
        }
    })
    return laidOut
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
