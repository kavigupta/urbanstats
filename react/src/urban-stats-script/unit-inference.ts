import { MapUSS } from '../mapper/settings/map-uss'
import { dimensionless, sameDimensions, StoredUnit, unitProduct } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'
import { AbstractInterpValue, backward, constant, forward, forwardUnary, inUnit, join, manyOf, unitToWriteIn } from './unit-algebra'

/**
 * What reading a script for its units hangs on its nodes: what the number written where the node is
 * is a number of. A literal has one where the script says what it counts, and so does a toNumber.
 */
export interface ReadInUnits {
    readIn?: StoredUnit
}

type Expression = UrbanStatsASTExpression<ReadInUnits>
type Statement = UrbanStatsASTStatement<ReadInUnits>

const anything = { kind: 'any' } satisfies AbstractInterpValue

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

/** An expression as the units want it read, and what it is worth once it is. */
interface Checked<T> {
    ast: T
    value: Inferred
}

/** A block is worth as much as its last statement, and an empty one as much as nothing said. */
function checkBlock(statements: UrbanStatsASTStatement<ReadInUnits>[], scope: Scope, expected: Expected): Checked<Statement[]> {
    const checked = statements.map((statement, index) => checkStatement(statement, scope, index === statements.length - 1 ? expected : anything))
    return { ast: checked.map(each => each.ast), value: checked[checked.length - 1]?.value ?? anything }
}

function checkBranch(statement: UrbanStatsASTStatement<ReadInUnits>, scope: Scope, expected: Expected): Checked<Statement> & { named: Bindings } {
    const named = new Map(scope.named)
    return { ...checkStatement(statement, { ...scope, named }, expected), named }
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

/** Nothing, where the script bound the name itself and the function of that name is not what is called. */
function propagationOf(fn: Expression, scope: Scope): UnitPropagation | undefined {
    if (fn.type !== 'identifier' || scope.named.has(fn.name.node)) {
        return undefined
    }
    return scope.typeEnvironment.get(fn.name.node)?.documentation?.unitPropagation
}

/**
 * The expression times a one of whatever unit makes it go where it is: people added to an area are
 * multiplied by so many square kilometres each. The one carries the unit, so the caption says it.
 */
function timesAFactor(ast: Expression, factor: StoredUnit): Expression {
    const location = locationOf(ast)
    return ({
        type: 'binaryOperator',
        operator: { node: '*', location },
        left: ast,
        right: ({ type: 'constant', value: { node: { type: 'number', value: 1 }, location }, readIn: factor }),
    })
}

/**
 * The expression read as the plain number it is counted as, which the caption writes "[in °F]".
 * This is what a temperature gets, no factor dividing a reading that has no zero to divide from.
 */
function readAsANumberOf(ast: Expression, unit: StoredUnit): Expression {
    const location = locationOf(ast)
    return ({
        type: 'call',
        fn: ({ type: 'identifier', name: { node: 'toNumber', location } }),
        args: [({ type: 'unnamed', value: ast })],
        entireLoc: location,
        readIn: unit,
    })
}

/** What the right side has to be multiplied by to go where the left is, where anything does. */
function factorBetween(left: AbstractInterpValue, right: AbstractInterpValue): StoredUnit | undefined {
    if (left.kind !== 'in' || right.kind !== 'in') {
        return undefined
    }
    return unitProduct(left.unit, right.unit, -1)
}

function checkOperation(ast: UrbanStatsASTExpression<ReadInUnits> & { type: 'binaryOperator' }, scope: Scope, expected: Expected): Checked<Expression> {
    const operator = ast.operator.node
    const left = checkExpression(ast.left, scope, expectation(backward(operator, expected, anything, 'left')))
    const right = checkExpression(ast.right, scope, expectation(backward(operator, expected, quantity(left.value), 'right')))
    // a literal on the left is read from what the right came to, 80 < high_temp being a temperature
    const reread = quantity(left.value).kind === 'any' && quantity(right.value).kind === 'in'
        ? checkExpression(ast.left, scope, expectation(backward(operator, expected, quantity(right.value), 'left')))
        : left
    const [over, under] = [quantity(reread.value), quantity(right.value)]
    const value = forward(operator, over, under)
    if (value.kind !== 'none') {
        return { ast: ({ ...ast, left: reread.ast, right: right.ast }), value }
    }
    // the two do not go together as they are written, so a factor is written beside the right
    const factor = factorBetween(over, under)
    if (factor === undefined) {
        return { ast: ({ ...ast, left: reread.ast, right: right.ast }), value }
    }
    // worth what it is once the factor is written in, so that reading it again says the same
    const factored = forward('*', under, inUnit(factor))
    return {
        ast: ({ ...ast, left: reread.ast, right: timesAFactor(right.ast, factor) }),
        value: forward(operator, over, factored),
    }
}

/** What each argument is expected to be in, which is what the call makes of the ones before it. */
function expectedOfArgument(propagation: UnitPropagation | undefined, expected: Expected, index: number, before: AbstractInterpValue[]): Expected {
    if (propagation?.kind === 'unchanged') {
        return expected
    }
    // max and min take both arguments in one unit, so each is expected in the one before it
    if (propagation?.kind !== 'either' && propagation?.kind !== 'rank') {
        return anything
    }
    return index === 0 && expected.kind === 'in' ? expected : expectation(before[0] ?? anything)
}

/**
 * The intercept is in the units of what was regressed, the residuals are a difference of those,
 * and each coefficient is that difference over a difference of the parameter it belongs to.
 */
function regressionFields(args: { arg: UrbanStatsASTArg<ReadInUnits>, value: Inferred }[]): Inferred {
    const named = (name: string): AbstractInterpValue | undefined =>
        args.filter(({ arg }) => arg.type === 'named' && arg.name.node === name).map(({ value }) => quantity(value))[0]
    const level = named('y') ?? anything
    const change = forward('-', level, level)
    const fields = new Map<string, AbstractInterpValue>([['b', level], ['residuals', change], ['r2', inUnit(dimensionless)]])
    for (const { arg, value } of args) {
        const parameter = arg.type === 'named' ? parameterName.exec(arg.name.node) : null
        if (parameter !== null) {
            const of = quantity(value)
            fields.set(`m${parameter[1]}`, forward('/', change, forward('-', of, of)))
        }
    }
    return { kind: 'fields', fields }
}

function whatItGives(propagation: Exclude<UnitPropagation, { kind: 'regression' }>, positional: AbstractInterpValue[]): AbstractInterpValue {
    const value = positional[0] ?? anything
    switch (propagation.kind) {
        case 'number':
            return inUnit(dimensionless)
        case 'unchanged': {
            const isDifference = value.kind === 'in' && value.unit.unit.times === 0
            return propagation.unknownTimes === true && !isDifference ? manyOf(value) : value
        }
        case 'power':
            return forward('**', value, constant(propagation.exponent))
        case 'either': {
            const other = positional[1] ?? anything
            // Two known units must match, and the result is one of them, not their sum.
            if (value.kind === 'in' && other.kind === 'in') {
                return sameDimensions(value.unit, other.unit) ? join(value, other) : { kind: 'none' }
            }
            // A bare number takes the other argument's unit, as it does in a sum.
            return forward('+', value, other)
        }
        case 'rank': {
            // both arguments are in one unit, so there is no ranking a population among areas
            const alike = forward('-', value, positional[1] ?? anything)
            return alike.kind === 'none' ? alike : inUnit(dimensionless)
        }
    }
}

function checkCall(ast: UrbanStatsASTExpression<ReadInUnits> & { type: 'call' }, scope: Scope, expected: Expected): Checked<Expression> {
    const propagation = propagationOf(ast.fn, scope)
    // a caption writes a number where a toNumber is, so it carries what it is a number of
    const readIn = readAsANumber(ast, scope) === undefined ? undefined : unitToWriteIn(expected) ?? ast.readIn
    const checked: { arg: UrbanStatsASTArg<ReadInUnits>, value: Inferred }[] = []
    for (const [index, arg] of ast.args.entries()) {
        const before = checked.filter(({ arg: each }) => each.type === 'unnamed').map(({ value }) => quantity(value))
        const each = checkExpression(arg.value, scope, expectedOfArgument(propagation, expected, index, before))
        checked.push({ arg: ({ ...arg, value: each.ast }), value: each.value })
    }
    if (propagation?.kind === 'number') {
        // a logarithm of a density is a number, and the caption has to say what it was read from
        for (const each of checked) {
            const unit = unitToWriteIn(quantity(each.value))
            if (unit !== undefined) {
                each.arg = ({ ...each.arg, value: readAsANumberOf(each.arg.value, unit) })
            }
        }
    }
    // both arguments of a max are of one kind, which a factor beside the second one makes them
    if ((propagation?.kind === 'either' || propagation?.kind === 'rank') && checked.length > 1) {
        const [first, second] = checked
        const factor = factorBetween(quantity(first.value), quantity(second.value))
        if (factor !== undefined && forward('-', quantity(first.value), quantity(second.value)).kind === 'none') {
            second.arg = ({ ...second.arg, value: timesAFactor(second.arg.value, factor) })
            second.value = forward('*', quantity(second.value), inUnit(factor))
        }
    }
    const rewritten = { ...ast, args: checked.map(({ arg }) => arg), readIn }
    if (propagation === undefined) {
        return { ast: rewritten, value: anything }
    }
    if (propagation.kind === 'regression') {
        return { ast: rewritten, value: regressionFields(checked) }
    }
    const positional = checked.filter(({ arg }) => arg.type === 'unnamed').map(({ value }) => quantity(value))
    return { ast: rewritten, value: whatItGives(propagation, positional) }
}

/**
 * Reads an expression for the unit it works out to, writing into it whatever the units want that
 * the script does not say: a factor where two sides do not go together, and what a number that has
 * had its units read off was read from. What it computes is untouched, a factor being a one.
 */
function checkExpression(ast: UrbanStatsASTExpression<ReadInUnits>, scope: Scope, expected: Expected): Checked<Expression> {
    switch (ast.type) {
        case 'identifier':
            return { ast, value: identifier(ast.name.node, scope) }
        case 'constant': {
            if (ast.value.node.type !== 'number') {
                return { ast, value: anything }
            }
            // the 0.1 of commute_bike < 0.1 is a share, and is written 10%
            const unit = unitToWriteIn(expected) ?? ast.readIn
            if (unit === undefined) {
                return { ast, value: constant(ast.value.node.value) }
            }
            return { ast: ({ ...ast, readIn: unit }), value: inUnit(unit) }
        }
        case 'attribute': {
            const object = checkExpression(ast.expr, scope, anything)
            const fields = object.value.kind === 'fields' ? object.value.fields : undefined
            return { ast: ({ ...ast, expr: object.ast }), value: fields?.get(ast.name.node) ?? anything }
        }
        case 'unaryOperator': {
            // the sign is rendered outside the number, so -10 keeps the unit and reads -10°F
            const inner = checkExpression(ast.expr, scope, ast.operator.node === '!' ? anything : expected)
            return { ast: ({ ...ast, expr: inner.ast }), value: forwardUnary(ast.operator.node, quantity(inner.value)) }
        }
        case 'binaryOperator':
            return checkOperation(ast, scope, expected)
        case 'call':
            return checkCall(ast, scope, expected)
        case 'vectorLiteral': {
            const elements = ast.elements.map(element => checkExpression(element, scope, expected))
            const value = elements.reduce<AbstractInterpValue>((soFar, element) => join(soFar, quantity(element.value)), { kind: 'none' })
            return { ast: ({ ...ast, elements: elements.map(each => each.ast) }), value }
        }
        case 'objectLiteral': {
            const properties = ast.properties.map(([name, value]): [string, Checked<Expression>] => [name, checkExpression(value, scope, anything)])
            return {
                ast: ({ ...ast, properties: properties.map(([name, checked]): [string, Expression] => [name, checked.ast]) }),
                value: { kind: 'fields', fields: new Map(properties.map(([name, checked]) => [name, quantity(checked.value)])) },
            }
        }
        case 'if': {
            const condition = checkExpression(ast.condition, scope, anything)
            const consequent = checkBranch(ast.then, scope, expected)
            // an arm that is not there leaves the value it would have written as it was
            const alternative = ast.else === undefined ? undefined : checkBranch(ast.else, scope, expected)
            bindArms(scope, consequent.named, alternative?.named ?? new Map(scope.named))
            return {
                ast: ({
                    ...ast,
                    condition: condition.ast,
                    then: consequent.ast,
                    ...alternative === undefined ? {} : { else: alternative.ast },
                }),
                value: alternative === undefined ? consequent.value : join(quantity(consequent.value), quantity(alternative.value)),
            }
        }
        case 'do': {
            const statements = checkBlock(ast.statements, scope, expected)
            return { ast: ({ ...ast, statements: statements.ast }), value: statements.value }
        }
        case 'autoUXNode': {
            const inner = checkExpression(ast.expr, scope, expected)
            return { ast: ({ ...ast, expr: inner.ast }), value: inner.value }
        }
        case 'customNode': {
            const inner = checkStatement(ast.expr, scope, expected)
            return { ast: ({ ...ast, expr: inner.ast }), value: inner.value }
        }
    }
}

function checkStatement(ast: UrbanStatsASTStatement<ReadInUnits>, scope: Scope, expected: Expected): Checked<Statement> {
    switch (ast.type) {
        case 'expression': {
            const inner = checkExpression(ast.value, scope, expected)
            return { ast: ({ ...ast, value: inner.ast }), value: inner.value }
        }
        case 'assignment': {
            const inner = checkExpression(ast.value, scope, expected)
            if (ast.lhs.type === 'identifier') {
                scope.named.set(ast.lhs.name.node, inner.value)
            }
            return { ast: ({ ...ast, value: inner.ast }), value: inner.value }
        }
        case 'statements': {
            const statements = checkBlock(ast.result, scope, expected)
            return { ast: ({ ...ast, result: statements.ast }), value: statements.value }
        }
        case 'condition': {
            // which regions are kept says nothing about what is measured of them, though the
            // condition is read all the same, for the caption that is written of it
            const condition = checkExpression(ast.condition, scope, anything)
            const rest = checkBlock(ast.rest, scope, expected)
            return { ast: ({ ...ast, condition: condition.ast, rest: rest.ast }), value: rest.value }
        }
        case 'parseError':
            return { ast, value: anything }
    }
}

/**
 * The unit an expression is expected to be in. It never carries a value, because a literal is read
 * two ways: as dimensionless where it scales something (x * 2), and as the other side's unit where
 * it is compared against one (x > 100). A value here would get the first reading in both places.
 */
type Expected = { kind: 'any' } | { kind: 'none' } | { kind: 'in', unit: StoredUnit }

function expectation(value: AbstractInterpValue): Expected {
    switch (value.kind) {
        case 'in':
            return { kind: 'in', unit: value.unit }
        case 'any':
            return { kind: 'any' }
        case 'none':
            return value
    }
}

const toNumberOfOneThing = l.call({
    fn: l.identifier('toNumber'),
    unnamedArgs: [l.passthrough()],
    namedArgs: {},
})

const primitive = l.union<USSPrimitiveRawValue>([l.number(), l.string(), l.boolean()])

/** A call to toNumber, carrying the number its argument is when the argument is a literal. */
export function readAsANumber<M>(ast: UrbanStatsASTExpression<M>, scope: Scope): { value?: number, read: UrbanStatsASTExpression<M> } | undefined {
    // a script that binds the name itself is calling something else
    if (scope.named.has('toNumber')) return undefined
    const read = l.tryParse(toNumberOfOneThing, ast, scope.typeEnvironment)?.unnamedArgs[0]
    if (read === undefined) return undefined
    const literal = l.tryParse(primitive, read, scope.typeEnvironment)
    // what the parser matched is the argument of the call it was given, and carries what it carries
    return { value: literal === undefined ? undefined : asNumber(literal), read: read as UrbanStatsASTExpression<M> }
}

/**
 * A script read for its units, with whatever the units want written into it: the numbers it carries
 * say what they are numbers of, and the unit is what the whole thing works out to.
 */
export interface UnitCheck<T> {
    ast: T
    unit: StoredUnit | undefined
    named: Bindings
}

export function unitCheck<M>(program: MapUSS<M>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<MapUSS<M & ReadInUnits>>
export function unitCheck<M>(program: UrbanStatsASTStatement<M>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<Statement>
export function unitCheck<M>(program: UrbanStatsASTExpression<M>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<Expression>
export function unitCheck(program: UrbanStatsASTExpression<ReadInUnits> | UrbanStatsASTStatement<ReadInUnits>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<Expression | Statement> {
    const scope: Scope = { typeEnvironment, named: new Map() }
    const wanted: Expected = expected === undefined ? anything : { kind: 'in', unit: expected }
    const checked = isExpression(program)
        ? checkExpression(program, scope, wanted)
        : checkStatement(program, scope, wanted)
    return { ast: checked.ast, unit: unitToWriteIn(quantity(checked.value)), named: scope.named }
}

/** What an expression of a script works out to, read against what the whole script made of it. */
export function unitWithin(ast: Expression, typeEnvironment: TypeEnvironment, named: Bindings): AbstractInterpValue {
    return quantity(checkExpression(ast, { typeEnvironment, named: new Map(named) }, anything).value)
}

function isExpression(ast: UrbanStatsASTExpression<ReadInUnits> | UrbanStatsASTStatement<ReadInUnits>): ast is UrbanStatsASTExpression<ReadInUnits> {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}
