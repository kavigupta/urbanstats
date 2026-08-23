import { UrbanStatsASTExpression, UrbanStatsASTStatement, locationOf, unify } from '../../urban-stats-script/ast'
import type { AutoUXNodeMetadata } from '../../urban-stats-script/autoux-node-metadata'
import { longMessage } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import * as l from '../../urban-stats-script/literal-parser'
import { parse, parseNoErrorAsCustomNode, unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment, USSType } from '../../urban-stats-script/types-values'

import { parseExpr } from './parseExpr'

export const rootBlockIdent = 'r'
export const idPreamble = `${rootBlockIdent}p`
export const idCondition = `${rootBlockIdent}c`
export const idOutput = `${rootBlockIdent}o`

export type PreambleCustomNode = UrbanStatsASTExpression & { type: 'customNode' }
export type PreambleAutoUXNode = UrbanStatsASTExpression & { type: 'autoUXNode', expr: PreambleCustomNode, metadata: AutoUXNodeMetadata }
export type PreambleNode = PreambleCustomNode | PreambleAutoUXNode

export type MapUSS = UrbanStatsASTExpression & { type: 'customNode' } |
    (UrbanStatsASTStatement &
    {
        type: 'statements'
        result: [
                UrbanStatsASTStatement & { type: 'expression', value: PreambleNode },
                UrbanStatsASTStatement & { type: 'condition', rest: [UrbanStatsASTStatement & { type: 'expression' }] },
        ]
    })

const cMap = { type: 'opaque', name: 'cMap', allowCustomExpression: false } satisfies USSType
const cMapRGB = { type: 'opaque', name: 'cMapRGB', allowCustomExpression: false } satisfies USSType
const pMap = { type: 'opaque', name: 'pMap', allowCustomExpression: false } satisfies USSType
const clusterMap = { type: 'opaque', name: 'clusterMap', allowCustomExpression: false } satisfies USSType

export const validMapperOutputs = [cMap, cMapRGB, pMap, clusterMap] satisfies USSType[]

function parsePreambleCustomNodeAsMapUSS(stmt: UrbanStatsASTStatement): PreambleNode | undefined {
    if (stmt.type !== 'expression') {
        return undefined
    }
    const expr = stmt.value
    if (expr.type === 'customNode') {
        return expr
    }
    if (expr.type === 'autoUXNode' && expr.expr.type === 'customNode') {
        return { ...expr, expr: expr.expr }
    }
    return undefined
}

export function convertToMapUss(uss: UrbanStatsASTStatement): MapUSS {
    if (uss.type === 'expression' && uss.value.type === 'customNode') {
        return uss.value
    }
    if (uss.type === 'statements'
        && uss.result.length === 2
        && uss.result[1].type === 'condition'
        && uss.result[1].rest.length === 1
        && uss.result[1].rest[0].type === 'expression') {
        const preambleValue = parsePreambleCustomNodeAsMapUSS(uss.result[0])
        if (preambleValue !== undefined) {
            return {
                ...uss,
                result: [
                    { type: 'expression', value: preambleValue },
                    {
                        ...uss.result[1],
                        rest: [uss.result[1].rest[0]],
                    },
                ],
            }
        }
    }
    // Support arbitrary scripts
    return parseNoErrorAsCustomNode(unparse(uss), rootBlockIdent)
}

export function mapUSSFromString(rawString: string): MapUSS {
    const uss = parse(rawString)
    if (uss.type === 'error') {
        throw new Error(uss.errors.map(error => longMessage({ kind: 'error', ...error }, true)).join(', '))
    }
    return convertToMapUss(uss)
}

export function makeStatements<const T extends UrbanStatsASTStatement[]>(elements: T, identFallback?: string): UrbanStatsASTStatement & { type: 'statements', result: T } {
    const locations = [...elements.map(locationOf)]
    if (identFallback !== undefined) {
        locations.push(emptyLocation(identFallback))
    }
    return {
        type: 'statements',
        result: elements,
        entireLoc: unify(...locations),
    }
}

function attemptParseCondition(conditionStmt: UrbanStatsASTStatement | undefined): { conditionRest: UrbanStatsASTStatement[], conditionExpr: UrbanStatsASTExpression } {
    let stmts = conditionStmt !== undefined ? [conditionStmt] : []
    if (conditionStmt?.type === 'condition') {
        const conditionText = unparse(conditionStmt.condition, { simplify: 'auto-ux' })
        if (conditionText.trim() !== 'true') {
            return {
                conditionExpr: parseNoErrorAsCustomNode(conditionText, idCondition, [{ type: 'vector', elementType: { type: 'boolean' } }]),
                conditionRest: conditionStmt.rest,
            }
        }
        stmts = conditionStmt.rest
    }
    return {
        conditionExpr: { type: 'identifier', name: { node: 'true', location: emptyLocation(idCondition) } } satisfies UrbanStatsASTExpression,
        conditionRest: stmts,
    }
}

export function attemptParseAsTopLevel(stmt: MapUSS | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment, preserveCustomNodes: boolean, targetOutputTypes: USSType[]): MapUSS {
    /**
     * Splits up the statements into a preamble and a condition statement. Make the body of the condition a custom node.
     */
    if (stmt.type === 'customNode') {
        return stmt
    }
    const stmts = stmt.type === 'statements' ? stmt.result : [stmt]
    const preamble = {
        type: 'statements',
        result: stmts.slice(0, -1),
        entireLoc: locationOf(stmt),
    } satisfies UrbanStatsASTStatement
    const conditionStmt = stmts.length > 0 ? stmts[stmts.length - 1] : undefined
    const { conditionRest, conditionExpr } = attemptParseCondition(conditionStmt)
    const body = parseExpr(makeStatements(conditionRest, idOutput), idOutput, targetOutputTypes, typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes)
    const condition = {
        type: 'condition',
        entireLoc: locationOf(conditionExpr),
        condition: conditionExpr,
        rest: [{ type: 'expression', value: body }] as const,
    } satisfies UrbanStatsASTStatement
    return {
        type: 'statements',
        result: [
            { type: 'expression', value: parseNoErrorAsCustomNode(unparse(preamble, { simplify: 'auto-ux' }), idPreamble) },
            condition,
        ] as const,
        entireLoc: locationOf(stmt),
    } satisfies UrbanStatsASTStatement
}

// Exclude types to not reparse. When the USS is being stored, should always reparse
export function mapUssParser<T>(lastExpr: l.LiteralExprParser<T>, types: USSType[] | 'dont-reparse') {
    const statementsSchema = l.lastExpression(types !== 'dont-reparse' ? l.reparse(idOutput, types, lastExpr) : lastExpr)
    const customNodeLastExpr = l.customNode(l.lastExpression(lastExpr))
    const customNodeSchema = types !== 'dont-reparse' ? l.reparse(rootBlockIdent, types, customNodeLastExpr) : customNodeLastExpr
    return (uss: MapUSS, typeEnvironment: TypeEnvironment): T => {
        return uss.type === 'statements' ? statementsSchema.parse(uss, typeEnvironment) : customNodeSchema.parse(uss, typeEnvironment)
    }
}

/** What a schema reads, or nothing where the script is not shaped the way it reads. */
export function read<T>(schema: (uss: MapUSS, typeEnvironment: TypeEnvironment) => T, uss: MapUSS, typeEnvironment: TypeEnvironment): T | undefined {
    try {
        return schema(uss, typeEnvironment)
    }
    catch (error) {
        if (error instanceof l.LiteralParseError) {
            return undefined
        }
        throw error
    }
}

const mapDataCall = l.call({
    fn: l.ignore(),
    namedArgs: { data: l.passthrough() },
    unnamedArgs: [],
})

const mapData = mapUssParser(mapDataCall, 'dont-reparse')

/** The map call with its data to hand, and the means to write something else in its place. */
export const editableMapData = mapUssParser(l.edit(mapDataCall), 'dont-reparse')

/** The expression a map draws, which is what both its label and its units are read off. */
export function mapDataExpression(uss: MapUSS, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression | undefined {
    return read(mapData, uss, typeEnvironment)?.namedArgs.data
}

const tableColumns = mapUssParser(l.call({
    fn: l.ignore(),
    namedArgs: {
        columns: l.vector(l.call({
            fn: l.ignore(),
            namedArgs: { values: l.passthrough() },
            unnamedArgs: [],
        })),
    },
    unnamedArgs: [],
}), 'dont-reparse')

/** The expression a column of a table takes its values from, likewise. */
export function tableColumnExpression(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): UrbanStatsASTExpression | undefined {
    const columns = read(tableColumns, uss, typeEnvironment)?.namedArgs.columns
    return columns === undefined || columnIndex >= columns.length ? undefined : columns[columnIndex].namedArgs.values
}
