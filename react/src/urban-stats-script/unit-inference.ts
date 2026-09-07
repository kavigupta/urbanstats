import { MapUSS } from '../mapper/settings/map-uss'
import { dimensionless, sameDimensions, sameSize, StoredUnit, unitPower, unitProduct } from '../utils/quantity'
import { plainNumber, unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { BinaryOperatorSymbol } from './operators'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'

/**
 * Recorded on a node whose unit is not the one needed there. The script computes the same
 * number either way: only how it is read changes.
 */
export interface UnitConversion {
    /** What the value is counted in, which is nothing of any name where the script writes a number. */
    internalUnit: StoredUnit
    /** What it is needed as. */
    expectedUnit: StoredUnit
}

/** What reading a script for its units leaves on a node. */
export interface UnitsRead {
    converted?: UnitConversion
    /** What the expression works out to. Anything that is not a quantity is a number of no unit. */
    worksOutTo: StoredUnit
}

type Expression = UrbanStatsASTExpression<UnitsRead>
type Statement = UrbanStatsASTStatement<UnitsRead>

/**
 * How many quantities were added to make a value, which is every count it could be rather than one:
 * a bare 2 is either a quantity or a difference of two, and the script does not say which. This is
 * the half of a unit that cannot be coerced, no arithmetic turning two temperatures into one. The
 * other half is the dimensions, and a factor converts any of those into any other.
 */
type Times = readonly number[]

/** What a script leaves open about a number it writes: a quantity, or a difference of two. */
const eitherWay: Times = [0, 1]

/** One of something, which is what a statistic is. */
const one: Times = [1]

/** None of it, which is what a difference is, and what a factor may multiply. */
const none: Times = [0]

/**
 * How much of a claim a reading makes about the dimensions it is in, which says whose unit wins
 * where two must agree, and where a conversion is written when one does not.
 */
type Flexibility =
    /** It is what it is: a statistic is in the unit its column is written in. */
    | 'naturalPreference'
    /** It has one, and a number written inside it can carry a factor instead: rainfall * 2. */
    | 'flexiblePreference'
    /** It has none of its own, so it is where a cast goes: a bare 2 is of whatever it is read as. */
    | 'artificialPreference'

const claims: Flexibility[] = ['artificialPreference', 'flexiblePreference', 'naturalPreference']

/** The stronger claim of the two, which is the one that says what unit both are in. */
function stronger(left: Flexibility, right: Flexibility): Flexibility {
    return claims.indexOf(left) >= claims.indexOf(right) ? left : right
}

/** What a name the script bound is worth, and what it may still be narrowed to. */
interface Expectation {
    /** The unit it is in where that needs no factor. A number the script writes is of no unit. */
    unit: StoredUnit
    times: Times
    flexibility: Flexibility
    /** What a regression gives back, which is a unit for each of its fields. */
    fields?: ReadonlyMap<string, Expectation>
}

type Bindings = ReadonlyMap<string, Expectation>

/** What is wanted of an expression, either half of which may be left open. */
interface Wanted {
    unit?: StoredUnit
    times?: Times
}

const wantsNothing: Wanted = {}

/**
 * As the plain numbers the script writes, which is how its own units are read where they do not go
 * together. Nothing is wanted of the count: a number is however many of itself it is.
 */
const asWritten: Wanted = { unit: dimensionless }

/** No count of it is the one wanted, so what is written has to be read some other way. */
class Unsatisfiable extends Error {}

/**
 * An expression read for its units: itself rewritten, the unit it is in where that needs no factor,
 * and every count it may be. `variables` carries the narrowing this reading did to the names the
 * script bound, and `literal` is the number where the script writes one.
 */
interface Inference extends Expectation {
    ast: Expression
    variables: Bindings
    literal?: number
}

interface Scope {
    typeEnvironment: TypeEnvironment
    variables: Bindings
}

function intersect(left: Times, right: Times): Times {
    return left.filter(each => right.includes(each))
}

/** The unit it is written in, counted as it turned out to be. */
function counted(unit: StoredUnit, times: Times): StoredUnit {
    return { ...unit, unit: { ...unit.unit, times: times[times.length - 1] } }
}

/** Whether what is written can be read as what is wanted with no factor between them. */
function fits(want: StoredUnit, got: StoredUnit): boolean {
    // a share is stored as a fraction and shown as a percentage, so a caption says so where one is
    // read as a plain number. Any other decoration only says how a statistic names its own units.
    const justOneIsAShare = [want, got].some(({ unit }) => unit.decoration.kind === 'percent')
        && want.unit.decoration.kind !== got.unit.decoration.kind
    return sameDimensions(want, got) && sameSize(want.toBaseUnits, got.toBaseUnits) && !justOneIsAShare
}

/**
 * The reading narrowed to what was wanted of it. A count that does not fit is unsatisfiable, where
 * a unit that does not is converted, which a caption writes as a factor or as what it was read in.
 */
function narrowed(inference: Inference, wanted: Wanted): Inference {
    // a count says how many zeros are in play, so on a scale with none it constrains nothing: an
    // area is an area however many were added to make it
    const counts = inference.unit.unit.baseIsScalar
    const times = wanted.times === undefined || counts ? inference.times : intersect(inference.times, wanted.times)
    if (times.length === 0) {
        throw new Unsatisfiable('no count of it is the one wanted')
    }
    if (wanted.unit === undefined || fits(wanted.unit, inference.unit)) {
        return { ...inference, times }
    }
    return {
        ...inference,
        // a count says how many zeros are in play on the scale it was read from. Converted to a
        // scale with none, it says nothing, and the number is whatever it is read as
        times: wanted.unit.unit.baseIsScalar ? wanted.times ?? eitherWay : times,
        unit: wanted.unit,
        ast: { ...inference.ast, converted: { internalUnit: inference.unit, expectedUnit: wanted.unit } },
    }
}

/**
 * Read as the script wants it, or where its own units do not go together there, as the numbers it
 * writes: ln(Mean high temp [in °F]) is the logarithm of the Fahrenheit number.
 */
function inferEitherWay(ast: Expression, scope: Scope, wanted: Wanted): Inference {
    try {
        return infer(ast, scope, wanted)
    }
    catch (error) {
        if (!(error instanceof Unsatisfiable)) {
            throw error
        }
        return infer(ast, scope, asWritten)
    }
}

/** The names a reading bound, for whatever is read after it. */
function after(scope: Scope, inference: { variables: Bindings }): Scope {
    return { ...scope, variables: inference.variables }
}

/** The node with what it works out to written on it, where a map or a column looks for it. */
function read(inference: Inference): Expression {
    return { ...inference.ast, worksOutTo: counted(inference.unit, inference.times) }
}

function infer(ast: Expression, scope: Scope, wanted: Wanted): Inference {
    const asANumber = readAsANumber(ast, scope)
    if (asANumber !== undefined) {
        // toNumber("1000") is the number 1000, and any other toNumber is its argument read in its
        // place, so the units are read from an ordinary tree and a caption writes one
        return infer(asANumber, scope, wanted)
    }
    return narrowed(within(ast, scope, wanted), wanted)
}

function within(ast: Expression, scope: Scope, wanted: Wanted): Inference {
    const here = { ast, variables: scope.variables }
    switch (ast.type) {
        case 'identifier':
            return identifier(ast, scope, wanted)
        case 'constant':
            return { ...here, unit: dimensionless, times: eitherWay, flexibility: 'artificialPreference', ...ast.value.node.type === 'number' ? { literal: ast.value.node.value } : {} }
        case 'attribute': {
            const object = infer(ast.expr, scope, wantsNothing)
            const field = object.fields?.get(ast.name.node)
            return {
                ...here,
                ast: { ...ast, expr: read(object) },
                variables: object.variables,
                ...field ?? { unit: dimensionless, times: eitherWay, flexibility: 'naturalPreference' },
            }
        }
        case 'unaryOperator': {
            // the sign is written outside the number, so -10 keeps its unit and reads -10°F
            const inner = inferEitherWay(ast.expr, scope, ast.operator.node === '!' ? wantsNothing : wanted)
            return { ...inner, ast: { ...ast, expr: read(inner) } }
        }
        case 'binaryOperator':
            return operation(ast, scope, wanted)
        case 'call':
            return call(ast, scope, wanted)
        case 'vectorLiteral': {
            // the first element sets the unit for the rest, where nothing else does
            const elements: Inference[] = []
            let soFar = scope
            for (const element of ast.elements) {
                const each = inferEitherWay(element, soFar, { ...wanted, unit: wanted.unit ?? elements[0]?.unit })
                elements.push(each)
                soFar = after(soFar, each)
            }
            return { ...either(elements, here), ast: { ...ast, elements: elements.map(read) } }
        }
        case 'objectLiteral': {
            const properties: [string, Inference][] = []
            let soFar = scope
            for (const [name, value] of ast.properties) {
                const each = inferEitherWay(value, soFar, wantsNothing)
                properties.push([name, each])
                soFar = after(soFar, each)
            }
            return {
                ...here,
                ast: { ...ast, properties: properties.map(([name, each]): [string, Expression] => [name, read(each)]) },
                variables: soFar.variables,
                unit: dimensionless,
                times: eitherWay,
                flexibility: 'naturalPreference',
                fields: new Map(properties),
            }
        }
        case 'if': {
            const condition = infer(ast.condition, scope, wantsNothing)
            const consequent = inferStatement(ast.then, after(scope, condition), wanted)
            const otherwise = ast.else === undefined
                ? undefined
                : inferStatement(ast.else, after(scope, condition), { ...wanted, unit: wanted.unit ?? consequent.unit })
            return {
                ...either(otherwise === undefined ? [consequent] : [consequent, otherwise], here),
                // a name an arm binds is bound outside it, where both arms bind it
                variables: bothArms(scope, consequent, otherwise),
                ast: {
                    ...ast,
                    condition: read(condition),
                    then: consequent.ast,
                    ...otherwise === undefined ? {} : { else: otherwise.ast },
                },
            }
        }
        case 'do': {
            const block = inferBlock(ast.statements, scope, wanted)
            return { ...block, ast: { ...ast, statements: block.ast } }
        }
        case 'autoUXNode': {
            const inner = infer(ast.expr, scope, wanted)
            return { ...inner, ast: { ...ast, expr: read(inner) } }
        }
        case 'customNode': {
            const inner = inferStatement(ast.expr, scope, wanted)
            return { ...inner, ast: { ...ast, expr: inner.ast } }
        }
    }
}

function identifier(ast: Expression & { type: 'identifier' }, scope: Scope, wanted: Wanted): Inference {
    const here = { ast, variables: scope.variables }
    const bound = scope.variables.get(ast.name.node)
    if (bound !== undefined) {
        // a name bound to a number is of whatever it is used as, and stays that way after
        const narrowedTo = bound.flexibility === 'artificialPreference' && wanted.unit !== undefined ? { ...bound, unit: wanted.unit } : bound
        return { ...here, ...narrowedTo, variables: new Map(scope.variables).set(ast.name.node, narrowedTo) }
    }
    const unit = scope.typeEnvironment.get(ast.name.node)?.documentation?.unit
    // a name of no unit of its own says nothing about its dimensions, as a bare number does not
    return unit === undefined
        ? { ...here, unit: dimensionless, times: one, flexibility: 'artificialPreference' }
        : { ...here, unit: unitTypeToStoredUnit(unit), times: one, flexibility: 'naturalPreference' }
}

/** Either of several, as the arms of an `if` are, or as the elements of a vector are. */
function either(of: (Expectation & { variables: Bindings })[], here: { ast: Expression, variables: Bindings }): Inference {
    const first = of.at(0)
    if (first === undefined) {
        return { ...here, unit: dimensionless, times: eitherWay, flexibility: 'artificialPreference' }
    }
    const unit = first.unit
    // each of them is the same thing as the others, so they agree on how many of it there is: a
    // temperature and a sum of two is neither. On a scale with no zero there is nothing to agree on
    const times = unit.unit.baseIsScalar
        ? first.times
        : of.map(each => each.times).reduce(intersect, first.times)
    if (times.length === 0) {
        throw new Unsatisfiable('no one count is what all of them are')
    }
    return {
        ...here,
        variables: of[of.length - 1].variables,
        unit,
        times,
        flexibility: of.map(each => each.flexibility).reduce(stronger, 'artificialPreference'),
    }
}

/** A name both arms of an `if` bound is worth either of what they made it. */
function bothArms(scope: Scope, consequent: { variables: Bindings }, otherwise: { variables: Bindings } | undefined): Bindings {
    const bound = new Map(scope.variables)
    for (const [name, expectation] of consequent.variables) {
        const other = otherwise?.variables.get(name) ?? scope.variables.get(name)
        bound.set(name, other === undefined
            ? expectation
            : {
                    unit: expectation.unit,
                    times: [...new Set([...expectation.times, ...other.times])].sort((a, b) => a - b),
                    flexibility: stronger(expectation.flexibility, other.flexibility),
                })
    }
    return bound
}

const sums: readonly BinaryOperatorSymbol[] = ['+', '-']
const products: readonly BinaryOperatorSymbol[] = ['*', '/']
const comparisons: readonly BinaryOperatorSymbol[] = ['==', '!=', '<', '>', '<=', '>=']

function operation(ast: Expression & { type: 'binaryOperator' }, scope: Scope, wanted: Wanted): Inference {
    const operator = ast.operator.node
    if (sums.includes(operator)) {
        return added(ast, scope, wanted, operator === '+' ? 1 : -1)
    }
    if (products.includes(operator)) {
        return multiplied(ast, scope, wanted, operator === '*' ? 1 : -1)
    }
    if (operator === '**') {
        return raised(ast, scope)
    }
    // a comparison is of no unit of its own, and its operands are of each other's
    const here = { ast, variables: scope.variables }
    const left = infer(ast.left, scope, wantsNothing)
    // each side of a comparison is in the other's unit, where the other says which it is: the 80 of
    // 80 < high_temp is a temperature, and neither is of the other where both are bare numbers
    // each side of a comparison is in the other's unit, and the one that cannot take any dimensions
    // is the one that says which they are both in: the 80 of 80 < high_temp is a temperature
    const names = comparisons.includes(operator) && left.flexibility !== 'artificialPreference'
    const right = infer(ast.right, after(scope, left), names ? { unit: left.unit } : wantsNothing)
    // read the left again now the right says what it could not, so the 80 of 80 < high_temp is one
    const reread = left.flexibility === 'artificialPreference' && right.flexibility !== 'artificialPreference'
        ? infer(ast.left, after(scope, right), { unit: right.unit })
        : left
    return {
        ...here,
        ast: { ...ast, left: read(reread), right: read(right) },
        variables: right.variables,
        unit: dimensionless,
        times: eitherWay,
        flexibility: 'naturalPreference',
    }
}

/**
 * What is added is of one unit, so a side of other dimensions takes a factor, and what a factor
 * multiplies is a difference. The counts of the two add up, and where the script leaves either
 * open, every pair of them is a count the sum could be.
 */
function added(ast: Expression & { type: 'binaryOperator' }, scope: Scope, wanted: Wanted, sign: 1 | -1): Inference {
    const left = inferEitherWay(ast.left, scope, wantsNothing)
    const right = inferEitherWay(ast.right, after(scope, left), wantsNothing)
    const unit = left.flexibility === 'artificialPreference' ? right.unit : left.unit
    const converts = (each: Inference): boolean => !fits(unit, each.unit)
    const counts = (each: Inference, times: Times): Times => converts(each) ? none : times
    const pairs = counts(left, left.times).flatMap(onLeft => counts(right, right.times)
        .map(onRight => ({ l: onLeft, r: onRight, sum: onLeft + sign * onRight })))
        .filter(({ sum }) => wanted.times === undefined || wanted.times.includes(sum))
    if (pairs.length === 0) {
        throw new Unsatisfiable('no counts of the two make the one wanted')
    }
    // the fewest quantities in play, and of those the most on the left
    const best = pairs.reduce((a, b) => {
        const [near, far] = [Math.abs(a.l) + Math.abs(a.r), Math.abs(b.l) + Math.abs(b.r)]
        return near < far || (near === far && a.l >= b.l) ? a : b
    })
    const over = inferEitherWay(ast.left, scope, { unit, times: [best.l] })
    const under = inferEitherWay(ast.right, after(scope, over), { unit, times: [best.r] })
    return {
        ast: { ...ast, left: read(over), right: read(under) },
        variables: under.variables,
        unit,
        times: [...new Set(pairs.map(({ sum }) => sum))].sort((a, b) => a - b),
        flexibility: stronger(over.flexibility, under.flexibility),
    }
}

/**
 * A number written in the script scales what it multiplies, so half of two temperatures is one of
 * them. A quantity does not: nothing multiplies a temperature, so both sides are differences, and
 * where one cannot be it is read as the number it is written as.
 */
function multiplied(ast: Expression & { type: 'binaryOperator' }, scope: Scope, wanted: Wanted, power: 1 | -1): Inference {
    const left = inferEitherWay(ast.left, scope, wantsNothing)
    const right = inferEitherWay(ast.right, after(scope, left), wantsNothing)
    const scaling = right.literal ?? left.literal
    if (scaling !== undefined) {
        const scaled = right.literal !== undefined ? left : right
        // the number already written is where a conversion goes, so a factor lands on it rather
        // than beside the whole product: population + area * 2 reads Area × 2/km^2
        // what b must be for a * b or a / b to come out as wanted
        const carries = wanted.unit === undefined
            ? undefined
            : power === 1 ? unitProduct(wanted.unit, scaled.unit, -1) : unitProduct(scaled.unit, wanted.unit, -1)
        if (carries !== undefined && wanted.unit !== undefined && right.literal !== undefined) {
            const taken = infer(ast.right, after(scope, left), { unit: carries })
            return {
                ast: { ...ast, left: read(left), right: read(taken) },
                variables: taken.variables,
                unit: wanted.unit,
                times: scaled.times,
                flexibility: 'flexiblePreference',
            }
        }
        return {
            ast: { ...ast, left: read(left), right: read(right) },
            variables: right.variables,
            unit: scaled.unit,
            // a number scales how many quantities there are, so half of two temperatures is one of
            // them. On a scale with no zero of its own there is nothing for it to scale
            times: scaled.unit.unit.baseIsScalar
                ? scaled.times
                : scaled.times.map(each => power === 1 || right.literal === undefined ? each * scaling : each / scaling),
            flexibility: 'flexiblePreference',
        }
    }
    const over = inferEitherWay(ast.left, scope, { times: none })
    const under = inferEitherWay(ast.right, after(scope, over), { times: none })
    const unit = unitOfProduct(over, under, power)
    return {
        ast: { ...ast, left: read(over), right: read(under) },
        variables: under.variables,
        unit,
        times: [unit.unit.times],
        flexibility: stronger(over.flexibility, under.flexibility),
    }
}

function unitOfProduct(left: Inference, right: Inference, power: 1 | -1): StoredUnit {
    const product = unitProduct(left.unit, right.unit, power)
    if (product === undefined) {
        // one of them counts from a zero of its own, so nothing multiplies it as it is written
        throw new Unsatisfiable('nothing multiplies a quantity counted from a zero of its own')
    }
    return product
}

/** There being no square of a temperature, what is raised to a power is a difference. */
function raised(ast: Expression & { type: 'binaryOperator' }, scope: Scope): Inference {
    const left = inferEitherWay(ast.left, scope, { times: none })
    const right = infer(ast.right, after(scope, left), wantsNothing)
    const exponent = right.literal
    return {
        ast: { ...ast, left: read(left), right: read(right) },
        variables: right.variables,
        unit: (exponent === undefined ? undefined : unitPower(left.unit, exponent)) ?? dimensionless,
        times: one,
        flexibility: left.flexibility,
    }
}

const parameterName = /^x(\d+)$/

function call(ast: Expression & { type: 'call' }, scope: Scope, wanted: Wanted): Inference {
    const propagation = propagationOf(ast.fn, scope)
    const stated = statedUnitOf(ast, scope)
    const args: { arg: UrbanStatsASTArg<UnitsRead>, inferred: Inference }[] = []
    let soFar = scope
    for (const arg of ast.args) {
        const drawn = stated !== undefined && arg.type === 'named' && drawnBy.includes(arg.name.node)
        const inferred = inferEitherWay(arg.value, soFar, drawn ? { unit: stated } : ofArgument(propagation, wanted, args))
        args.push({ arg: { ...arg, value: read(inferred) }, inferred })
        soFar = after(soFar, inferred)
    }
    const here = {
        // the name of a function is read too, so that every node says what it works out to
        ast: { ...ast, fn: read(inferEitherWay(ast.fn, scope, wantsNothing)), args: args.map(({ arg }) => arg) },
        variables: soFar.variables,
    }
    return { ...here, ...gives(propagation, args.map(({ inferred }) => inferred), args) }
}

/** The arguments a stated unit is stated of: the map's data and the table column's values. */
const drawnBy = ['data', 'values']

/**
 * The unit a call states of what it draws: cMap(data=..., unit=unitContaminantLevel) says the map
 * is in that unit, whatever the script computes, so the data is read as converted into it.
 */
function statedUnitOf(ast: Expression & { type: 'call' }, scope: Scope): StoredUnit | undefined {
    const stated = ast.args.find(arg => arg.type === 'named' && arg.name.node === 'unit')?.value
    if (stated?.type !== 'identifier') {
        return undefined
    }
    const names = scope.typeEnvironment.get(stated.name.node)?.documentation?.namesUnit
    return names === undefined ? undefined : unitTypeToStoredUnit(names)
}

/** How the function propagates units, or undefined if the script bound that name itself. */
function propagationOf(fn: Expression, scope: Scope): UnitPropagation | undefined {
    if (fn.type !== 'identifier' || scope.variables.has(fn.name.node)) {
        return undefined
    }
    return scope.typeEnvironment.get(fn.name.node)?.documentation?.unitPropagation
}

function ofArgument(propagation: UnitPropagation | undefined, wanted: Wanted, before: { inferred: Inference }[]): Wanted {
    switch (propagation?.kind) {
        case 'unchanged':
            // the size of a temperature is no temperature, and neither is a sum of several, so both
            // take the number it is written as rather than the reading
            return propagation.losesAReading === true ? { times: none } : wanted
        case 'power':
            // there being no root of a temperature, a root is of the difference
            return { times: none }
        case 'number':
            return asWritten
        case 'either':
        case 'rank':
            // max and min take both arguments in one unit, so each is of the first's
            return { unit: before[0]?.inferred.unit }
        default:
            return wantsNothing
    }
}

function gives(propagation: UnitPropagation | undefined, args: Inference[], named: { arg: UrbanStatsASTArg<UnitsRead> }[]): Expectation {
    const unknown: Expectation = { unit: dimensionless, times: eitherWay, flexibility: 'artificialPreference' }
    if (propagation === undefined) {
        return unknown
    }
    const first = args.at(0)
    switch (propagation.kind) {
        case 'number':
        case 'rank':
            return { unit: dimensionless, times: one, flexibility: 'naturalPreference' satisfies Flexibility }
        case 'unchanged':
            return first === undefined ? unknown : { unit: first.unit, times: first.times, flexibility: first.flexibility }
        case 'power':
            return {
                unit: (first === undefined ? undefined : unitPower(first.unit, propagation.exponent)) ?? dimensionless,
                times: one,
                flexibility: first?.flexibility ?? 'naturalPreference',
            }
        case 'either': {
            if (first === undefined) {
                return unknown
            }
            const { unit, times, flexibility } = either(args, { ast: first.ast, variables: first.variables })
            return { unit, times, flexibility }
        }
        case 'regression':
            return { ...unknown, fields: regressionFields(args, named) }
    }
}

/** What a regression gives back: an intercept in the units of what it was given, and slopes. */
function regressionFields(args: Inference[], named: { arg: UrbanStatsASTArg<UnitsRead> }[]): ReadonlyMap<string, Expectation> {
    const of = (name: string): Inference | undefined =>
        args.find((_, index) => named[index].arg.type === 'named' && (named[index].arg as { name: { node: string } }).name.node === name)
    const level = of('y')
    const measured = level?.unit ?? dimensionless
    const fields = new Map<string, Expectation>([
        ['b', { unit: measured, times: one, flexibility: 'naturalPreference' }],
        ['residuals', { unit: measured, times: none, flexibility: 'naturalPreference' }],
        ['r2', { unit: dimensionless, times: one, flexibility: 'naturalPreference' }],
    ])
    for (const [index, { arg }] of named.entries()) {
        const parameter = arg.type === 'named' ? parameterName.exec(arg.name.node) : null
        if (parameter !== null) {
            fields.set(`m${parameter[1]}`, {
                unit: unitProduct(measured, args[index].unit, -1) ?? dimensionless,
                times: none,
                flexibility: 'naturalPreference',
            })
        }
    }
    return fields
}

function inferBlock(statements: Statement[], scope: Scope, wanted: Wanted): Expectation & { ast: Statement[], variables: Bindings } {
    const stamped: Statement[] = []
    let soFar = scope
    let last: Expectation | undefined
    for (const [index, statement] of statements.entries()) {
        const each = inferStatement(statement, soFar, index === statements.length - 1 ? wanted : wantsNothing)
        stamped.push(each.ast)
        soFar = after(soFar, each)
        last = each
    }
    return {
        ast: stamped,
        variables: soFar.variables,
        unit: last?.unit ?? dimensionless,
        times: last?.times ?? eitherWay,
        flexibility: last?.flexibility ?? 'naturalPreference',
        fields: last?.fields,
    }
}

interface InferredStatement extends Expectation {
    ast: Statement
    variables: Bindings
}

function inferStatement(ast: Statement, scope: Scope, wanted: Wanted): InferredStatement {
    const inferred = statementWithin(ast, scope, wanted)
    // written down where the reader of a map or a column looks for it, as an expression's is
    return { ...inferred, ast: { ...inferred.ast, worksOutTo: counted(inferred.unit, inferred.times) } }
}

function statementWithin(ast: Statement, scope: Scope, wanted: Wanted): InferredStatement {
    switch (ast.type) {
        case 'parseError':
            return { ast, variables: scope.variables, unit: dimensionless, times: eitherWay, flexibility: 'naturalPreference' }
        case 'expression': {
            const inner = inferEitherWay(ast.value, scope, wanted)
            return { ...inner, ast: { ...ast, value: read(inner) } }
        }
        case 'assignment': {
            const inner = inferEitherWay(ast.value, scope, wanted)
            const variables = ast.lhs.type === 'identifier'
                ? new Map(inner.variables).set(ast.lhs.name.node, {
                    unit: inner.unit, times: inner.times, flexibility: inner.flexibility, fields: inner.fields,
                })
                : inner.variables
            return { ...inner, variables, ast: { ...ast, value: read(inner) } }
        }
        case 'statements': {
            const block = inferBlock(ast.result, scope, wanted)
            return { ...block, ast: { ...ast, result: block.ast } }
        }
        case 'condition': {
            // a filter says nothing about the units of what it keeps, but is still read
            const condition = inferEitherWay(ast.condition, scope, wantsNothing)
            const rest = inferBlock(ast.rest, after(scope, condition), wanted)
            return { ...rest, ast: { ...ast, condition: read(condition), rest: rest.ast } }
        }
    }
}

const toNumberOfOneThing = l.call({ fn: l.identifier('toNumber'), namedArgs: {}, unnamedArgs: [l.passthrough<UnitsRead>()] })
const primitive = l.union<USSPrimitiveRawValue>([l.number(), l.string(), l.boolean()])

/** What a toNumber call is read as, or undefined where the expression is not one. */
function readAsANumber(ast: Expression, scope: Scope): Expression | undefined {
    // a script that binds the name itself is calling something else
    if (scope.variables.has('toNumber')) return undefined
    const inner = l.tryParse(toNumberOfOneThing, ast, scope.typeEnvironment)?.unnamedArgs[0]
    if (inner === undefined) return undefined
    // toNumber("1000") is the number 1000. A string of no number at all is left as it was
    const literal = l.tryParse(primitive, inner, scope.typeEnvironment)
    const value = literal === undefined ? undefined : asNumber(literal)
    return value === undefined
        ? inner
        : { type: 'constant', value: { node: { type: 'number', value }, location: locationOf(inner) }, worksOutTo: plainNumber }
}

/** The script rewritten, every node of it saying what it works out to. */
export function unitCheck<M>(program: MapUSS<M>, typeEnvironment: TypeEnvironment): MapUSS<M & UnitsRead>
export function unitCheck<M>(program: UrbanStatsASTStatement<M>, typeEnvironment: TypeEnvironment): Statement
export function unitCheck<M>(program: UrbanStatsASTExpression<M>, typeEnvironment: TypeEnvironment): Expression
export function unitCheck(program: Expression | Statement, typeEnvironment: TypeEnvironment): Expression | Statement {
    const scope: Scope = { typeEnvironment, variables: new Map() }
    return isExpression(program)
        ? read(inferEitherWay(program, scope, wantsNothing))
        : inferStatement(program, scope, wantsNothing).ast
}

function isExpression(ast: Expression | Statement): ast is Expression {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}
