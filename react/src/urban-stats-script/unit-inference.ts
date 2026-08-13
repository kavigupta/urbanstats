import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import { combineUnits, dimensionless, powerUnit, sameDimensions, Unit, unitTypeToUnit } from '../utils/unit'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import * as l from './literal-parser'
import { BinaryOperatorSymbol, UnaryOperatorSymbol } from './operators'
import { TypeEnvironment } from './types-values'

/**
 * The unit of an expression, computed by abstract interpretation over the AST. Undefined means
 * the unit could not be inferred, e.g., for a numeric constant or the result of a function.
 */
export type InferredUnit = Unit | undefined

function withoutPresentation(unit: Unit): Unit {
    return { dimensions: unit.dimensions, multiplier: unit.multiplier }
}

/**
 * Two quantities can only be added if they are the same unit. Their presentation survives only if
 * they share it, so a percentage plus a percentage is a percentage, but a percentage plus an
 * election margin is a plain fraction.
 */
function additionUnit(left: Unit, right: Unit): InferredUnit {
    if (!sameDimensions(left.dimensions, right.dimensions) || left.multiplier !== right.multiplier) {
        return undefined
    }
    if (left.presentation === right.presentation) {
        return left
    }
    if (left.presentation !== undefined && right.presentation !== undefined) {
        return { ...withoutPresentation(left), presentation: 'percentage' }
    }
    return withoutPresentation(left)
}

function exponentiationUnit(base: Unit, exponent: number | undefined): InferredUnit {
    if (exponent !== undefined) {
        return powerUnit(withoutPresentation(base), exponent)
    }
    // any power of a plain number is a plain number, whatever the exponent is
    return sameDimensions(base.dimensions, {}) && base.multiplier === 1 ? dimensionless : undefined
}

/**
 * The unit of `left operator right`. The exponent is the value of the right operand, which is
 * needed to raise a unit to a power, and is undefined if it is not a known constant.
 */
export function binaryOperatorUnit(
    operator: BinaryOperatorSymbol,
    left: InferredUnit,
    right: InferredUnit,
    exponent?: number,
): InferredUnit {
    switch (operator) {
        case '==':
        case '!=':
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '&':
        case '|':
            return undefined
        case '**':
            return left === undefined ? undefined : exponentiationUnit(left, exponent)
        case '+':
        case '-':
        case '*':
        case '/':
            break
    }
    if (left === undefined) {
        return right
    }
    if (right === undefined) {
        return left
    }
    switch (operator) {
        case '+':
        case '-':
            return additionUnit(left, right)
        case '*':
            return combineUnits(withoutPresentation(left), withoutPresentation(right), 1)
        case '/':
            return combineUnits(withoutPresentation(left), withoutPresentation(right), -1)
    }
}

export function unaryOperatorUnit(operator: UnaryOperatorSymbol, operand: InferredUnit): InferredUnit {
    return operator === '!' ? undefined : operand
}

function constantNumber(ast: UrbanStatsASTExpression): number | undefined {
    if (ast.type === 'constant') {
        return ast.value.node.type === 'number' ? ast.value.node.value : undefined
    }
    if (ast.type === 'unaryOperator' && (ast.operator.node === '+' || ast.operator.node === '-')) {
        const operand = constantNumber(ast.expr)
        if (operand === undefined) return undefined
        return ast.operator.node === '-' ? -operand : operand
    }
    return undefined
}

export function inferUnit(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment): InferredUnit {
    switch (ast.type) {
        case 'identifier':
            const unitType = typeEnvironment.get(ast.name.node)?.documentation?.unit
            return unitType === undefined ? undefined : unitTypeToUnit(unitType)
        case 'binaryOperator':
            return binaryOperatorUnit(
                ast.operator.node,
                inferUnit(ast.left, typeEnvironment),
                inferUnit(ast.right, typeEnvironment),
                constantNumber(ast.right),
            )
        case 'unaryOperator':
            return unaryOperatorUnit(ast.operator.node, inferUnit(ast.expr, typeEnvironment))
        case 'assignment':
        case 'expression':
            return inferUnit(ast.value, typeEnvironment)
        case 'customNode':
        case 'autoUXNode':
            return inferUnit(ast.expr, typeEnvironment)
        case 'do':
            if (ast.statements.length === 0) return undefined
            return inferUnit(ast.statements[ast.statements.length - 1], typeEnvironment)
        case 'statements':
            if (ast.result.length === 0) return undefined
            return inferUnit(ast.result[ast.result.length - 1], typeEnvironment)
        case 'condition':
            if (ast.rest.length === 0) return undefined
            return inferUnit(ast.rest[ast.rest.length - 1], typeEnvironment)
        case 'constant':
        case 'call':
        case 'attribute':
        case 'vectorLiteral':
        case 'objectLiteral':
        case 'if':
        case 'parseError':
            return undefined
    }
}

function inferUnitOfArgument(
    uss: MapUSS,
    typeEnvironment: TypeEnvironment,
    argument: (parsed: ReturnType<ReturnType<typeof valuesSchema>>) => UrbanStatsASTExpression | undefined,
): InferredUnit {
    try {
        const expr = argument(valuesSchema()(uss, typeEnvironment))
        if (expr === undefined) return undefined
        return inferUnit(expr, typeEnvironment)
    }
    catch (error) {
        if (error instanceof l.LiteralParseError) {
            return undefined
        }
        throw error
    }
}

function valuesSchema(): (uss: MapUSS, typeEnvironment: TypeEnvironment) => {
    namedArgs: { data: UrbanStatsASTExpression | undefined, columns: { namedArgs: { values: UrbanStatsASTExpression | undefined } }[] | undefined }
} {
    return mapUssParser(l.call({
        fn: l.ignore(),
        namedArgs: {
            data: l.passthrough(),
            columns: l.optional(l.vector(l.call({
                fn: l.ignore(),
                namedArgs: { values: l.passthrough() },
                unnamedArgs: [],
            }))),
        },
        unnamedArgs: [],
    }), 'dont-reparse')
}

/**
 * The unit of the data displayed by a map, when it can be inferred from the map's data argument.
 */
export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): InferredUnit {
    return inferUnitOfArgument(uss, typeEnvironment, parsed => parsed.namedArgs.data)
}

/**
 * The unit of a table column, when it can be inferred from the column's values argument.
 */
export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): InferredUnit {
    return inferUnitOfArgument(uss, typeEnvironment, parsed => parsed.namedArgs.columns?.[columnIndex]?.namedArgs.values)
}
