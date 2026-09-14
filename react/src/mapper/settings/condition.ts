/**
 * The subset of USS that the condition editor can display graphically:
 *
 *     condition = condition & condition | (condition | condition)
 *               | number[] <comparison operator> (number | number[])
 *               | <string predicate>(string[], string)
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

const numericOperators = ['==', '!=', '<', '<=', '>', '>='] as const
const stringPredicates = ['startsWith', 'endsWith', 'includes', 'fuzzyMatch', 'matchesRegex'] as const
export const comparisonOperators = [...numericOperators, ...stringPredicates] as const
export type ComparisonOperator = typeof comparisonOperators[number]
type StringPredicate = typeof stringPredicates[number]

export const conditionKinds = [...groupOperators, 'comparison', 'custom'] as const
export type ConditionKind = typeof conditionKinds[number]

const conditionTypes = [{ type: 'vector', elementType: { type: 'boolean' } }] satisfies USSType[]

export function isStringPredicate(operator: string): operator is StringPredicate {
    return (stringPredicates as readonly string[]).includes(operator)
}

function typeOfComparisonOperator(operator: ComparisonOperator): 'number' | 'string' {
    return isStringPredicate(operator) ? 'string' : 'number'
}

export function comparisonLhsTypes(operator: ComparisonOperator): USSType[] {
    return [{ type: 'vector', elementType: { type: typeOfComparisonOperator(operator) } }]
}

export function comparisonRhsTypes(operator: ComparisonOperator): USSType[] {
    const type = typeOfComparisonOperator(operator)
    return [{ type }, { type: 'vector', elementType: { type } }]
}

export type Condition =
    { kind: GroupOperator, operands: UrbanStatsASTExpression[] } |
    { kind: 'comparison', operator: ComparisonOperator, lhs: UrbanStatsASTExpression, rhs: UrbanStatsASTExpression } |
    { kind: 'custom', expr: UrbanStatsASTExpression & { type: 'customNode' } }

function isGroupOperator(op: BinaryOperatorSymbol | ConditionKind): op is GroupOperator {
    return (groupOperators as readonly string[]).includes(op)
}

function isNumericOperator(op: BinaryOperatorSymbol): op is typeof numericOperators[number] {
    return (numericOperators as readonly BinaryOperatorSymbol[]).includes(op)
}

/** The pieces of a call like `startsWith(geoName, "San")`. One carrying named arguments is not one, as the editor has nowhere to show them. */
function asStringPredicate(expr: UrbanStatsASTExpression): (Condition & { kind: 'comparison' }) | undefined {
    if (expr.type !== 'call' || expr.fn.type !== 'identifier' || !isStringPredicate(expr.fn.name.node) || expr.args.length !== 2) {
        return undefined
    }
    const [lhs, rhs] = expr.args
    if (lhs.type !== 'unnamed' || rhs.type !== 'unnamed') {
        return undefined
    }
    return { kind: 'comparison', operator: expr.fn.name.node, lhs: lhs.value, rhs: rhs.value }
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
        if (isNumericOperator(op)) {
            return { kind: 'comparison', operator: op, lhs: expr.left, rhs: expr.right }
        }
    }
    const predicate = asStringPredicate(expr)
    if (predicate !== undefined) {
        return predicate
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
    if (isStringPredicate(operator)) {
        return {
            type: 'call',
            fn: { type: 'identifier', name: { node: operator, location: emptyLocation(blockIdent) } },
            args: [{ type: 'unnamed', value: lhs }, { type: 'unnamed', value: rhs }],
            entireLoc: emptyLocation(blockIdent),
        }
    }
    return {
        type: 'binaryOperator',
        operator: { node: operator, location: emptyLocation(blockIdent) },
        left: lhs,
        right: rhs,
    }
}

function comparisonWithDefaults(operator: ComparisonOperator, blockIdent: string, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression {
    return buildComparison(
        operator,
        createDefaultExpression(comparisonLhsTypes(operator)[0], extendBlockIdPositionalArg(blockIdent, 0), typeEnvironment),
        createDefaultExpression(comparisonRhsTypes(operator)[0], extendBlockIdPositionalArg(blockIdent, 1), typeEnvironment),
        blockIdent,
    )
}

export function defaultComparison(blockIdent: string, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression {
    return comparisonWithDefaults('>', blockIdent, typeEnvironment)
}

/** Comparing names and comparing numbers take different operands, so switching between the two starts over. */
export function changeComparisonOperator(
    comparison: Condition & { kind: 'comparison' },
    newOperator: ComparisonOperator,
    blockIdent: string,
    typeEnvironment: TypeEnvironment,
): UrbanStatsASTExpression {
    if (isStringPredicate(comparison.operator) !== isStringPredicate(newOperator)) {
        return comparisonWithDefaults(newOperator, blockIdent, typeEnvironment)
    }
    return buildComparison(newOperator, comparison.lhs, comparison.rhs, blockIdent)
}

function asCustomCondition(expr: UrbanStatsASTExpression, blockIdent: string): UrbanStatsASTExpression & { type: 'customNode' } {
    return parseNoErrorAsCustomNode(unparse(expr, { simplify: 'auto-ux' }), blockIdent, conditionTypes)
}

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
            if (isNumericOperator(op)) {
                return parseComparison({ kind: 'comparison', operator: op, lhs: expr.left, rhs: expr.right }, blockIdent, typeEnvironment, preserveCustomNodes)
            }
            return undefined
        }
        case 'call': {
            const predicate = asStringPredicate(expr)
            return predicate === undefined ? undefined : parseComparison(predicate, blockIdent, typeEnvironment, preserveCustomNodes)
        }
        default:
            return undefined
    }
}

function parseComparison(
    comparison: Condition & { kind: 'comparison' },
    blockIdent: string,
    typeEnvironment: TypeEnvironment,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression {
    const { operator, lhs, rhs } = comparison
    return buildComparison(
        operator,
        parseExpr(lhs, extendBlockIdPositionalArg(blockIdent, 0), comparisonLhsTypes(operator), typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
        parseExpr(rhs, extendBlockIdPositionalArg(blockIdent, 1), comparisonRhsTypes(operator), typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
        blockIdent,
    )
}

export function changeConditionKind(
    condition: UrbanStatsASTExpression,
    newKind: ConditionKind,
    blockIdent: string,
    typeEnvironment: TypeEnvironment,
): UrbanStatsASTExpression {
    const current = classifyCondition(condition)
    if (newKind === current.kind) {
        return condition
    }
    if (current.kind === 'custom') {
        // Leaving custom reads the code as a condition rather than keeping it as one opaque operand
        const reparsed = parseCondition(condition, blockIdent, typeEnvironment, false)
        if (classifyCondition(reparsed).kind !== 'custom') {
            return changeConditionKind(reparsed, newKind, blockIdent, typeEnvironment)
        }
    }
    if (isGroupOperator(newKind)) {
        if (current.kind === '&' || current.kind === '|') {
            return buildGroup(newKind, current.operands.map((expr, i) => ({ expr, blockIdent: extendBlockIdVectorElement(blockIdent, i) })), blockIdent)
        }
        return buildGroup(newKind, [
            { expr: condition, blockIdent },
            { expr: defaultComparison(extendBlockIdVectorElement(blockIdent, 1), typeEnvironment), blockIdent: extendBlockIdVectorElement(blockIdent, 1) },
        ], blockIdent)
    }
    if (newKind === 'comparison') {
        // Keep the first operand of a group if it is itself a comparison, rather than starting over
        if (current.kind === '&' || current.kind === '|') {
            const first = current.operands[0]
            if (classifyCondition(first).kind === 'comparison') {
                return changeBlockId(first, extendBlockIdVectorElement(blockIdent, 0), blockIdent)
            }
        }
        return defaultComparison(blockIdent, typeEnvironment)
    }
    return asCustomCondition(condition, blockIdent)
}
