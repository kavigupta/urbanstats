/**
 * Utility functions for converting between mapper and table pages.
 *
 * Mapper pages use expressions like: cMap(data=density_pw_1km, ...)
 * Table pages use expressions like: table(columns=[column(values=density_pw_1km)])
 *
 * This module transforms the AST to keep the structure (preamble, conditions, etc.)
 * intact and only swaps the final output expression.
 */

import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import { UrbanStatsASTExpression } from '../urban-stats-script/ast'
import { tableType } from '../urban-stats-script/constants/table'
import * as l from '../urban-stats-script/literal-parser'
import { noLocation } from '../urban-stats-script/location'
import { unparse } from '../urban-stats-script/parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'

export function mapperToTable(uss: MapUSS, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression | undefined {
    const mapSchema = mapUssParser(l.edit(l.union([
        l.transformExpr(l.call({
            fn: l.union([l.identifier('cMap'), l.identifier('pMap')]),
            namedArgs: {
                data: l.passthrough(),
                label: l.passthrough(),
                unit: l.passthrough(),
            },
            unnamedArgs: [],
        }), x => ({ data: x.namedArgs.data, label: x.namedArgs.label, unit: x.namedArgs.unit })),
        l.transformExpr(l.call({
            fn: l.identifier('cMapRGB'),
            namedArgs: {
                dataR: l.passthrough(),
                label: l.passthrough(),
                unit: l.passthrough(),
            },
            unnamedArgs: [],
        }), x => ({ data: x.namedArgs.dataR, label: x.namedArgs.label, unit: x.namedArgs.unit })),
    ])), [tableType])

    try {
        const { currentValue, edit } = mapSchema(uss, typeEnvironment)
        const { data: dataExpr, label: labelExpr, unit: unitExpr } = currentValue
        if (dataExpr === undefined) {
            return undefined
        }

        // Build column args, including name (from label) and unit if present
        const columnArgs: { type: 'named', name: { node: string, location: typeof noLocation }, value: UrbanStatsASTExpression }[] = [
            {
                type: 'named',
                name: { node: 'values', location: noLocation },
                value: dataExpr,
            },
        ]
        if (labelExpr !== undefined) {
            columnArgs.push({
                type: 'named',
                name: { node: 'name', location: noLocation },
                value: labelExpr,
            })
        }
        if (unitExpr !== undefined) {
            columnArgs.push({
                type: 'named',
                name: { node: 'unit', location: noLocation },
                value: unitExpr,
            })
        }

        return edit({
            type: 'call',
            fn: { type: 'identifier', name: { node: 'table', location: noLocation } },
            args: [{
                type: 'named',
                name: { node: 'columns', location: noLocation },
                value: {
                    type: 'vectorLiteral',
                    entireLoc: uss.entireLoc,
                    elements: [{
                        type: 'call',
                        fn: { type: 'identifier', name: { node: 'column', location: noLocation } },
                        args: columnArgs,
                        entireLoc: uss.entireLoc,
                    }],
                },
            }],
            entireLoc: uss.entireLoc,
        }) as UrbanStatsASTExpression
    }
    catch (err) {
        if (err instanceof l.LiteralParseError) {
            return undefined
        }
        else {
            throw err
        }
    }
}

/**
 * Convert a table USS to a mapper USS string, preserving the AST structure.
 * Replaces table(columns=[column(values=X)]) with cMap(data=X, scale=linearScale(), ramp=rampUridis).
 * Returns undefined if conversion is not possible.
 */
export function tableToMapper(uss: MapUSS): string | undefined {
    const mapSchema = mapUssParser(l.edit(l.transformExpr(l.call({
        fn: l.identifier('table'),
        namedArgs: {
            columns: l.transformExpr(l.vector(l.call({
                fn: l.identifier('column'),
                namedArgs: {
                    values: l.passthrough(),
                    name: l.passthrough(),
                    unit: l.passthrough(),
                },
                unnamedArgs: [],
            })), (columns) => {
                if (columns.length === 0) {
                    throw new l.LiteralParseError('table must have at least one column')
                }
                return {
                    values: columns[0].namedArgs.values,
                    name: columns[0].namedArgs.name,
                    unit: columns[0].namedArgs.unit,
                }
            }),
        },
        unnamedArgs: [],
    }), x => x.namedArgs.columns)), [tableType])

    try {
        const { currentValue, edit } = mapSchema(uss, {} as TypeEnvironment)
        const { values: dataExpr, name: nameExpr, unit: unitExpr } = currentValue
        if (dataExpr === undefined) {
            return undefined
        }
        // Use uss.entireLoc for location
        const location = uss.entireLoc
        // Build cMap args, including label (from name) and unit if present
        const cMapArgs: { type: 'named', name: { node: string, location: typeof noLocation }, value: UrbanStatsASTExpression }[] = [
            {
                type: 'named',
                name: { node: 'data', location: noLocation },
                value: dataExpr,
            },
            {
                type: 'named',
                name: { node: 'scale', location: noLocation },
                value: {
                    type: 'call',
                    fn: { type: 'identifier', name: { node: 'linearScale', location: noLocation } },
                    args: [],
                    entireLoc: location,
                },
            },
            {
                type: 'named',
                name: { node: 'ramp', location: noLocation },
                value: { type: 'identifier', name: { node: 'rampUridis', location: noLocation } },
            },
        ]
        if (nameExpr !== undefined) {
            cMapArgs.push({
                type: 'named',
                name: { node: 'label', location: noLocation },
                value: nameExpr,
            })
        }
        if (unitExpr !== undefined) {
            cMapArgs.push({
                type: 'named',
                name: { node: 'unit', location: noLocation },
                value: unitExpr,
            })
        }
        // Create cMap call
        const cMapCall: UrbanStatsASTExpression = {
            type: 'call',
            fn: { type: 'identifier', name: { node: 'cMap', location: noLocation } },
            args: cMapArgs,
            entireLoc: location,
        }
        const result = edit(cMapCall) as UrbanStatsASTExpression
        return unparse(result)
    }
    catch (err) {
        if (err instanceof l.LiteralParseError) {
            return undefined
        }
        else {
            throw err
        }
    }
}
