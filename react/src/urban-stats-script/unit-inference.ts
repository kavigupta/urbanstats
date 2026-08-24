import { dimensionless } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { TypeEnvironment, UnitPropagation } from './types-values'
import { AbstractInterpValue, constant, forward, forwardUnary, inUnit, join, manyOf } from './unit-algebra'

const anything: AbstractInterpValue = { kind: 'any' }

/** A script has objects in it as well as quantities, a regression's result being one. */
type Inferred = AbstractInterpValue | { kind: 'fields', fields: Map<string, AbstractInterpValue> }

function quantity(value: Inferred): AbstractInterpValue {
    return value.kind === 'fields' ? anything : value
}

export type Bindings = Map<string, Inferred>

/** What has been worked out so far: the statistics as the script found them, and the names it gave. */
interface Scope {
    typeEnvironment: TypeEnvironment
    named: Bindings
}

/** A block is worth as much as its last statement, and an empty one as much as nothing said. */
function block(statements: UrbanStatsASTStatement[], scope: Scope): Inferred {
    let value: Inferred = anything
    for (const statement of statements) {
        value = infer(statement, scope)
    }
    return value
}

function branch(statement: UrbanStatsASTStatement, scope: Scope): { value: Inferred, named: Bindings } {
    const named = new Map(scope.named)
    return { value: infer(statement, { ...scope, named }), named }
}

/** A name an arm bound is worth what that arm made it where its mask held, and what it was where it did not. */
function bindArms(scope: Scope, consequent: Bindings, alternative: Bindings): void {
    for (const name of new Set([...consequent.keys(), ...alternative.keys()])) {
        const either = [consequent, alternative].map(arm => quantity(arm.get(name) ?? { kind: 'none' }))
        scope.named.set(name, join(either[0], either[1]))
    }
}

function identifier(name: string, scope: Scope): Inferred {
    const named = scope.named.get(name)
    if (named !== undefined) {
        return named
    }
    const unit = scope.typeEnvironment.get(name)?.documentation?.unit
    return unit === undefined ? anything : inUnit(unitTypeToStoredUnit(unit))
}

const parameterName = /^x(\d+)$/

function positional(args: UrbanStatsASTArg[], index: number): UrbanStatsASTExpression | undefined {
    return args.filter(arg => arg.type === 'unnamed')[index]?.value
}

function namedArgument(args: UrbanStatsASTArg[], name: string): UrbanStatsASTExpression | undefined {
    return args.find(arg => arg.type === 'named' && arg.name.node === name)?.value
}

/**
 * The intercept is in the units of what was regressed, the residuals are a difference of those,
 * and each coefficient is that difference over a difference of the parameter it belongs to.
 */
function regressionFields(args: UrbanStatsASTArg[], scope: Scope): Inferred {
    const regressed = namedArgument(args, 'y')
    const level = regressed === undefined ? anything : quantity(infer(regressed, scope))
    const change = forward('-', level, level)
    const fields = new Map<string, AbstractInterpValue>([['b', level], ['residuals', change], ['r2', inUnit(dimensionless)]])
    for (const arg of args) {
        const parameter = arg.type === 'named' ? parameterName.exec(arg.name.node) : null
        if (parameter !== null) {
            const of = quantity(infer(arg.value, scope))
            fields.set(`m${parameter[1]}`, forward('/', change, forward('-', of, of)))
        }
    }
    return { kind: 'fields', fields }
}

function argument(args: UrbanStatsASTArg[], index: number, scope: Scope): AbstractInterpValue {
    const arg = positional(args, index)
    return arg === undefined ? anything : quantity(infer(arg, scope))
}

function whatItGives(propagation: Exclude<UnitPropagation, { kind: 'regression' }>, value: AbstractInterpValue, args: UrbanStatsASTArg[], scope: Scope): AbstractInterpValue {
    switch (propagation.kind) {
        case 'number':
            return inUnit(dimensionless)
        case 'unchanged': {
            const isDifference = value.kind === 'in' && value.unit.unit.times === 0
            return propagation.unknownTimes === true && !isDifference ? manyOf(value) : value
        }
        case 'power':
            return forward('**', value, constant(propagation.exponent))
        case 'either':
            return join(value, argument(args, 1, scope))
        case 'rank': {
            // of one kind, so nothing is the rank of a population among areas
            const alike = forward('-', value, argument(args, 1, scope))
            return alike.kind === 'none' ? alike : inUnit(dimensionless)
        }
    }
}

function propagated(propagation: UnitPropagation, args: UrbanStatsASTArg[], scope: Scope): Inferred {
    return propagation.kind === 'regression'
        ? regressionFields(args, scope)
        : whatItGives(propagation, argument(args, 0, scope), args, scope)
}

/** Nothing, where the script bound the name itself and the function of that name is not what is called. */
function propagationOf(fn: UrbanStatsASTExpression, scope: Scope): UnitPropagation | undefined {
    if (fn.type !== 'identifier' || scope.named.has(fn.name.node)) {
        return undefined
    }
    return scope.typeEnvironment.get(fn.name.node)?.documentation?.unitPropagation
}

function infer(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, scope: Scope): Inferred {
    switch (ast.type) {
        case 'expression':
            return infer(ast.value, scope)
        case 'assignment': {
            const value = infer(ast.value, scope)
            if (ast.lhs.type === 'identifier') {
                scope.named.set(ast.lhs.name.node, value)
            }
            return value
        }
        case 'autoUXNode':
        case 'customNode':
            return infer(ast.expr, scope)
        case 'do':
            return block(ast.statements, scope)
        case 'statements':
            return block(ast.result, scope)
        // which regions are kept says nothing about what is measured of them
        case 'condition':
            return block(ast.rest, scope)
        case 'identifier':
            return identifier(ast.name.node, scope)
        case 'constant':
            return ast.value.node.type === 'number' ? constant(ast.value.node.value) : anything
        case 'unaryOperator':
            return forwardUnary(ast.operator.node, quantity(infer(ast.expr, scope)))
        case 'binaryOperator':
            return forward(ast.operator.node, quantity(infer(ast.left, scope)), quantity(infer(ast.right, scope)))
        case 'vectorLiteral':
            return ast.elements.reduce<AbstractInterpValue>((soFar, element) => join(soFar, quantity(infer(element, scope))), { kind: 'none' })
        case 'objectLiteral':
            return { kind: 'fields', fields: new Map(ast.properties.map(([name, value]) => [name, quantity(infer(value, scope))])) }
        case 'attribute': {
            const object = infer(ast.expr, scope)
            return object.kind === 'fields' ? object.fields.get(ast.name.node) ?? anything : anything
        }
        case 'call': {
            const propagation = propagationOf(ast.fn, scope)
            return propagation === undefined ? anything : propagated(propagation, ast.args, scope)
        }
        case 'if': {
            const consequent = branch(ast.then, scope)
            // an arm that is not there leaves the value it would have written as it was
            const alternative = ast.else === undefined ? undefined : branch(ast.else, scope)
            bindArms(scope, consequent.named, alternative?.named ?? new Map(scope.named))
            return alternative === undefined ? consequent.value : join(quantity(consequent.value), quantity(alternative.value))
        }
        case 'parseError':
            return anything
    }
}

/** What kind of quantity an expression works out to, as far as reading it can say. */
export function inferUnit(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment, named: Bindings = new Map()): AbstractInterpValue {
    return quantity(infer(ast, { typeEnvironment, named }))
}

export function inferBindings(program: UrbanStatsASTStatement | UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): Bindings {
    const named: Bindings = new Map()
    infer(program, { typeEnvironment, named })
    return named
}
