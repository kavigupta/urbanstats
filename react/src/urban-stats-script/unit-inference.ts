import { MapUSS } from '../mapper/settings/map-uss'
import { dimensionless, multiplies, sameDimensions, StoredUnit, unitProduct } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'
import { AbstractInterpValue, backward, constant, forward, forwardUnary, inUnit, join, manyOf, sameSize, scalesOperands, unitToWriteIn } from './unit-algebra'

/** The unit of the number a caption writes at this node. Set on literals and on toNumber calls. */
export interface ReadInUnits {
    /** The unit of the number written here: a literal is written in it, anything else counted in it. */
    readIn?: StoredUnit
    /** The unit a number that has none of its own is taken to be in. */
    readAs?: StoredUnit
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

/** A rewritten expression and the unit it works out to. */
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

/** How the function propagates units, or nothing if the script bound that name itself. */
function propagationOf(fn: Expression, scope: Scope): UnitPropagation | undefined {
    if (fn.type !== 'identifier' || scope.named.has(fn.name.node)) {
        return undefined
    }
    return scope.typeEnvironment.get(fn.name.node)?.documentation?.unitPropagation
}

/** The expression times a 1 in `factor`. The 1 carries the unit, so a caption can write it. */
function timesAFactor(ast: Expression, factor: StoredUnit): Expression {
    const location = locationOf(ast)
    return ({
        type: 'binaryOperator',
        operator: { node: '*', location },
        left: ast,
        right: ({ type: 'constant', value: { node: { type: 'number', value: 1 }, location }, readIn: factor }),
    })
}

/** The expression wrapped in toNumber, which a caption writes as "[in °F]". */
function readAsANumberOf(ast: Expression, unit: StoredUnit): Expression {
    return { ...ast, readIn: unit }
}

/** Whether a value in `got` can be used where `want` is expected, with nothing written in. */
function goesWhere(want: StoredUnit, got: StoredUnit): boolean {
    return sameDimensions(want, got) && sameSize(want.toBaseUnits, got.toBaseUnits)
}

/** The expression minus a 0 in its own unit: the same number, read as a difference. */
function lessAZero(ast: Expression, unit: StoredUnit): Expression {
    return withAZero('-', ast, unit)
}

/** The expression plus a 0 in `unit`: the same number, read as a reading. */
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

/** `lessAZero`, applied to an expression that has already been checked. */
function withoutItsZero(checked: Checked<Expression>, got: AbstractInterpValue & { kind: 'in' }): Checked<Expression> {
    return { ast: lessAZero(checked.ast, got.unit), value: forward('-', got, inUnit(got.unit)) }
}

/** The same unit with times 0: a difference rather than a reading. */
function asADifference(unit: StoredUnit): StoredUnit {
    return { ...unit, unit: { ...unit.unit, times: 0 } }
}

/** Dimensionless and undecorated. A share is not this: it carries a percent decoration. */
const plainNumber = { kind: 'in', unit: dimensionless } satisfies Expected

function isPlainNumber(unit: StoredUnit): boolean {
    return unit.unit.dimensions.length === 0 && sameSize(unit.toBaseUnits, 1) && unit.unit.decoration.kind === 'none'
}

/**
 * Rewrites an expression to be what is expected of it: a toNumber where a plain number is wanted,
 * a factor otherwise. Neither changes what the script computes.
 */
function reconciled(checked: Checked<Expression>, expected: Expected): Checked<Expression> {
    const got = quantity(checked.value)
    if (expected.kind === 'scales') {
        return scaling(checked)
    }
    if (expected.kind !== 'in') {
        return checked
    }
    if (got.kind !== 'in') {
        // nothing says what unit this is, so the script is read as reading it in the one wanted:
        // the geoName of density > toNumber(geoName) is read as a number of them per square km
        const opaque = got.kind === 'any' && got.constant === undefined && !isPlainNumber(expected.unit)
        return opaque ? { ast: { ...checked.ast, readAs: expected.unit }, value: inUnit(expected.unit) } : checked
    }
    if (isPlainNumber(expected.unit) && !isPlainNumber(got.unit)) {
        return { ast: readAsANumberOf(checked.ast, got.unit), value: anything }
    }
    if (goesWhere(expected.unit, got.unit)) {
        return checked
    }
    // a reading does not scale, so its zero comes off first and goes back on if one is wanted
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
    // times 1 on a unit with a zero of its own means a reading rather than a difference
    if (expected.unit.unit.times === 1 && !expected.unit.unit.baseIsScalar) {
        return { ast: plusAZero(ast, expected.unit), value: forward('+', value, inUnit(expected.unit)) }
    }
    return { ast, value }
}

/** The expectation as a value. 'scales' names no unit, so it says nothing. */
function knownOf(expected: Expected): AbstractInterpValue {
    return expected.kind === 'scales' ? anything : expected
}

function checkOperation(ast: UrbanStatsASTExpression<ReadInUnits> & { type: 'binaryOperator' }, scope: Scope, expected: Expected): Checked<Expression> {
    const operator = ast.operator.node
    const left = checkExpression(ast.left, scope, expectation(backward(operator, knownOf(expected), anything, 'left')))
    const right = checkExpression(ast.right, scope, expectation(backward(operator, knownOf(expected), quantity(left.value), 'right')))
    // re-read the left now the right is known, so the 80 of 80 < high_temp is a temperature
    const reread = quantity(left.value).kind === 'any' && quantity(right.value).kind === 'in'
        ? checkExpression(ast.left, scope, expectation(backward(operator, knownOf(expected), quantity(right.value), 'left')))
        : left
    const value = forward(operator, quantity(reread.value), quantity(right.value))
    if (value.kind !== 'none' || !scalesOperands(operator)) {
        return { ast: ({ ...ast, left: reread.ast, right: right.ast }), value }
    }
    // they do not scale together, so a reading gives up its zero: temp * area is (temp - 0) * area
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

/** What an argument is expected to be in, given the arguments before it. */
function expectedOfArgument(propagation: UnitPropagation | undefined, expected: Expected, index: number, before: AbstractInterpValue[]): Expected {
    if (propagation?.kind === 'unchanged') {
        return expected
    }
    // a root of a temperature is a root of a difference: sqrt(high_temp - 0)
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
    // a caption writes a number here, so the call carries the unit that number is in
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
 * Reads an expression for its unit, writing in the factors and toNumbers the units need. What the
 * script computes is untouched: a factor is a 1, and a toNumber changes no value.
 */
/**
 * What to expect of each of several things that have to share a unit: what the caller expects, or
 * failing that what the first of them turned out to be.
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
            // keep what a number was already read as, so re-reading a checked script agrees: read
            // afresh, the 0 of (area - 0) says only its dimensions
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
            // the first element sets the unit for the rest
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
            // a filter says nothing about the units of what it keeps, but a caption renders it
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
    // the parser gives back the argument of the call it was given, which carries the same metadata
    return { value: literal === undefined ? undefined : asNumber(literal), read: read as UrbanStatsASTExpression<M> }
}

/** A checked script: the rewritten AST, the unit it works out to, and the names it bound. */
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
    // the toNumbers come out first, so that what is read for its units is an ordinary script
    const read = withoutToNumbers(program, typeEnvironment)
    const checked = isExpression(read)
        ? checkExpression(read, scope, wanted)
        : checkStatement(read, scope, wanted)
    return { ast: checked.ast, unit: unitToWriteIn(quantity(checked.value)), named: scope.named }
}

/** The unit an expression works out to, given the names the whole script bound. */
export function unitWithin(ast: Expression, typeEnvironment: TypeEnvironment, named: Bindings, expected?: StoredUnit): AbstractInterpValue {
    return quantity(checkExpression(ast, { typeEnvironment, named: new Map(named) }, wanting(expected)).value)
}

function wanting(expected: StoredUnit | undefined): Expected {
    return expected === undefined ? anything : { kind: 'in', unit: expected }
}

function isExpression(ast: UrbanStatsASTExpression<ReadInUnits> | UrbanStatsASTStatement<ReadInUnits>): ast is UrbanStatsASTExpression<ReadInUnits> {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}

/**
 * A script with the toNumbers a reader wrote taken out, each leaving behind the note that what it
 * held is read as a plain number. Reading the script for its units then says which unit that was.
 */
export function withoutToNumbers<T extends UrbanStatsASTExpression<ReadInUnits> | UrbanStatsASTStatement<ReadInUnits>>(program: T, typeEnvironment: TypeEnvironment): T {
    const stripped = isExpression(program)
        ? strippedExpression(program, typeEnvironment)
        : strippedStatement(program, typeEnvironment)
    return stripped as T
}

function strippedExpression(ast: UrbanStatsASTExpression<ReadInUnits>, typeEnvironment: TypeEnvironment): Expression {
    const within = strippedWithin(ast, typeEnvironment)
    const toNumber = readAsANumber(within, { typeEnvironment, named: new Map() })
    if (toNumber === undefined) {
        return within
    }
    // what it held is a number already, where the script wrote one out the long way
    if (toNumber.value !== undefined) {
        return { type: 'constant', value: { node: { type: 'number', value: toNumber.value }, location: locationOf(within) } }
    }
    return toNumber.read
}

function strippedStatement(ast: UrbanStatsASTStatement<ReadInUnits>, typeEnvironment: TypeEnvironment): Statement {
    const of = (each: UrbanStatsASTExpression<ReadInUnits>): Expression => strippedExpression(each, typeEnvironment)
    const statements = (each: UrbanStatsASTStatement<ReadInUnits>[]): Statement[] => each.map(one => strippedStatement(one, typeEnvironment))
    switch (ast.type) {
        case 'parseError':
            return ast
        case 'assignment':
            return { ...ast, value: of(ast.value) }
        case 'expression':
            return { ...ast, value: of(ast.value) }
        case 'statements':
            return { ...ast, result: statements(ast.result) }
        case 'condition':
            return { ...ast, condition: of(ast.condition), rest: statements(ast.rest) }
    }
}

function strippedWithin(ast: UrbanStatsASTExpression<ReadInUnits>, typeEnvironment: TypeEnvironment): Expression {
    const of = (each: UrbanStatsASTExpression<ReadInUnits>): Expression => strippedExpression(each, typeEnvironment)
    switch (ast.type) {
        case 'identifier':
        case 'constant':
            return ast
        case 'attribute':
            return { ...ast, expr: of(ast.expr) }
        case 'call':
            return { ...ast, fn: of(ast.fn), args: ast.args.map(arg => ({ ...arg, value: of(arg.value) })) }
        case 'binaryOperator':
            return { ...ast, left: of(ast.left), right: of(ast.right) }
        case 'unaryOperator':
            return { ...ast, expr: of(ast.expr) }
        case 'objectLiteral':
            return { ...ast, properties: ast.properties.map(([name, value]): [string, Expression] => [name, of(value)]) }
        case 'vectorLiteral':
            return { ...ast, elements: ast.elements.map(of) }
        case 'if':
            return {
                ...ast,
                condition: of(ast.condition),
                then: strippedStatement(ast.then, typeEnvironment),
                ...ast.else === undefined ? {} : { else: strippedStatement(ast.else, typeEnvironment) },
            }
        case 'do':
            return { ...ast, statements: ast.statements.map(each => strippedStatement(each, typeEnvironment)) }
        case 'customNode':
            return { ...ast, expr: strippedStatement(ast.expr, typeEnvironment) }
        case 'autoUXNode':
            return { ...ast, expr: of(ast.expr) }
    }
}
