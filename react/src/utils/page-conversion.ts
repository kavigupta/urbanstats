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
import { UrbanStatsASTExpression, UrbanStatsASTStatement } from '../urban-stats-script/ast'
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

type TransformResult<T> = { success: true, result: T } | { success: false }

/**
 * Check if a table expression can be converted to a mapper.
 * Returns true if the expression contains a table call with at least one column.
 */
export function canConvertTableToMapper(uss: UrbanStatsASTExpression | UrbanStatsASTStatement): boolean {
    return extractFirstColumnFromTableExpression(uss) !== undefined
}

/**
 * Extract the values expression from the first column of a table call.
 * Returns the unparsed string of the values expression, or undefined if not found.
 */
function extractFirstColumnFromTableExpression(uss: UrbanStatsASTExpression | UrbanStatsASTStatement): string | undefined {
    switch (uss.type) {
        case 'customNode':
            return extractFirstColumnFromTableExpression(uss.expr)
        case 'statements':
            if (uss.result.length === 0) {
                return undefined
            }
            return extractFirstColumnFromTableExpression(uss.result[uss.result.length - 1])
        case 'condition':
            if (uss.rest.length === 0) {
                return undefined
            }
            return extractFirstColumnFromTableExpression(uss.rest[uss.rest.length - 1])
        case 'expression':
            return extractFirstColumnFromTableExpression(uss.value)
        case 'call':
        {
            const fn = uss.fn
            if (fn.type !== 'identifier' || fn.name.node !== 'table') {
                return undefined
            }
            const columnsArg = uss.args.find(arg => arg.type === 'named' && arg.name.node === 'columns')
            if (!columnsArg || columnsArg.type !== 'named' || columnsArg.value.type !== 'vectorLiteral') {
                return undefined
            }
            const columns = columnsArg.value.elements
            if (columns.length === 0) {
                return undefined
            }
            const firstColumn = columns[0]
            if (firstColumn.type !== 'call' || firstColumn.fn.type !== 'identifier' || firstColumn.fn.name.node !== 'column') {
                return undefined
            }
            const valuesArg = firstColumn.args.find(arg => arg.type === 'named' && arg.name.node === 'values')
            if (valuesArg && valuesArg.type === 'named') {
                return unparse(valuesArg.value, { simplify: true })
            }
            return undefined
        }
        default:
            return undefined
    }
}

/**
 * Transform a table AST to a mapper AST, preserving the overall structure.
 * Replaces table(columns=[column(values=X)]) with cMap(data=X, scale=linearScale(), ramp=rampUridis).
 */
function transformTableToMapperAST(uss: UrbanStatsASTStatement): TransformResult<UrbanStatsASTStatement>
function transformTableToMapperAST(uss: UrbanStatsASTExpression): TransformResult<UrbanStatsASTExpression>
function transformTableToMapperAST(uss: UrbanStatsASTExpression | UrbanStatsASTStatement): TransformResult<UrbanStatsASTExpression | UrbanStatsASTStatement>
function transformTableToMapperAST(uss: UrbanStatsASTExpression | UrbanStatsASTStatement): TransformResult<UrbanStatsASTExpression | UrbanStatsASTStatement> {
    switch (uss.type) {
        case 'customNode':
        {
            const inner = transformTableToMapperAST(uss.expr)
            if (!inner.success) return { success: false }
            return {
                success: true,
                result: {
                    ...uss,
                    expr: inner.result,
                    originalCode: unparse(inner.result),
                },
            }
        }
        case 'statements':
        {
            if (uss.result.length === 0) {
                return { success: false }
            }
            const lastIdx = uss.result.length - 1
            const lastTransformed = transformTableToMapperAST(uss.result[lastIdx])
            if (!lastTransformed.success) return { success: false }
            return {
                success: true,
                result: {
                    ...uss,
                    result: [...uss.result.slice(0, lastIdx), lastTransformed.result],
                },
            }
        }
        case 'condition':
        {
            if (uss.rest.length === 0) {
                return { success: false }
            }
            const lastIdx = uss.rest.length - 1
            const lastTransformed = transformTableToMapperAST(uss.rest[lastIdx])
            if (!lastTransformed.success) return { success: false }
            return {
                success: true,
                result: {
                    ...uss,
                    rest: [...uss.rest.slice(0, lastIdx), lastTransformed.result],
                },
            }
        }
        case 'expression':
        {
            const inner = transformTableToMapperAST(uss.value)
            if (!inner.success) return { success: false }
            return {
                success: true,
                result: {
                    ...uss,
                    value: inner.result,
                },
            }
        }
        case 'call':
        {
            const fn = uss.fn
            if (fn.type !== 'identifier' || fn.name.node !== 'table') {
                return { success: false }
            }
            const columnsArg = uss.args.find(arg => arg.type === 'named' && arg.name.node === 'columns')
            if (!columnsArg || columnsArg.type !== 'named' || columnsArg.value.type !== 'vectorLiteral') {
                return { success: false }
            }
            const columns = columnsArg.value.elements
            if (columns.length === 0) {
                return { success: false }
            }
            const firstColumn = columns[0]
            if (firstColumn.type !== 'call' || firstColumn.fn.type !== 'identifier' || firstColumn.fn.name.node !== 'column') {
                return { success: false }
            }
            const valuesArg = firstColumn.args.find(arg => arg.type === 'named' && arg.name.node === 'values')
            if (!valuesArg || valuesArg.type !== 'named') {
                return { success: false }
            }
            const dataExpr = valuesArg.value
            // Create cMap(data=dataExpr, scale=linearScale(), ramp=rampUridis)
            const cMapCall: UrbanStatsASTExpression = {
                type: 'call',
                fn: { type: 'identifier', name: { node: 'cMap', location: fn.name.location } },
                args: [
                    {
                        type: 'named',
                        name: { node: 'data', location: fn.name.location },
                        value: dataExpr,
                    },
                    {
                        type: 'named',
                        name: { node: 'scale', location: fn.name.location },
                        value: {
                            type: 'call',
                            fn: { type: 'identifier', name: { node: 'linearScale', location: fn.name.location } },
                            args: [],
                            entireLoc: uss.entireLoc,
                        },
                    },
                    {
                        type: 'named',
                        name: { node: 'ramp', location: fn.name.location },
                        value: { type: 'identifier', name: { node: 'rampUridis', location: fn.name.location } },
                    },
                ],
                entireLoc: uss.entireLoc,
            }
            return { success: true, result: cMapCall }
        }
        default:
            return { success: false }
    }
}

/**
 * Convert a table USS to a mapper USS string, preserving the AST structure.
 * Returns undefined if conversion is not possible.
 */
export function convertTableToMapper(uss: UrbanStatsASTExpression | UrbanStatsASTStatement): string | undefined {
    const result = transformTableToMapperAST(uss)
    if (!result.success) return undefined
    return unparse(result.result)
}
