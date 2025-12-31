/**
 * Utility functions for converting between mapper and table pages.
 *
 * Mapper pages use expressions like: cMap(data=density_pw_1km, ...)
 * Table pages use expressions like: table(columns=[column(values=density_pw_1km)])
 *
 * This module transforms the AST to keep the structure (preamble, conditions, etc.)
 * intact and only swaps the final output expression.
 */

import { idOutput, MapUSS } from '../mapper/settings/map-uss'
import { UrbanStatsASTExpression } from '../urban-stats-script/ast'
import { tableType } from '../urban-stats-script/constants/table'
import * as l from '../urban-stats-script/literal-parser'
import { noLocation } from '../urban-stats-script/location'
import { unparse } from '../urban-stats-script/parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'

export function mapperToTable(uss: MapUSS, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression | undefined {
    const dataSchema = l.transformExpr(l.edit(l.ignore()), ({ expr }) => expr)

    const mapCallSchema = l.maybeCustomNodeExpr(l.reparse(idOutput, [tableType], l.edit(l.union([
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
    ]))))

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

/**
 * Convert a table USS to a mapper USS string, preserving the AST structure.
 * Replaces table(columns=[column(values=X)]) with cMap(data=X, scale=linearScale(), ramp=rampUridis).
 * Returns undefined if conversion is not possible.
 */
export function tableToMapper(uss: MapUSS): string | undefined {
    // Schema to match table(columns=[column(values=dataExpr)])
    // Extract the dataExpr using the same pattern as mapperToTable
    const dataSchema = l.transformExpr(l.edit(l.ignore()), ({ expr }) => expr)

    const tableCallSchema = l.transformExpr(l.call({
        fn: l.identifier('table'),
        namedArgs: {
            columns: l.transformExpr(l.vector(l.call({
                fn: l.identifier('column'),
                namedArgs: {
                    values: dataSchema,
                },
                unnamedArgs: [],
            })), (columns) => {
                if (columns.length === 0) {
                    throw new Error('table must have at least one column')
                }
                return columns[0].namedArgs.values
            }),
        },
        unnamedArgs: [],
    }), x => x.namedArgs.columns)

    const tableExprSchema = l.maybeCustomNodeExpr(l.edit(tableCallSchema))

    // Match the structure like mapperToTable does
    const tableSchema = l.transformStmt(l.statements([
        l.ignore(),
        l.condition({
            condition: l.ignore(),
            rest: [
                l.expression(tableExprSchema),
            ],
        }),
    ]), r => r[1].rest[0])

    if (uss.type !== 'statements') {
        return undefined
    }

    try {
        const { currentValue: dataExpr, edit } = tableSchema.parse(uss, {} as TypeEnvironment)
        if (dataExpr === undefined) {
            return undefined
        }
        // Use uss.entireLoc for location
        const location = uss.entireLoc
        // Create cMap call
        const cMapCall: UrbanStatsASTExpression = {
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
                        entireLoc: location,
                    },
                },
                {
                    type: 'named',
                    name: { node: 'ramp', location: noLocation },
                    value: { type: 'identifier', name: { node: 'rampUridis', location: noLocation } },
                },
            ],
            entireLoc: location,
        }
        const result = edit(cMapCall) as UrbanStatsASTExpression
        return unparse(result)
    }
    catch {
        return undefined
    }
}
