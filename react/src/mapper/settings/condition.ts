/**
 * The subset of USS that the condition editor can display graphically:
 *
 *     condition = condition & condition | condition | condition
 *               | number[] <comparison operator> (number | number[])
 *
 * Anything else is kept as a custom node. Groups are flattened, so `a & b & c`
 * is three operands of one group rather than nested pairs.
 */

import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { extendBlockIdPositionalArg, extendBlockIdVectorElement } from '../../urban-stats-script/location'
import { BinaryOperatorSymbol } from '../../urban-stats-script/operators'
import { parseNoErrorAsCustomNode, unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment, USSType } from '../../urban-stats-script/types-values'
import { assert } from '../../utils/defensive'

import { changeBlockId, createDefaultExpression, parseExpr } from './parseExpr'

const groupOperators = ['&', '|'] as const
export type GroupOperator = typeof groupOperators[number]

export const comparisonOperators = ['==', '!=', '<', '<=', '>', '>='] as const
export type ComparisonOperator = typeof comparisonOperators[number]

export type ConditionKind = GroupOperator | 'comparison' | 'custom'
export const conditionKinds = [...groupOperators, 'comparison', 'custom'] as const satisfies ConditionKind[]

const conditionTypes = [{ type: 'vector', elementType: { type: 'boolean' } }] satisfies USSType[]
export const comparisonLhsTypes = [{ type: 'vector', elementType: { type: 'number' } }] satisfies USSType[]
export const comparisonRhsTypes = [{ type: 'number' }, { type: 'vector', elementType: { type: 'number' } }] satisfies USSType[]

export type Condition =
    { kind: GroupOperator, operands: UrbanStatsASTExpression[] } |
    { kind: 'comparison', operator: ComparisonOperator, lhs: UrbanStatsASTExpression, rhs: UrbanStatsASTExpression } |
    { kind: 'custom', expr: UrbanStatsASTExpression & { type: 'customNode' } }

function isGroupOperator(op: BinaryOperatorSymbol | ConditionKind): op is GroupOperator {
    return (groupOperators as readonly string[]).includes(op)
}

function isComparisonOperator(op: BinaryOperatorSymbol): op is ComparisonOperator {
    return (comparisonOperators as readonly BinaryOperatorSymbol[]).includes(op)
}

export function isNoCondition(expr: UrbanStatsASTExpression): boolean {
    return unparse(expr, { simplify: 'auto-ux' }).trim() === 'true'
}

export function noCondition(blockIdent: string): UrbanStatsASTExpression {
    return { type: 'identifier', name: { node: 'true', location: emptyLocation(blockIdent) } }
}

/** Only valid on an expression that has been through `parseCondition`. */
export function classifyCondition(expr: UrbanStatsASTExpression): Condition {
    if (expr.type === 'binaryOperator') {
        const op = expr.operator.node
        if (isGroupOperator(op)) {
            return { kind: op, operands: flattenGroup(expr, op) }
        }
        if (isComparisonOperator(op)) {
            return { kind: 'comparison', operator: op, lhs: expr.left, rhs: expr.right }
        }
    }
    assert(expr.type === 'customNode', `Condition expression ${unparse(expr)} is not in the condition grammar`)
    return { kind: 'custom', expr }
}

function flattenGroup(expr: UrbanStatsASTExpression, operator: GroupOperator): UrbanStatsASTExpression[] {
    if (expr.type === 'binaryOperator' && expr.operator.node === operator) {
        return [...flattenGroup(expr.left, operator), ...flattenGroup(expr.right, operator)]
    }
    return [expr]
}

/** Operands are re-identified from their current block idents to their new positions. */
export function buildGroup(operator: GroupOperator, operands: { expr: UrbanStatsASTExpression, blockIdent: string }[], blockIdent: string): UrbanStatsASTExpression {
    assert(operands.length > 0, 'A condition group needs at least one operand')
    if (operands.length === 1) {
        return changeBlockId(operands[0].expr, operands[0].blockIdent, blockIdent)
    }
    const reidentified = operands.map(({ expr, blockIdent: from }, i) => changeBlockId(expr, from, extendBlockIdVectorElement(blockIdent, i)))
    return reidentified.reduce((left, right) => ({
        type: 'binaryOperator',
        operator: { node: operator, location: emptyLocation(blockIdent) },
        left,
        right,
    }))
}

export function buildComparison(operator: ComparisonOperator, lhs: UrbanStatsASTExpression, rhs: UrbanStatsASTExpression, blockIdent: string): UrbanStatsASTExpression {
    return {
        type: 'binaryOperator',
        operator: { node: operator, location: emptyLocation(blockIdent) },
        left: lhs,
        right: rhs,
    }
}

export function defaultComparison(blockIdent: string, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression {
    const rhsIdent = extendBlockIdPositionalArg(blockIdent, 1)
    return buildComparison(
        '>',
        createDefaultExpression(comparisonLhsTypes[0], extendBlockIdPositionalArg(blockIdent, 0), typeEnvironment),
        { type: 'constant', value: { node: { type: 'number', value: 0 }, location: emptyLocation(rhsIdent) } },
        blockIdent,
    )
}

function asCustomCondition(expr: UrbanStatsASTExpression, blockIdent: string): UrbanStatsASTExpression & { type: 'customNode' } {
    return parseNoErrorAsCustomNode(unparse(expr, { simplify: 'auto-ux' }), blockIdent, conditionTypes)
}

/**
 * Normalizes an arbitrary expression into the condition grammar, assigning block idents.
 * Custom nodes are looked inside of, so that conditions written as code before there was a
 * graphical editor come up graphically.
 */
export function parseCondition(
    expr: UrbanStatsASTExpression,
    blockIdent: string,
    typeEnvironment: TypeEnvironment,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression {
    return attemptParseCondition(expr, blockIdent, typeEnvironment, preserveCustomNodes) ?? asCustomCondition(expr, blockIdent)
}

function attemptParseCondition(
    expr: UrbanStatsASTExpression,
    blockIdent: string,
    typeEnvironment: TypeEnvironment,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression | undefined {
    switch (expr.type) {
        case 'autoUXNode':
            return attemptParseCondition(expr.expr, blockIdent, typeEnvironment, preserveCustomNodes)
        case 'customNode':
            return expr.expr.type === 'expression'
                ? attemptParseCondition(expr.expr.value, blockIdent, typeEnvironment, preserveCustomNodes)
                : undefined
        case 'binaryOperator': {
            const op = expr.operator.node
            if (isGroupOperator(op)) {
                const operands = flattenGroup(expr, op).map((operand, i) => ({
                    expr: parseCondition(operand, extendBlockIdVectorElement(blockIdent, i), typeEnvironment, preserveCustomNodes),
                    blockIdent: extendBlockIdVectorElement(blockIdent, i),
                }))
                return buildGroup(op, operands, blockIdent)
            }
            if (isComparisonOperator(op)) {
                return buildComparison(
                    op,
                    parseExpr(expr.left, extendBlockIdPositionalArg(blockIdent, 0), comparisonLhsTypes, typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
                    parseExpr(expr.right, extendBlockIdPositionalArg(blockIdent, 1), comparisonRhsTypes, typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
                    blockIdent,
                )
            }
            return undefined
        }
        default:
            return undefined
    }
}

export function changeConditionKind(
    current: UrbanStatsASTExpression,
    classified: Condition,
    kind: ConditionKind,
    blockIdent: string,
    typeEnvironment: TypeEnvironment,
): UrbanStatsASTExpression {
    if (kind === classified.kind) {
        return current
    }
    if (classified.kind === 'custom') {
        // Leaving custom is a request to read the code as a condition, not to keep it as one opaque operand
        const reparsed = parseCondition(current, blockIdent, typeEnvironment, false)
        const reclassified = classifyCondition(reparsed)
        if (reclassified.kind !== 'custom') {
            return changeConditionKind(reparsed, reclassified, kind, blockIdent, typeEnvironment)
        }
    }
    if (isGroupOperator(kind)) {
        if (classified.kind === '&' || classified.kind === '|') {
            return buildGroup(kind, classified.operands.map((expr, i) => ({ expr, blockIdent: extendBlockIdVectorElement(blockIdent, i) })), blockIdent)
        }
        return buildGroup(kind, [
            { expr: current, blockIdent },
            { expr: defaultComparison(extendBlockIdVectorElement(blockIdent, 1), typeEnvironment), blockIdent: extendBlockIdVectorElement(blockIdent, 1) },
        ], blockIdent)
    }
    if (kind === 'comparison') {
        // Keep the first operand of a group if it is itself a comparison, rather than starting over
        if (classified.kind === '&' || classified.kind === '|') {
            const first = classified.operands[0]
            if (classifyCondition(first).kind === 'comparison') {
                return changeBlockId(first, extendBlockIdVectorElement(blockIdent, 0), blockIdent)
            }
        }
        return defaultComparison(blockIdent, typeEnvironment)
    }
    return asCustomCondition(current, blockIdent)
}
