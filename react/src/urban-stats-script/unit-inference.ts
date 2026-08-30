import { describeDimensions, describeStoredUnit, dimensionless, sameDimensions, StoredUnit, writableDimensions } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { LocInfo } from './location'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'
import { AbstractInterpValue, backward, constant, forward, forwardUnary, inUnit, join, manyOf, unitToWriteIn } from './unit-algebra'

const anything = { kind: 'any' } satisfies AbstractInterpValue

/** A script has objects in it as well as quantities, a regression's result being one. */
type UrbanStatsASTNode = UrbanStatsASTExpression | UrbanStatsASTStatement

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
        case 'either': {
            const other = argument(args, 1, scope)
            // Two known units must match, and the result is one of them, not their sum.
            if (value.kind === 'in' && other.kind === 'in') {
                return sameDimensions(value.unit, other.unit) ? join(value, other) : { kind: 'none' }
            }
            // A bare number takes the other argument's unit, as it does in a sum.
            return forward('+', value, other)
        }
        case 'rank': {
            // both arguments are in one unit, so there is no ranking a population among areas
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

/** The unit each numeric literal is written in, keyed by where in the source it was written. */
export type ConstantUnits = Map<string, StoredUnit>

/** We index by location to avoid depending on object identity: editing or reparsing makes new nodes. */
export function whereWritten(location: LocInfo): string {
    const where = location.start.block
    return `${where.type === 'single' ? where.ident : ''}:${location.start.charIdx}-${location.end.charIdx}`
}

const toNumberOfOneThing = l.call({
    fn: l.identifier('toNumber'),
    unnamedArgs: [l.passthrough()],
    namedArgs: {},
})

const primitive = l.union<USSPrimitiveRawValue>([l.number(), l.string(), l.boolean()])

/** A call to toNumber, carrying the number its argument is when the argument is a literal. */
export function readAsANumber(ast: UrbanStatsASTExpression, scope: Scope): { value?: number, read: UrbanStatsASTExpression } | undefined {
    // a script that binds the name itself is calling something else
    if (scope.named.has('toNumber')) return undefined
    const read = l.tryParse(toNumberOfOneThing, ast, scope.typeEnvironment)?.unnamedArgs[0]
    if (read === undefined) return undefined
    const literal = l.tryParse(primitive, read, scope.typeEnvironment)
    return { value: literal === undefined ? undefined : asNumber(literal), read }
}

/**
 * The unit each argument of a call is in, where the call reads a quantity and gives back a plain
 * number: a logarithm of a density is a number, and the caption has to say of what.
 */
export function unitsReadAndDropped(ast: UrbanStatsASTExpression, scope: Scope): (StoredUnit | undefined)[] | undefined {
    if (ast.type !== 'call' || propagationOf(ast.fn, scope)?.kind !== 'number') return undefined
    return ast.args.map(arg => unitToWriteIn(quantity(infer(arg.value, scope))))
}

function pushedInto(propagation: UnitPropagation | undefined, expected: Expected, args: UrbanStatsASTArg[], index: number, scope: Scope): Expected {
    if (propagation?.kind === 'unchanged') {
        return expected
    }
    // max and min take both arguments in one unit, so each is expected in the other's
    if (propagation?.kind !== 'either') {
        return anything
    }
    return expected.kind === 'in' ? expected : expectation(argument(args, 1 - index, scope))
}

/**
 * Pushes the unit an expression works out to back down through it, recording what each literal is
 * expected to be in: the 0.1 of commute_bike < 0.1 is a share, and is written 10%.
 */
function readBack(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, expected: Expected, scope: Scope, into: ConstantUnits): void {
    switch (ast.type) {
        case 'constant': {
            const unit = unitToWriteIn(expected)
            if (ast.value.node.type === 'number' && unit !== undefined && writableDimensions(unit.unit)) {
                into.set(whereWritten(ast.value.location), unit)
            }
            return
        }
        case 'expression':
        case 'assignment':
            readBack(ast.value, expected, scope, into)
            return
        case 'autoUXNode':
        case 'customNode':
            readBack(ast.expr, expected, scope, into)
            return
        case 'unaryOperator':
            // the sign is rendered outside the number, so -10 keeps the unit and reads -10°F
            readBack(ast.expr, ast.operator.node === '!' ? anything : expected, scope, into)
            return
        case 'binaryOperator': {
            const left = quantity(infer(ast.left, scope))
            const right = quantity(infer(ast.right, scope))
            readBack(ast.left, expectation(backward(ast.operator.node, expected, right, 'left')), scope, into)
            readBack(ast.right, expectation(backward(ast.operator.node, expected, left, 'right')), scope, into)
            return
        }
        case 'call': {
            const propagation = propagationOf(ast.fn, scope)
            // a caption writes a number where this call is, so record its unit as for a literal
            if (readAsANumber(ast, scope) !== undefined) {
                const unit = unitToWriteIn(expected)
                if (unit !== undefined && writableDimensions(unit.unit)) {
                    into.set(whereWritten(locationOf(ast)), unit)
                }
            }
            ast.args.forEach((arg, index) => { readBack(arg.value, pushedInto(propagation, expected, ast.args, index, scope), scope, into) })
            return
        }
        case 'vectorLiteral':
            ast.elements.forEach((element) => { readBack(element, expected, scope, into) })
            return
        case 'objectLiteral':
            ast.properties.forEach(([, value]) => { readBack(value, anything, scope, into) })
            return
        case 'if':
            readBack(ast.condition, anything, scope, into)
            readBack(ast.then, expected, scope, into)
            if (ast.else !== undefined) {
                readBack(ast.else, expected, scope, into)
            }
            return
        case 'do':
        case 'statements':
        case 'condition': {
            // a block works out to its last statement; a condition works out to nothing itself
            const statements = ast.type === 'do' ? ast.statements : (ast.type === 'statements' ? ast.result : ast.rest)
            if (ast.type === 'condition') {
                readBack(ast.condition, anything, scope, into)
            }
            statements.forEach((statement, index) => {
                readBack(statement, index === statements.length - 1 ? expected : anything, scope, into)
            })
            return
        }
        case 'identifier':
        case 'attribute':
        case 'parseError':
    }
}

/** The unit of each numeric literal in a script, where the script determines one. */
export function inferConstantUnits(program: UrbanStatsASTStatement | UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): ConstantUnits {
    const scope = { typeEnvironment, named: new Map() }
    infer(program, scope)
    const into: ConstantUnits = new Map()
    readBack(program, anything, scope, into)
    return into
}

const verbs: Partial<Record<string, string>> = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' }

function partsOf(ast: UrbanStatsASTNode): UrbanStatsASTNode[] {
    switch (ast.type) {
        case 'binaryOperator':
            return [ast.left, ast.right]
        case 'unaryOperator':
        case 'customNode':
        case 'autoUXNode':
            return [ast.expr]
        case 'expression':
            return [ast.value]
        case 'call':
            return ast.args.map(arg => arg.value)
        case 'vectorLiteral':
            return ast.elements
        case 'attribute':
            return [ast.expr]
        default:
            return []
    }
}

function whatWentWrong(ast: UrbanStatsASTNode, scope: Scope): string {
    if (ast.type === 'binaryOperator') {
        const left = quantity(infer(ast.left, scope))
        const right = quantity(infer(ast.right, scope))
        if (left.kind === 'in' && right.kind === 'in') {
            const verb = verbs[ast.operator.node] ?? 'compare'
            // two of the same dimensions that will not go together are stored differently, so say
            // what each is stored in rather than saying m^2 and m^2
            return sameDimensions(left.unit, right.unit)
                ? `cannot ${verb} ${describeStoredUnit(left.unit)} and ${describeStoredUnit(right.unit)}: the same kind of units, but different storage quantities`
                : `cannot ${verb} ${describeDimensions(left.unit.unit)} and ${describeDimensions(right.unit.unit)}`
        }
    }
    return 'its values combine different units'
}

const nothingKnown = 'no unit is known for it'

/** The smallest part of an expression whose units do not work out, and what does not work. */
export function whyNoUnit(ast: UrbanStatsASTNode, scope: Scope): { at: UrbanStatsASTNode, problem: string } | undefined {
    const value = quantity(infer(ast, scope))
    if (value.kind === 'in' && unitToWriteIn(value) !== undefined && writableDimensions(value.unit.unit)) {
        return undefined
    }
    for (const part of partsOf(ast)) {
        const inner = whyNoUnit(part, scope)
        // an unknown part says no more than this whole expression does, so keep looking
        if (inner !== undefined && inner.problem !== nothingKnown) {
            return inner
        }
    }
    if (value.kind === 'any') {
        return { at: ast, problem: nothingKnown }
    }
    if (value.kind === 'none') {
        return { at: ast, problem: whatWentWrong(ast, scope) }
    }
    if (unitToWriteIn(value) === undefined) {
        return { at: ast, problem: 'it is neither a reading nor a difference of readings' }
    }
    return { at: ast, problem: `${describeDimensions(value.unit.unit)} has no name of its own` }
}

/** The unit an expression works out to, where reading it determines one. */
export function inferUnit(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment, named: Bindings = new Map()): AbstractInterpValue {
    return quantity(infer(ast, { typeEnvironment, named }))
}

export function inferBindings(program: UrbanStatsASTStatement | UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): Bindings {
    const named: Bindings = new Map()
    infer(program, { typeEnvironment, named })
    return named
}
