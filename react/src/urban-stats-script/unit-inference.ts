import { MapUSS } from '../mapper/settings/map-uss'
import { asADifference, dimensionless, isPlainNumber, multiplies, sameDimensions, sameSize, StoredUnit } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'
import { AbstractInterpValue, backward, constant, forward, forwardUnary, inUnit, join, manyOf, scalesOperands, unitToWriteIn } from './unit-algebra'

/**
 * Recorded on a node whose unit is not the one needed there. The script computes the same
 * number either way: only how it is read changes.
 */
export interface UnitConversion {
    /** What the value is counted in, or nothing where the script says. */
    internalUnit?: StoredUnit
    /** What it is needed as. */
    expectedUnit: StoredUnit
}

/** What reading a script for its units leaves on a node. */
export interface UnitsRead {
    converted?: UnitConversion
}

type Expression = UrbanStatsASTExpression<UnitsRead>
type Statement = UrbanStatsASTStatement<UnitsRead>

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
function checkBlock(statements: UrbanStatsASTStatement<UnitsRead>[], scope: Scope, expected: Expected): Checked<Statement[]> {
    const checked = statements.map((statement, index) => checkStatement(statement, scope, index === statements.length - 1 ? expected : anything))
    return { ast: checked.map(each => each.ast), value: checked[checked.length - 1]?.value ?? anything }
}

function checkBranch(statement: UrbanStatsASTStatement<UnitsRead>, scope: Scope, expected: Expected): Checked<Statement> & { named: Bindings } {
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

/** Whether a value in `got` can be used where `want` is expected, unconverted. */
function goesWhere(want: StoredUnit, got: StoredUnit): boolean {
    // a share is stored as a fraction and shown as a percentage, so a caption says so when one is
    // read as a plain number. Any other decoration only says how a statistic names its own units.
    const justOneIsAShare = [want, got].some(({ unit }) => unit.decoration.kind === 'percent')
        && want.unit.decoration.kind !== got.unit.decoration.kind
    return sameDimensions(want, got) && sameSize(want.toBaseUnits, got.toBaseUnits)
        && want.unit.baseIsScalar === got.unit.baseIsScalar && !justOneIsAShare
}

/** What a call that gives a plain number back expects of its arguments. */
const plainNumber = { kind: 'in', unit: dimensionless } satisfies Expected

/** Records a conversion on the expression where its unit is not the one expected of it. */
function reconciled(checked: Checked<Expression>, expected: Expected): Checked<Expression> {
    const got = quantity(checked.value)
    if (expected.kind === 'scales') {
        return scaling(checked)
    }
    if (expected.kind !== 'in') {
        return checked
    }
    if (got.kind === 'none') {
        return checked
    }
    // a literal is written in the expected unit instead, in the constant case below. Anything
    // else with no unit of its own is converted: the geoName of "density > toNumber(geoName)" is
    // read as a density
    if (got.kind === 'any') {
        const opaque = got.constant === undefined && !isPlainNumber(expected.unit)
        return opaque ? converted(checked, undefined, expected.unit) : checked
    }
    if (goesWhere(expected.unit, got.unit)) {
        return checked
    }
    return converted(checked, got.unit, expected.unit)
}

function converted(checked: Checked<Expression>, internalUnit: StoredUnit | undefined, expectedUnit: StoredUnit): Checked<Expression> {
    return {
        ast: { ...checked.ast, converted: { internalUnit, expectedUnit } },
        value: inUnit(comesTo(internalUnit, expectedUnit)),
    }
}

/**
 * The unit a conversion produces. Converting a reading subtracts the zero it is counted from, so
 * the result is a difference unless a reading is wanted. An expected unit that does not say its
 * coefficient is taken as a reading if it counts from zero, and as a difference if not.
 */
function comesTo(internalUnit: StoredUnit | undefined, expectedUnit: StoredUnit): StoredUnit {
    const { times, baseIsScalar } = expectedUnit.unit
    if (times === 1 && !baseIsScalar) {
        return expectedUnit
    }
    if (internalUnit !== undefined && !multiplies(internalUnit.unit)) {
        return asADifference(expectedUnit)
    }
    return times === 'unknown' ? { ...expectedUnit, unit: { ...expectedUnit.unit, times: baseIsScalar ? 1 : 0 } } : expectedUnit
}

/** The expectation as a value. 'scales' names no unit, so it says nothing. */
function knownOf(expected: Expected): AbstractInterpValue {
    return expected.kind === 'scales' ? anything : expected
}

function checkOperation(ast: UrbanStatsASTExpression<UnitsRead> & { type: 'binaryOperator' }, scope: Scope, expected: Expected): Checked<Expression> {
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
    // they do not scale together, so a reading is converted to a difference, which a caption
    // writes as (temp - 0) * area
    const [over, under] = [scaling(reread), scaling(right)]
    return {
        ast: ({ ...ast, left: over.ast, right: under.ast }),
        value: forward(operator, quantity(over.value), quantity(under.value)),
    }
}

/** A reading read as the difference above its own zero, which is what scales. */
function scaling(checked: Checked<Expression>): Checked<Expression> {
    const got = quantity(checked.value)
    return got.kind === 'in' && !multiplies(got.unit.unit) ? converted(checked, got.unit, asADifference(got.unit)) : checked
}

/** What an argument is expected to be in, given the arguments before it. */
function expectedOfArgument(propagation: UnitPropagation | undefined, expected: Expected, index: number, before: AbstractInterpValue[]): Expected {
    if (propagation?.kind === 'unchanged') {
        return expected
    }
    // a root of a temperature is a root of a difference, written sqrt(high_temp - 0)
    if (propagation?.kind === 'power') {
        return { kind: 'scales' }
    }
    // max and min take both arguments in one unit, so each is expected to be in the first's unit
    if (propagation?.kind !== 'either' && propagation?.kind !== 'rank') {
        return anything
    }
    return index === 0 && expected.kind === 'in' ? expected : expectation(before[0] ?? anything)
}

/**
 * The intercept is in the units of what was regressed, the residuals are a difference of those,
 * and each coefficient is that difference over a difference of the parameter it belongs to.
 */
function regressionFields(args: { arg: UrbanStatsASTArg<UnitsRead>, value: Inferred }[]): Inferred {
    const named = (name: string): AbstractInterpValue | undefined =>
        args.filter(({ arg }) => arg.type === 'named' && arg.name.node === name).map(({ value }) => quantity(value))[0]
    const level = named('y') ?? anything
    const change = forward('-', level, level)
    const fields = new Map<string, AbstractInterpValue>([['b', level], ['residuals', change], ['r2', inUnit(dimensionless)]])
    for (const { arg, value } of args) {
        const parameter = arg.type === 'named' ? parameterName.exec(arg.name.node) : null
        if (parameter !== null) {
            const parameterValue = quantity(value)
            fields.set(`m${parameter[1]}`, forward('/', change, forward('-', parameterValue, parameterValue)))
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

/**
 * The unit a call states of what it draws: cMap(data=..., unit=unitContaminantLevel) says the map
 * is in that unit, whatever the script computes, so the data is read as converted into it.
 */
function statedUnitOf(ast: UrbanStatsASTExpression<UnitsRead> & { type: 'call' }, scope: Scope): StoredUnit | undefined {
    const stated = ast.args.find(arg => arg.type === 'named' && arg.name.node === 'unit')?.value
    if (stated?.type !== 'identifier') {
        return undefined
    }
    const names = scope.typeEnvironment.get(stated.name.node)?.documentation?.namesUnit
    return names === undefined ? undefined : unitTypeToStoredUnit(names)
}

/** The arguments a stated unit is stated of: the map's data and the table column's values. */
const drawnBy = ['data', 'values']

function checkCall(ast: UrbanStatsASTExpression<UnitsRead> & { type: 'call' }, scope: Scope, expected: Expected): Checked<Expression> {
    const propagation = propagationOf(ast.fn, scope)
    const stated = statedUnitOf(ast, scope)
    const checked: { arg: UrbanStatsASTArg<UnitsRead>, value: Inferred }[] = []
    for (const [index, arg] of ast.args.entries()) {
        const before = checked.filter(({ arg: each }) => each.type === 'unnamed').map(({ value }) => quantity(value))
        const draws = stated !== undefined && arg.type === 'named' && drawnBy.includes(arg.name.node)
        const wanted = draws ? { kind: 'in' as const, unit: stated } : expectedOfArgument(propagation, expected, index, before)
        const each = checkExpression(arg.value, scope, wanted)
        checked.push({ arg: ({ ...arg, value: each.ast }), value: each.value })
    }
    if (propagation?.kind === 'number') {
        for (const each of checked) {
            const asANumber = reconciled({ ast: each.arg.value, value: each.value }, plainNumber)
            each.arg = { ...each.arg, value: asANumber.ast }
            each.value = asANumber.value
        }
    }
    const rewritten = { ...ast, args: checked.map(({ arg }) => arg) }
    if (propagation === undefined) {
        return { ast: rewritten, value: anything }
    }
    if (propagation.kind === 'regression') {
        return { ast: rewritten, value: regressionFields(checked) }
    }
    const positional = checked.filter(({ arg }) => arg.type === 'unnamed').map(({ value }) => quantity(value))
    return { ast: rewritten, value: whatItGives(propagation, positional) }
}

/** What to expect of several things that share a unit: the caller's expectation, or the first's unit. */
function alsoOf(expected: Expected, first: Inferred | undefined): Expected {
    if (expected.kind === 'in' || first === undefined) {
        return expected
    }
    return expectation(quantity(first))
}

/**
 * Reads an expression for its unit, recording a conversion wherever its unit is not the one needed.
 * Nothing about what the script computes changes.
 */
function checkExpression(ast: UrbanStatsASTExpression<UnitsRead>, scope: Scope, expected: Expected): Checked<Expression> {
    return reconciled(checkWithin(ast, scope, expected), expected)
}

function checkWithin(ast: UrbanStatsASTExpression<UnitsRead>, scope: Scope, expected: Expected): Checked<Expression> {
    switch (ast.type) {
        case 'identifier':
            return { ast, value: identifier(ast.name.node, scope) }
        case 'constant': {
            if (ast.value.node.type !== 'number') {
                return { ast, value: anything }
            }
            // a number already read keeps that unit, so reading a checked script again gives the
            // same answer. Otherwise it takes what is expected: the 0.1 of commute_bike < 0.1 is a
            // share, and is written 10%
            const unit = ast.converted?.expectedUnit ?? unitToWriteIn(knownOf(expected))
            if (unit === undefined) {
                return { ast, value: constant(ast.value.node.value) }
            }
            return { ast: ({ ...ast, converted: { expectedUnit: unit } }), value: inUnit(unit) }
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

function checkStatement(ast: UrbanStatsASTStatement<UnitsRead>, scope: Scope, expected: Expected): Checked<Statement> {
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
            // a filter says nothing about the units of what it keeps, but is still rendered
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
function readAsANumber<M>(ast: UrbanStatsASTExpression<M>, scope: Scope): { value?: number, read: UrbanStatsASTExpression<M> } | undefined {
    // a script that binds the name itself is calling something else
    if (scope.named.has('toNumber')) return undefined
    const read = l.tryParse(toNumberOfOneThing, ast, scope.typeEnvironment)?.unnamedArgs[0]
    if (read === undefined) return undefined
    const literal = l.tryParse(primitive, read, scope.typeEnvironment)
    // the parser returns the argument of the call it was given, so it carries the same metadata
    return { value: literal === undefined ? undefined : asNumber(literal), read: read as UrbanStatsASTExpression<M> }
}

/** A checked script: the rewritten AST, the unit it works out to, and the names it bound. */
export interface UnitCheck<T> {
    ast: T
    unit: StoredUnit | undefined
    named: Bindings
}

export function unitCheck<M>(program: MapUSS<M>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<MapUSS<M & UnitsRead>>
export function unitCheck<M>(program: UrbanStatsASTStatement<M>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<Statement>
export function unitCheck<M>(program: UrbanStatsASTExpression<M>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<Expression>
export function unitCheck(program: UrbanStatsASTExpression<UnitsRead> | UrbanStatsASTStatement<UnitsRead>, typeEnvironment: TypeEnvironment, expected?: StoredUnit): UnitCheck<Expression | Statement> {
    const scope: Scope = { typeEnvironment, named: new Map() }
    const wanted = wanting(expected)
    // the toNumbers are removed first, so that the units are read from an ordinary script
    const read = withoutToNumbers(program, typeEnvironment)
    const checked = isExpression(read)
        ? checkExpression(read, scope, wanted)
        : checkStatement(read, scope, wanted)
    return { ast: checked.ast, unit: unitToWriteIn(quantity(checked.value)), named: scope.named }
}

/**
 * Reads one expression of a script, given the names the rest of the script bound and a unit
 * expected of this expression alone.
 */
export function unitWithin(ast: Expression, typeEnvironment: TypeEnvironment, named: Bindings, expected?: StoredUnit): AbstractInterpValue {
    return quantity(checkExpression(ast, { typeEnvironment, named: new Map(named) }, wanting(expected)).value)
}

function wanting(expected: StoredUnit | undefined): Expected {
    return expected === undefined ? anything : { kind: 'in', unit: expected }
}

function isExpression(ast: UrbanStatsASTExpression<UnitsRead> | UrbanStatsASTStatement<UnitsRead>): ast is UrbanStatsASTExpression<UnitsRead> {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}

/**
 * The script with every toNumber replaced by its argument. Reading the units then works on an
 * ordinary tree, and records the argument as being read as a plain number.
 */
function withoutToNumbers<T extends UrbanStatsASTExpression<UnitsRead> | UrbanStatsASTStatement<UnitsRead>>(program: T, typeEnvironment: TypeEnvironment): T {
    const stripped = isExpression(program)
        ? strippedExpression(program, typeEnvironment)
        : strippedStatement(program, typeEnvironment)
    return stripped as T
}

function strippedExpression(ast: UrbanStatsASTExpression<UnitsRead>, typeEnvironment: TypeEnvironment): Expression {
    const within = strippedWithin(ast, typeEnvironment)
    const toNumber = readAsANumber(within, { typeEnvironment, named: new Map() })
    if (toNumber === undefined) {
        return within
    }
    // toNumber("1000") is just the number 1000, so it becomes that
    if (toNumber.value !== undefined) {
        return { type: 'constant', value: { node: { type: 'number', value: toNumber.value }, location: locationOf(within) } }
    }
    return toNumber.read
}

function strippedStatement(ast: UrbanStatsASTStatement<UnitsRead>, typeEnvironment: TypeEnvironment): Statement {
    const stripped = (each: UrbanStatsASTExpression<UnitsRead>): Expression => strippedExpression(each, typeEnvironment)
    const statements = (each: UrbanStatsASTStatement<UnitsRead>[]): Statement[] => each.map(one => strippedStatement(one, typeEnvironment))
    switch (ast.type) {
        case 'parseError':
            return ast
        case 'assignment':
            return { ...ast, value: stripped(ast.value) }
        case 'expression':
            return { ...ast, value: stripped(ast.value) }
        case 'statements':
            return { ...ast, result: statements(ast.result) }
        case 'condition':
            return { ...ast, condition: stripped(ast.condition), rest: statements(ast.rest) }
    }
}

function strippedWithin(ast: UrbanStatsASTExpression<UnitsRead>, typeEnvironment: TypeEnvironment): Expression {
    const stripped = (each: UrbanStatsASTExpression<UnitsRead>): Expression => strippedExpression(each, typeEnvironment)
    switch (ast.type) {
        case 'identifier':
        case 'constant':
            return ast
        case 'attribute':
            return { ...ast, expr: stripped(ast.expr) }
        case 'call':
            return { ...ast, fn: stripped(ast.fn), args: ast.args.map(arg => ({ ...arg, value: stripped(arg.value) })) }
        case 'binaryOperator':
            return { ...ast, left: stripped(ast.left), right: stripped(ast.right) }
        case 'unaryOperator':
            return { ...ast, expr: stripped(ast.expr) }
        case 'objectLiteral':
            return { ...ast, properties: ast.properties.map(([name, value]): [string, Expression] => [name, stripped(value)]) }
        case 'vectorLiteral':
            return { ...ast, elements: ast.elements.map(stripped) }
        case 'if':
            return {
                ...ast,
                condition: stripped(ast.condition),
                then: strippedStatement(ast.then, typeEnvironment),
                ...ast.else === undefined ? {} : { else: strippedStatement(ast.else, typeEnvironment) },
            }
        case 'do':
            return { ...ast, statements: ast.statements.map(each => strippedStatement(each, typeEnvironment)) }
        case 'customNode':
            return { ...ast, expr: strippedStatement(ast.expr, typeEnvironment) }
        case 'autoUXNode':
            return { ...ast, expr: stripped(ast.expr) }
    }
}
