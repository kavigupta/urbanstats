import { MapUSS } from '../mapper/settings/map-uss'
import { dimensionless, multiplies, sameDimensions, StoredUnit, unitProduct } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'
import { AbstractInterpValue, backward, constant, forward, forwardUnary, inUnit, join, manyOf, sameSize, scalesOperands, unitToWriteIn } from './unit-algebra'

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

/** Whether a value of one unit goes where the other is wanted, without anything written in. */
function goesWhere(want: StoredUnit, got: StoredUnit): boolean {
    return sameDimensions(want, got) && sameSize(want.toBaseUnits, got.toBaseUnits)
}

/**
 * The expression less a zero of what it is counted in, which is the same number and no longer read
 * from that zero: a temperature so many degrees above freezing is so many degrees.
 */
function lessAZero(ast: Expression, unit: StoredUnit): Expression {
    return withAZero('-', ast, unit)
}

/** The expression plus a zero of what is expected, which reads it from that zero. */
function plusAZero(ast: Expression, unit: StoredUnit): Expression {
    return withAZero('+', ast, unit)
}

function withAZero(operator: '+' | '-', ast: Expression, unit: StoredUnit): Expression {
    const location = locationOf(ast)
    return {
        type: 'binaryOperator',
        operator: { node: operator, location },
        left: ast,
        right: { type: 'constant', value: { node: { type: 'number', value: 0 }, location }, readIn: unit },
    }
}

/** The expression counted from nothing rather than from a zero of its own, which is what scales. */
function withoutItsZero(checked: Checked<Expression>, got: AbstractInterpValue & { kind: 'in' }): Checked<Expression> {
    return { ast: lessAZero(checked.ast, got.unit), value: forward('-', got, inUnit(got.unit)) }
}

/** The same unit, counted from nothing rather than from a zero of its own. */
function asADifference(unit: StoredUnit): StoredUnit {
    return { ...unit, unit: { ...unit.unit, times: 0 } }
}

/** A number of nothing, which is what a share is not: a share is a number of a hundredth. */
const plainNumber = { kind: 'in', unit: dimensionless } satisfies Expected

function isPlainNumber(unit: StoredUnit): boolean {
    return unit.unit.dimensions.length === 0 && sameSize(unit.toBaseUnits, 1) && unit.unit.decoration.kind === 'none'
}

/**
 * An expression made to be what is expected of it, by writing in whatever says so: a plain number
 * is what a quantity is counted as, which is what toNumber says, and anything else is a factor.
 * Neither changes what the script computes, a factor being a one.
 */
function reconciled(checked: Checked<Expression>, expected: Expected): Checked<Expression> {
    const got = quantity(checked.value)
    if (expected.kind === 'scales') {
        return scaling(checked)
    }
    if (expected.kind !== 'in' || got.kind !== 'in') {
        return checked
    }
    if (isPlainNumber(expected.unit) && !isPlainNumber(got.unit)) {
        return { ast: readAsANumberOf(checked.ast, got.unit), value: inUnit(dimensionless) }
    }
    if (goesWhere(expected.unit, got.unit)) {
        return checked
    }
    // nothing scales a reading, which is counted from a zero of its own, so the zero comes off
    // what there is, leaving a difference, and goes back on where a reading is what is wanted
    const wanted = multiplies(expected.unit.unit) ? expected.unit : asADifference(expected.unit)
    const takeTheZeroOut = !multiplies(got.unit.unit) || (wanted.unit.times === 0 && got.unit.unit.times !== 0)
    const from = takeTheZeroOut ? forward('-', got, inUnit(got.unit)) : got
    if (from.kind !== 'in') {
        return { ast: checked.ast, value: { kind: 'none' } }
    }
    const factor = unitProduct(wanted, from.unit, -1)
    if (factor === undefined) {
        return { ast: checked.ast, value: { kind: 'none' } }
    }
    let ast = takeTheZeroOut ? lessAZero(checked.ast, got.unit) : checked.ast
    let value: AbstractInterpValue = from
    if (!goesWhere(wanted, from.unit)) {
        ast = timesAFactor(ast, factor)
        value = forward('*', from, inUnit(factor))
    }
    // a reading is what is wanted only where the unit says so: one of itself, from a zero of its own
    if (expected.unit.unit.times === 1 && !expected.unit.unit.baseIsScalar) {
        return { ast: plusAZero(ast, expected.unit), value: forward('+', value, inUnit(expected.unit)) }
    }
    return { ast, value }
}

/** What is expected, as a value: scaling is no unit in particular, so it says nothing. */
function knownOf(expected: Expected): AbstractInterpValue {
    return expected.kind === 'scales' ? anything : expected
}

function checkOperation(ast: UrbanStatsASTExpression<ReadInUnits> & { type: 'binaryOperator' }, scope: Scope, expected: Expected): Checked<Expression> {
    const operator = ast.operator.node
    const left = checkExpression(ast.left, scope, expectation(backward(operator, knownOf(expected), anything, 'left')))
    const right = checkExpression(ast.right, scope, expectation(backward(operator, knownOf(expected), quantity(left.value), 'right')))
    // a literal on the left is read from what the right came to, 80 < high_temp being a temperature
    const reread = quantity(left.value).kind === 'any' && quantity(right.value).kind === 'in'
        ? checkExpression(ast.left, scope, expectation(backward(operator, knownOf(expected), quantity(right.value), 'left')))
        : left
    // each side has been made what the other wanted of it, so what they come to is what they are
    const value = forward(operator, quantity(reread.value), quantity(right.value))
    if (value.kind !== 'none' || !scalesOperands(operator)) {
        return { ast: ({ ...ast, left: reread.ast, right: right.ast }), value }
    }
    // and where they do not scale together, the zero a reading is counted from comes out: an area
    // of so many degrees is an area of a difference of two temperatures
    const [over, under] = [scaling(reread), scaling(right)]
    return {
        ast: ({ ...ast, left: over.ast, right: under.ast }),
        value: forward(operator, quantity(over.value), quantity(under.value)),
    }
}

function scaling(checked: Checked<Expression>): Checked<Expression> {
    const got = quantity(checked.value)
    return got.kind === 'in' && !multiplies(got.unit.unit) ? withoutItsZero(checked, got) : checked
}

/** What each argument is expected to be in, which is what the call makes of the ones before it. */
function expectedOfArgument(propagation: UnitPropagation | undefined, expected: Expected, index: number, before: AbstractInterpValue[]): Expected {
    if (propagation?.kind === 'unchanged') {
        return expected
    }
    // a root of a temperature is a root of a difference of two, there being no scaling a reading
    if (propagation?.kind === 'power') {
        return { kind: 'scales' }
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
    const readIn = readAsANumber(ast, scope) === undefined ? undefined : unitToWriteIn(knownOf(expected)) ?? ast.readIn
    const checked: { arg: UrbanStatsASTArg<ReadInUnits>, value: Inferred }[] = []
    for (const [index, arg] of ast.args.entries()) {
        const before = checked.filter(({ arg: each }) => each.type === 'unnamed').map(({ value }) => quantity(value))
        const each = checkExpression(arg.value, scope, expectedOfArgument(propagation, expected, index, before))
        checked.push({ arg: ({ ...arg, value: each.ast }), value: each.value })
    }
    if (propagation?.kind === 'number') {
        for (const each of checked) {
            const asANumber = reconciled({ ast: each.arg.value, value: each.value }, plainNumber)
            each.arg = { ...each.arg, value: asANumber.ast }
            each.value = asANumber.value
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
/**
 * What is expected of one of several things that are all of a kind: what is expected of the whole,
 * where anything is, and otherwise what the first of them turned out to be.
 */
function alsoOf(expected: Expected, first: Inferred | undefined): Expected {
    if (expected.kind === 'in' || first === undefined) {
        return expected
    }
    return expectation(quantity(first))
}

function checkExpression(ast: UrbanStatsASTExpression<ReadInUnits>, scope: Scope, expected: Expected): Checked<Expression> {
    return reconciled(checkWithin(ast, scope, expected), expected)
}

function checkWithin(ast: UrbanStatsASTExpression<ReadInUnits>, scope: Scope, expected: Expected): Checked<Expression> {
    switch (ast.type) {
        case 'identifier':
            return { ast, value: identifier(ast.name.node, scope) }
        case 'constant': {
            if (ast.value.node.type !== 'number') {
                return { ast, value: anything }
            }
            // the 0.1 of commute_bike < 0.1 is a share, and is written 10%
            // what a number was already read as stands, so that reading a script twice says the
            // same: the 0 of (area - 0) is an area, where a sum of unknowns says only its dimensions
            const unit = ast.readIn ?? unitToWriteIn(knownOf(expected))
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
            // the first element says what kind the rest are of, where nothing else does
            const elements: Checked<Expression>[] = []
            for (const element of ast.elements) {
                elements.push(checkExpression(element, scope, alsoOf(expected, elements[0]?.value)))
            }
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
            const alternative = ast.else === undefined ? undefined : checkBranch(ast.else, scope, alsoOf(expected, consequent.value))
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
type Expected = { kind: 'any' } | { kind: 'none' } | { kind: 'in', unit: StoredUnit } | { kind: 'scales' }

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
    const wanted = wanting(expected)
    const checked = isExpression(program)
        ? checkExpression(program, scope, wanted)
        : checkStatement(program, scope, wanted)
    return { ast: checked.ast, unit: unitToWriteIn(quantity(checked.value)), named: scope.named }
}

/** What an expression of a script works out to, read against what the whole script made of it. */
export function unitWithin(ast: Expression, typeEnvironment: TypeEnvironment, named: Bindings, expected?: StoredUnit): AbstractInterpValue {
    return quantity(checkExpression(ast, { typeEnvironment, named: new Map(named) }, wanting(expected)).value)
}

function wanting(expected: StoredUnit | undefined): Expected {
    return expected === undefined ? anything : { kind: 'in', unit: expected }
}

function isExpression(ast: UrbanStatsASTExpression<ReadInUnits> | UrbanStatsASTStatement<ReadInUnits>): ast is UrbanStatsASTExpression<ReadInUnits> {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}
