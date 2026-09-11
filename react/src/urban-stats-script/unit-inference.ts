import { MapUSS } from '../mapper/settings/map-uss'
import { dimensionless, sameDimensions, sameSize, StoredUnit, unitPower, unitProduct } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import * as l from './literal-parser'
import { BinaryOperatorSymbol } from './operators'
import { TypeEnvironment, UnitPropagation, USSPrimitiveRawValue } from './types-values'

/**
 * Recorded on a node whose unit is not the one needed there. The script computes the same
 * number either way: only how it is interpreted changes.
 */
export interface UnitConversion {
    /** What the expression actually computes to. */
    internalUnit: StoredUnit
    /** What it is needed as for the broader context. */
    expectedUnit: StoredUnit
}

/** What reading a script for its units leaves on a node. */
export interface UnitsRead {
    converted?: UnitConversion
    /** What the expression actually computes to. */
    worksOutTo: StoredUnit
}

type Expression = UrbanStatsASTExpression<UnitsRead>
type Statement = UrbanStatsASTStatement<UnitsRead>

/**
 * The values of `times` an expression can have: for high_temp * 2 this is [2], for a constant number
 * like 2 it is [0, 1], and for a constant expression like 2 + 2 it is [0, 1, 2]. Units can always
 * be coerced where `times` cannot, so `times` is tracked more completely.
 */
type Times = readonly number[]

/**
 * How flexible a unit assigned to an expression is. Less flexible units are kept when reconciling,
 * for example, a sum of elements with differing units.
 */
type Flexibility =
    /** Least flexible: a statistic is in the unit of its column and no other. */
    | 'naturalPreference'
    /** Flexible: a number written inside it can take a factor instead, as in rainfall * 2. */
    | 'flexiblePreference'
    /** Most flexible: a bare number has no unit of its own and takes whichever it is used in. */
    | 'artificialPreference'

const claims: Flexibility[] = ['artificialPreference', 'flexiblePreference', 'naturalPreference']

/** The stronger claim of the two, which is the one that says what unit both are in. */
function stronger(left: Flexibility, right: Flexibility): Flexibility {
    return claims.indexOf(left) >= claims.indexOf(right) ? left : right
}

/** The unit an expression is in */
interface UnitAbstractInterp {
    /** The unit it is in where no factor is needed. A number the script writes is in no unit. */
    unit: StoredUnit
    times: Times
    flexibility: Flexibility
    /** On an object, the unit for each field. */
    fields?: ReadonlyMap<string, UnitAbstractInterp>
}

type Bindings = ReadonlyMap<string, UnitAbstractInterp>

/** In unit checking we can set preferences for what we want. Either may be left blank for none. */
interface UnitExpectation {
    unit?: StoredUnit
    times?: Times
}

const noUnitExpectation: UnitExpectation = {}

/** A number the script writes, which is of no unit until something says what it is read as. */
const bareNumber: UnitAbstractInterp = { unit: dimensionless, times: [0, 1], flexibility: 'artificialPreference' }

/** No count of it is the one wanted, so what is written has to be read some other way. */
class Unsatisfiable extends Error {}

/** What reading one expression gives: the expression rewritten, and what it works out to. */
interface InferenceResult {
    interp: UnitAbstractInterp
    ast: Expression
    /** The names in scope, as this expression narrowed them. */
    variables: Bindings
    /** Its value, where the expression is a number the script writes. */
    literal?: number
}

interface Scope {
    typeEnvironment: TypeEnvironment
    variables: Bindings
}

function intersect(left: Times, right: Times): Times {
    return left.filter(each => right.includes(each))
}

/**
 * Returns a unit that has the given times; taking the maximum to break ties.
 */
function counted(unit: StoredUnit, times: Times): StoredUnit {
    return { ...unit, unit: { ...unit.unit, times: Math.max(...times) } }
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
 * The reading narrowed to what was wanted of it. A count that does not fit makes the whole reading
 * unsatisfiable. A unit that does not fit is converted, which a caption writes out.
 */
function narrowed(inference: InferenceResult, wanted: UnitExpectation): InferenceResult {
    // scalars are exempt from being narrowed; we just ignore times on them since it isn't materially relevant.
    const { interp } = inference
    const times = wanted.times === undefined || interp.unit.unit.baseIsScalar
        ? interp.times
        : intersect(interp.times, wanted.times)
    if (times.length === 0) {
        throw new Unsatisfiable('no count of it is the one wanted')
    }
    if (wanted.unit === undefined || fits(wanted.unit, interp.unit)) {
        return { ...inference, interp: { ...interp, times } }
    }
    return {
        ...inference,
        interp: {
            ...interp,
            // times belongs to the scale the value was read from. Converted onto a scale with no
            // zero of its own it means nothing there, so it takes whatever count is wanted of it
            times: wanted.unit.unit.baseIsScalar ? wanted.times ?? [0, 1] : times,
            unit: wanted.unit,
        },
        ast: { ...inference.ast, converted: { internalUnit: interp.unit, expectedUnit: wanted.unit } },
    }
}

/**
 * Try to read the expression in the unit wanted, and if that fails read it as a bare number
 */
function inferEitherWay(ast: Expression, scope: Scope, wanted: UnitExpectation): InferenceResult {
    try {
        return infer(ast, scope, wanted)
    }
    catch (error) {
        if (!(error instanceof Unsatisfiable)) {
            throw error
        }
        return infer(ast, scope, { unit: dimensionless })
    }
}

/** The names a reading bound, for whatever is read after it. */
function after(scope: Scope, inference: { variables: Bindings }): Scope {
    return { ...scope, variables: inference.variables }
}

/** The node with what it works out to written on it, where a map or a column looks for it. */
function packExpression(inference: InferenceResult): Expression {
    return { ...inference.ast, worksOutTo: counted(inference.interp.unit, inference.interp.times) }
}

function infer(ast: Expression, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const asANumber = readAsANumber(ast, scope)
    if (asANumber !== undefined) {
        // toNumber("1000") is the number 1000, and any other toNumber is read as its argument, so
        // everything below here reads an ordinary tree
        return infer(asANumber, scope, wanted)
    }
    return narrowed(within(ast, scope, wanted), wanted)
}

function within(ast: Expression, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const here = { ast, variables: scope.variables }
    switch (ast.type) {
        case 'identifier':
            return identifier(ast, scope, wanted)
        case 'constant':
            return { ...here, interp: bareNumber, ...ast.value.node.type === 'number' ? { literal: ast.value.node.value } : {} }
        case 'attribute': {
            const object = inferEitherWay(ast.expr, scope, noUnitExpectation)
            const field = object.interp.fields?.get(ast.name.node)
            return {
                ...here,
                ast: { ...ast, expr: packExpression(object) },
                variables: object.variables,
                interp: field ?? { unit: dimensionless, times: [0, 1], flexibility: 'naturalPreference' },
            }
        }
        case 'unaryOperator': {
            // the sign is written outside the number, so -10 keeps its unit and reads -10°F
            const inner = inferEitherWay(ast.expr, scope, ast.operator.node === '!' ? noUnitExpectation : wanted)
            return { ...inner, ast: { ...ast, expr: packExpression(inner) } }
        }
        case 'binaryOperator':
            return operation(ast, scope, wanted)
        case 'call':
            return call(ast, scope, wanted)
        case 'vectorLiteral': {
            const elements = (inWhat: UnitExpectation): InferenceResult[] => {
                const all: InferenceResult[] = []
                let soFar = scope
                for (const element of ast.elements) {
                    const each = inferEitherWay(element, soFar, inWhat)
                    all.push(each)
                    soFar = after(soFar, each)
                }
                return all
            }
            const claimed = elements(wanted)
            const agreed = agreedUnit(wanted, claimed.map(each => each.interp))
            const all = agreed === undefined ? claimed : elements(agreed)
            return { ...either(all, here), ast: { ...ast, elements: all.map(packExpression) } }
        }
        case 'objectLiteral': {
            const properties: [string, InferenceResult][] = []
            let soFar = scope
            for (const [name, value] of ast.properties) {
                const each = inferEitherWay(value, soFar, noUnitExpectation)
                properties.push([name, each])
                soFar = after(soFar, each)
            }
            return {
                ...here,
                ast: { ...ast, properties: properties.map(([name, each]): [string, Expression] => [name, packExpression(each)]) },
                variables: soFar.variables,
                interp: {
                    unit: dimensionless,
                    times: [0, 1],
                    flexibility: 'naturalPreference',
                    fields: new Map(properties.map(([name, each]) => [name, each.interp])),
                },
            }
        }
        case 'if': {
            const condition = inferEitherWay(ast.condition, scope, noUnitExpectation)
            // an arm is read from where the condition left off, and not from the other arm: a name
            // one of them binds is not in scope in the other
            const afterCondition = after(scope, condition)
            const bothOf = ast.else === undefined ? [ast.then] : [ast.then, ast.else]
            const arms = (inWhat: UnitExpectation): InferredStatement[] => bothOf.map(arm => inferStatement(arm, afterCondition, inWhat))
            const claimed = arms(wanted)
            const agreed = agreedUnit(wanted, claimed.map(each => each.interp))
            const all = agreed === undefined ? claimed : arms(agreed)
            const consequent = all[0]
            const otherwise = ast.else === undefined ? undefined : all[1]
            return {
                ...either(otherwise === undefined ? [consequent] : [consequent, otherwise], here),
                // a name an arm binds is bound outside it, where both arms bind it
                variables: bothArms(scope, consequent, otherwise),
                ast: {
                    ...ast,
                    condition: packExpression(condition),
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
            const inner = inferEitherWay(ast.expr, scope, wanted)
            return { ...inner, ast: { ...ast, expr: packExpression(inner) } }
        }
        case 'customNode': {
            const inner = inferStatement(ast.expr, scope, wanted)
            return { ...inner, ast: { ...ast, expr: inner.ast } }
        }
    }
}

function identifier(ast: Expression & { type: 'identifier' }, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const here = { ast, variables: scope.variables }
    const bound = scope.variables.get(ast.name.node)
    if (bound !== undefined) {
        // a name bound to a number is of whatever it is used as, and stays that way after
        const narrowedTo = bound.flexibility === 'artificialPreference' && wanted.unit !== undefined ? { ...bound, unit: wanted.unit } : bound
        return { ...here, interp: narrowedTo, variables: new Map(scope.variables).set(ast.name.node, narrowedTo) }
    }
    const unit = scope.typeEnvironment.get(ast.name.node)?.documentation?.unit
    // a name of no unit of its own says nothing about its dimensions, as a bare number does not
    return unit === undefined
        ? { ...here, interp: { unit: dimensionless, times: [1], flexibility: 'artificialPreference' } }
        : { ...here, interp: { unit: unitTypeToStoredUnit(unit), times: [1], flexibility: 'naturalPreference' } }
}

/**
 * The unit several alternatives are all read in, or undefined where the first reading already used
 * it. A bare number states no unit, so it is not the one that decides.
 */
function agreedUnit(wanted: UnitExpectation, claimed: UnitAbstractInterp[]): UnitExpectation | undefined {
    if (wanted.unit !== undefined) {
        return undefined
    }
    const unit = claimed.find(each => each.flexibility !== 'artificialPreference')?.unit
    return unit === undefined ? undefined : { ...wanted, unit }
}

/** Either of several, as the arms of an `if` are, or as the elements of a vector are. */
function either(of: { interp: UnitAbstractInterp, variables: Bindings }[], here: { ast: Expression, variables: Bindings }): InferenceResult {
    const first = of.at(0)
    if (first === undefined) {
        return { ...here, interp: bareNumber }
    }
    const interps = of.map(each => each.interp)
    const unit = interps.find(each => each.flexibility !== 'artificialPreference')?.unit ?? first.interp.unit
    // each of them is the same thing as the others, so they have to agree on how many of it there
    // is. On a scale with no zero of its own there is nothing to agree on
    const times = unit.unit.baseIsScalar
        ? first.interp.times
        : interps.map(each => each.times).reduce(intersect, first.interp.times)
    if (times.length === 0) {
        throw new Unsatisfiable('no one count is what all of them are')
    }
    return {
        ...here,
        variables: of[of.length - 1].variables,
        interp: { unit, times, flexibility: interps.map(each => each.flexibility).reduce(stronger, 'artificialPreference') },
    }
}

/** A name that both arms of an `if` bound may be either of what the two made it. */
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

function operation(ast: Expression & { type: 'binaryOperator' }, scope: Scope, wanted: UnitExpectation): InferenceResult {
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
    const left = inferEitherWay(ast.left, scope, noUnitExpectation)
    // each side of a comparison is in the other's unit, and the side with no unit of its own is the
    // one that takes it: the 80 of 80 < high_temp is a temperature
    const names = comparisons.includes(operator) && left.interp.flexibility !== 'artificialPreference'
    const right = inferEitherWay(ast.right, after(scope, left), names ? { unit: left.interp.unit } : noUnitExpectation)
    // read the left again now the right says what it could not, so the 80 of 80 < high_temp is one
    const reread = left.interp.flexibility === 'artificialPreference' && right.interp.flexibility !== 'artificialPreference'
        ? inferEitherWay(ast.left, after(scope, right), { unit: right.interp.unit })
        : left
    return {
        ...here,
        ast: { ...ast, left: packExpression(reread), right: packExpression(right) },
        variables: right.variables,
        interp: { unit: dimensionless, times: [0, 1], flexibility: 'naturalPreference' },
    }
}

/**
 * Both sides of a sum are in one unit, so a side of other dimensions takes a factor, and a side
 * that takes a factor is a difference. The counts of the two add up. Where the script leaves
 * either side open, every pair of counts is one the sum could be.
 */
function added(ast: Expression & { type: 'binaryOperator' }, scope: Scope, wanted: UnitExpectation, sign: 1 | -1): InferenceResult {
    const left = inferEitherWay(ast.left, scope, noUnitExpectation)
    const right = inferEitherWay(ast.right, after(scope, left), noUnitExpectation)
    const unit = left.interp.flexibility === 'artificialPreference' ? right.interp.unit : left.interp.unit
    const converts = (each: InferenceResult): boolean => !fits(unit, each.interp.unit)
    const counts = (each: InferenceResult, times: Times): Times => converts(each) ? [0] : times
    const pairs = counts(left, left.interp.times).flatMap(onLeft => counts(right, right.interp.times)
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
        ast: { ...ast, left: packExpression(over), right: packExpression(under) },
        variables: under.variables,
        interp: {
            unit,
            times: [...new Set(pairs.map(({ sum }) => sum))].sort((a, b) => a - b),
            flexibility: stronger(over.interp.flexibility, under.interp.flexibility),
        },
    }
}

/**
 * A number written in the script scales what it multiplies, so half of two temperatures is one of
 * them. A quantity does not scale anything: nothing multiplies a temperature, so both sides are
 * differences, and a side that cannot be one is read as the number it is written as.
 */
function multiplied(ast: Expression & { type: 'binaryOperator' }, scope: Scope, wanted: UnitExpectation, power: 1 | -1): InferenceResult {
    const left = inferEitherWay(ast.left, scope, noUnitExpectation)
    const right = inferEitherWay(ast.right, after(scope, left), noUnitExpectation)
    const scaling = right.literal ?? left.literal
    if (scaling !== undefined) {
        const scaled = right.literal !== undefined ? left : right
        if (wanted.unit !== undefined && right.literal !== undefined) {
            // what the number must be in for the product to come out as wanted. It is where a
            // conversion goes, a factor landing on the number the script already writes rather
            // than beside the whole product: population + area * 2 reads Area × 2/km^2
            const carries = power === 1
                ? unitProduct(wanted.unit, scaled.interp.unit, -1)
                : unitProduct(scaled.interp.unit, wanted.unit, -1)
            if (carries !== undefined) {
                const taken = inferEitherWay(ast.right, after(scope, left), { unit: carries })
                return {
                    ast: { ...ast, left: packExpression(left), right: packExpression(taken) },
                    variables: taken.variables,
                    interp: { unit: wanted.unit, times: scaled.interp.times, flexibility: 'flexiblePreference' },
                }
            }
        }
        return {
            ast: { ...ast, left: packExpression(left), right: packExpression(right) },
            variables: right.variables,
            interp: {
                unit: scaled.interp.unit,
                // on a scale with no zero of its own there is nothing for a number to scale
                times: scaled.interp.unit.unit.baseIsScalar
                    ? scaled.interp.times
                    : scaled.interp.times.map(each => power === 1 || right.literal === undefined ? each * scaling : each / scaling),
                flexibility: 'flexiblePreference',
            },
        }
    }
    const over = inferEitherWay(ast.left, scope, { times: [0] })
    const under = inferEitherWay(ast.right, after(scope, over), { times: [0] })
    const unit = unitOfProduct(over, under, power)
    return {
        ast: { ...ast, left: packExpression(over), right: packExpression(under) },
        variables: under.variables,
        interp: { unit, times: [unit.unit.times], flexibility: stronger(over.interp.flexibility, under.interp.flexibility) },
    }
}

function unitOfProduct(left: InferenceResult, right: InferenceResult, power: 1 | -1): StoredUnit {
    const product = unitProduct(left.interp.unit, right.interp.unit, power)
    if (product === undefined) {
        throw new Unsatisfiable('nothing multiplies a quantity counted from a zero of its own')
    }
    return product
}

/** A temperature has no square, so what is raised to a power is a difference. */
function raised(ast: Expression & { type: 'binaryOperator' }, scope: Scope): InferenceResult {
    const left = inferEitherWay(ast.left, scope, { times: [0] })
    const right = inferEitherWay(ast.right, after(scope, left), noUnitExpectation)
    const exponent = right.literal
    return {
        ast: { ...ast, left: packExpression(left), right: packExpression(right) },
        variables: right.variables,
        interp: {
            unit: (exponent === undefined ? undefined : unitPower(left.interp.unit, exponent)) ?? dimensionless,
            times: [1],
            flexibility: left.interp.flexibility,
        },
    }
}

interface ReadArgument { arg: UrbanStatsASTArg<UnitsRead>, inferred: InferenceResult }

function call(ast: Expression & { type: 'call' }, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const propagation = propagationOf(ast.fn, scope)
    const stated = statedUnitOf(ast, scope)
    const args = (inWhat: UnitExpectation): ReadArgument[] => {
        const all: ReadArgument[] = []
        let soFar = scope
        for (const arg of ast.args) {
            const drawn = stated !== undefined && arg.type === 'named' && drawnBy.includes(arg.name.node)
            const inferred = inferEitherWay(arg.value, soFar, drawn ? { unit: stated } : ofArgument(propagation, inWhat))
            all.push({ arg: { ...arg, value: packExpression(inferred) }, inferred })
            soFar = after(soFar, inferred)
        }
        return all
    }
    const claimed = args(wanted)
    // where the arguments have to be in one unit, they are read again in the one they agree on
    // rather than in whichever the first of them happened to claim
    const agreed = argumentsAgree(propagation) ? agreedUnit(wanted, claimed.map(({ inferred }) => inferred.interp)) : undefined
    const all = agreed === undefined ? claimed : args(agreed)
    const here = {
        // the name of a function is read too, so that every node says what it works out to
        ast: { ...ast, fn: packExpression(inferEitherWay(ast.fn, scope, noUnitExpectation)), args: all.map(({ arg }) => arg) },
        variables: all.at(-1)?.inferred.variables ?? scope.variables,
    }
    return { ...here, interp: gives(propagation, all.map(({ inferred }) => inferred), all) }
}

/** Whether every argument has to be in one unit, as max and min need of theirs. */
function argumentsAgree(propagation: UnitPropagation | undefined): boolean {
    return propagation?.kind === 'either' || propagation?.kind === 'rank'
}

/** The arguments a stated unit applies to: the map's data and the table column's values. */
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

function ofArgument(propagation: UnitPropagation | undefined, wanted: UnitExpectation): UnitExpectation {
    switch (propagation?.kind) {
        case 'unchanged':
            // there is no size of a temperature, nor a total of several, only of the degrees
            // between two of them
            return propagation.takesAScalar === true ? { times: [0] } : wanted
        case 'power':
            // a temperature has no root, so a root is taken of the difference
            return { times: [0] }
        case 'number':
            return { unit: dimensionless }
        case 'either':
        case 'rank':
            // the caller reads these twice, so the first reading leaves each argument to say what
            // unit it is in and the second puts them all in the one they agree on
            return { unit: wanted.unit }
        default:
            return noUnitExpectation
    }
}

function gives(propagation: UnitPropagation | undefined, args: InferenceResult[], named: { arg: UrbanStatsASTArg<UnitsRead> }[]): UnitAbstractInterp {
    if (propagation === undefined) {
        return bareNumber
    }
    const first = args.at(0)
    switch (propagation.kind) {
        case 'number':
        case 'rank':
            return { unit: dimensionless, times: [1], flexibility: 'naturalPreference' }
        case 'unchanged':
            return first?.interp ?? bareNumber
        case 'power':
            return {
                unit: (first === undefined ? undefined : unitPower(first.interp.unit, propagation.exponent)) ?? dimensionless,
                times: [1],
                flexibility: first?.interp.flexibility ?? 'naturalPreference',
            }
        case 'either':
            return first === undefined ? bareNumber : either(args, { ast: first.ast, variables: first.variables }).interp
        case 'regression':
            return { ...bareNumber, fields: regressionFields(args, named) }
    }
}

const parameterName = /^x(\d+)$/

/** What a regression gives back: an intercept in the units of what it was given, and slopes. */
function regressionFields(args: InferenceResult[], named: { arg: UrbanStatsASTArg<UnitsRead> }[]): ReadonlyMap<string, UnitAbstractInterp> {
    const of = (name: string): InferenceResult | undefined => {
        const index = named.findIndex(({ arg }) => arg.type === 'named' && arg.name.node === name)
        return index === -1 ? undefined : args[index]
    }
    const level = of('y')
    const measured = level?.interp.unit ?? dimensionless
    const fields = new Map<string, UnitAbstractInterp>([
        ['b', { unit: measured, times: [1], flexibility: 'naturalPreference' }],
        ['residuals', { unit: measured, times: [0], flexibility: 'naturalPreference' }],
        ['r2', { unit: dimensionless, times: [1], flexibility: 'naturalPreference' }],
    ])
    for (const [index, { arg }] of named.entries()) {
        const parameter = arg.type === 'named' ? parameterName.exec(arg.name.node) : null
        if (parameter !== null) {
            fields.set(`m${parameter[1]}`, {
                unit: unitProduct(measured, args[index].interp.unit, -1) ?? dimensionless,
                times: [0],
                flexibility: 'naturalPreference',
            })
        }
    }
    return fields
}

function inferBlock(statements: Statement[], scope: Scope, wanted: UnitExpectation): { interp: UnitAbstractInterp, ast: Statement[], variables: Bindings } {
    const stamped: Statement[] = []
    let soFar = scope
    let last: UnitAbstractInterp | undefined
    for (const [index, statement] of statements.entries()) {
        const each = inferStatement(statement, soFar, index === statements.length - 1 ? wanted : noUnitExpectation)
        stamped.push(each.ast)
        soFar = after(soFar, each)
        last = each.interp
    }
    // a block of no statements at all works out to nothing, which reads as a plain number
    return { ast: stamped, variables: soFar.variables, interp: last ?? bareNumber }
}

interface InferredStatement {
    interp: UnitAbstractInterp
    ast: Statement
    variables: Bindings
}

function inferStatement(ast: Statement, scope: Scope, wanted: UnitExpectation): InferredStatement {
    const inferred = statementWithin(ast, scope, wanted)
    return { ...inferred, ast: { ...inferred.ast, worksOutTo: counted(inferred.interp.unit, inferred.interp.times) } }
}

function statementWithin(ast: Statement, scope: Scope, wanted: UnitExpectation): InferredStatement {
    switch (ast.type) {
        case 'parseError':
            return { ast, variables: scope.variables, interp: { unit: dimensionless, times: [0, 1], flexibility: 'naturalPreference' } }
        case 'expression': {
            const inner = inferEitherWay(ast.value, scope, wanted)
            return { ...inner, ast: { ...ast, value: packExpression(inner) } }
        }
        case 'assignment': {
            const inner = inferEitherWay(ast.value, scope, wanted)
            const variables = ast.lhs.type === 'identifier'
                ? new Map(inner.variables).set(ast.lhs.name.node, inner.interp)
                : inner.variables
            return { ...inner, variables, ast: { ...ast, value: packExpression(inner) } }
        }
        case 'statements': {
            const block = inferBlock(ast.result, scope, wanted)
            return { ...block, ast: { ...ast, result: block.ast } }
        }
        case 'condition': {
            // a filter says nothing about the units of what it keeps, but is still read
            const condition = inferEitherWay(ast.condition, scope, noUnitExpectation)
            const rest = inferBlock(ast.rest, after(scope, condition), wanted)
            return { ...rest, ast: { ...ast, condition: packExpression(condition), rest: rest.ast } }
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
        : { type: 'constant', value: { node: { type: 'number', value }, location: locationOf(inner) }, worksOutTo: dimensionless }
}

/** The script rewritten, every node of it saying what it works out to. */
export function unitCheck<M>(program: MapUSS<M>, typeEnvironment: TypeEnvironment): MapUSS<M & UnitsRead>
export function unitCheck<M>(program: UrbanStatsASTStatement<M>, typeEnvironment: TypeEnvironment): Statement
export function unitCheck<M>(program: UrbanStatsASTExpression<M>, typeEnvironment: TypeEnvironment): Expression
export function unitCheck(program: Expression | Statement, typeEnvironment: TypeEnvironment): Expression | Statement {
    const scope: Scope = { typeEnvironment, variables: new Map() }
    return isExpression(program)
        ? packExpression(inferEitherWay(program, scope, noUnitExpectation))
        : inferStatement(program, scope, noUnitExpectation).ast
}

function isExpression(ast: Expression | Statement): ast is Expression {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}
