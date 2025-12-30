/**
 * Utility functions for converting between mapper and table pages.
 *
 * Mapper pages use expressions like: cMap(data=density_pw_1km, ...)
 * Table pages use expressions like: table(columns=[column(values=density_pw_1km)])
 *
 * This module transforms the AST to keep the structure (preamble, conditions, etc.)
 * intact and only swaps the final output expression.
 */

import { idOutput, MapUSS, validMapperOutputs } from '../mapper/settings/utils'
import { UrbanStatsASTExpression } from '../urban-stats-script/ast'
import { tableType } from '../urban-stats-script/constants/table'
import * as l from '../urban-stats-script/literal-parser'
import { noLocation } from '../urban-stats-script/location'
import { unparse } from '../urban-stats-script/parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'

export function mapperToTable(uss: MapUSS, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression | undefined {
    const dataSchema = l.transformExpr(l.edit(l.ignore()), ({ expr }) => expr)

    const mapCallSchema = l.reparse(idOutput, [tableType], l.edit(l.union([
        l.transformExpr(l.call({
            fn: l.union([l.identifier('cMap'), l.identifier('pMap')]),
            namedArgs: {
                data: dataSchema,
            },
            unnamedArgs: [],
        }), x => x.namedArgs.data),
        l.transformExpr(l.call({
            fn: l.identifier('cMapRGB'),
            namedArgs: {
                dataR: dataSchema,
            },
            unnamedArgs: [],
        }), x => x.namedArgs.dataR),
    ])))

    const mapSchema = l.transformStmt(l.statements([
        l.ignore(),
        l.condition({
            condition: l.ignore(),
            rest: [
                l.expression(mapCallSchema),
            ],
        }),
    ]), r => r[1].rest[0])

    if (uss.type !== 'statements') {
        return undefined
    }

    try {
        const { currentValue: dataExpr, edit } = mapSchema.parse(uss, typeEnvironment)
        if (dataExpr === undefined) {
            return undefined
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
                        args: [{
                            type: 'named',
                            name: { node: 'values', location: noLocation },
                            value: dataExpr,
                        }],
                        entireLoc: uss.entireLoc,
                    }],
                },
            }],
            entireLoc: uss.entireLoc,
        }) as UrbanStatsASTExpression
    }
    catch {
        return undefined
    }
}

export function tableToMapper(uss: MapUSS, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression | undefined {
    const dataSchema = l.transformExpr(l.edit(l.ignore()), ({ expr }) => expr)

    const tableCallSchema = l.reparse(idOutput, validMapperOutputs, l.edit(l.transformExpr(l.call({
        fn: l.identifier('table'),
        namedArgs: {
            columns: l.vector(l.call({
                fn: l.identifier('column'),
                namedArgs: {
                    values: dataSchema,
                },
                unnamedArgs: [],
            })),
        },
        unnamedArgs: [],
    }), x => x.namedArgs.columns[0].namedArgs.values)))

    const tableSchema = l.transformStmt(l.statements([
        l.ignore(),
        l.condition({
            condition: l.ignore(),
            rest: [
                l.expression(tableCallSchema),
            ],
        }),
    ]), r => r[1].rest[0])

    if (uss.type !== 'statements') {
        return undefined
    }

    try {
        const { currentValue: dataExpr, edit } = tableSchema.parse(uss, typeEnvironment)
        if (dataExpr === undefined) {
            return undefined
        }
        return edit({
            type: 'call',
            fn: { type: 'identifier', name: { node: 'cMap', location: noLocation } },
            args: [
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
                        entireLoc: noLocation,
                    },
                },
                {
                    type: 'named',
                    name: { node: 'ramp', location: noLocation },
                    value: { type: 'identifier', name: { node: 'rampUridis', location: noLocation } },
                },
            ],
            entireLoc: noLocation,
        }) as UrbanStatsASTExpression
    }
    catch {
        return undefined
    }
}

/**
 * Check if a table expression can be converted to a mapper.
 * Requires type environment because it uses the schema-based parser.
 */
export function canConvertTableToMapper(uss: MapUSS, typeEnvironment: TypeEnvironment): boolean {
    return tableToMapper(uss, typeEnvironment) !== undefined
}

/**
 * Convert a table USS to a mapper USS string, preserving the AST structure.
 * Returns undefined if conversion is not possible.
 */
export function convertTableToMapper(uss: MapUSS, typeEnvironment: TypeEnvironment): string | undefined {
    const result = tableToMapper(uss, typeEnvironment)
    if (!result) return undefined
    return unparse(result)
}

/**
 * Check if a mapper expression can be converted to a table.
 */
export function canConvertMapperToTable(uss: MapUSS, typeEnvironment: TypeEnvironment): boolean {
    return mapperToTable(uss, typeEnvironment) !== undefined
}

/**
 * Convert a mapper USS to a table USS string, preserving the AST structure.
 * Returns undefined if conversion is not possible.
 */
export function convertMapperToTable(uss: MapUSS, typeEnvironment: TypeEnvironment): string | undefined {
    const result = mapperToTable(uss, typeEnvironment)
    if (!result) return undefined
    return unparse(result)
}
