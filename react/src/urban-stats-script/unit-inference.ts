import { MapUSS } from '../mapper/settings/map-uss'
import { dimensionless, sameDimensions, sameSize, StoredUnit, unitPower, unitProduct } from '../utils/quantity'
import { unitTypeToStoredUnit } from '../utils/unit'

import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { asNumber } from './constants/convert'
import { DeclaredUnits, nothingDeclared } from './declared-units'
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

export interface UnitInferenceMetadata {
    converted?: UnitConversion
    /** What the expression actually computes to. */
    computesTo: StoredUnit
}

type Expression = UrbanStatsASTExpression<UnitInferenceMetadata>
type Statement = UrbanStatsASTStatement<UnitInferenceMetadata>

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

// what a bare number is assigned until an expectation narrows it.
const bareNumber: UnitAbstractInterp = { unit: dimensionless, times: [0, 1], flexibility: 'artificialPreference' }

// only thrown when times are incompatible, and it is irrecoverable.
class Unsatisfiable extends Error {}

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
    declaredUnits: DeclaredUnits
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

function countedUnit(interp: UnitAbstractInterp): StoredUnit {
    return counted(interp.unit, interp.times)
}

function fits(want: StoredUnit, got: StoredUnit): boolean {
    // ensures that ln(bike) renders as ln(bike [as a fraction]); i.e., we want to make sure
    // percentages are annotated.
    const justOneIsAShare = [want, got].some(({ unit }) => unit.decoration.kind === 'percent')
        && want.unit.decoration.kind !== got.unit.decoration.kind
    return sameDimensions(want, got) && sameSize(want.toBaseUnits, got.toBaseUnits) && !justOneIsAShare
}

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

function inferWithFallback(ast: Expression, scope: Scope, wanted: UnitExpectation): InferenceResult {
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

function after(scope: Scope, inference: { variables: Bindings }): Scope {
    return { ...scope, variables: inference.variables }
}

function packExpression(inference: InferenceResult): Expression {
    return { ...inference.ast, computesTo: counted(inference.interp.unit, inference.interp.times) }
}

function infer(ast: Expression, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const asANumber = attemptParseNumber(ast, scope)
    if (asANumber !== undefined) {
        return infer(asANumber, scope, wanted)
    }
    // a node the caller declared a unit for is read in that, whatever it is used as
    const declared = scope.declaredUnits.get(ast)
    const asked = declared === undefined ? wanted : { ...wanted, unit: declared }
    // fallback in case best effort returns something that does not fit what is wanted
    return narrowed(inferBestEffort(ast, scope, asked), asked)
}

/**
 * Makes a best effort to infer the unit of the expression, in the given constraint.
 * Might return something with a different unit, that needs to be converted.
 */
function inferBestEffort(ast: Expression, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const here = { ast, variables: scope.variables }
    switch (ast.type) {
        case 'identifier':
            return inferIdentifier(ast, scope, wanted)
        case 'constant':
            return { ...here, interp: bareNumber, ...ast.value.node.type === 'number' ? { literal: ast.value.node.value } : {} }
        case 'attribute': {
            const object = inferWithFallback(ast.expr, scope, noUnitExpectation)
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
            const inner = inferWithFallback(ast.expr, scope, ast.operator.node === '!' ? noUnitExpectation : wanted)
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
                    const each = inferWithFallback(element, soFar, inWhat)
                    all.push(each)
                    soFar = after(soFar, each)
                }
                return all
            }
            const claimed = elements(wanted)
            const all = elements({ ...wanted, unit: unifyUnits(claimed.map(each => each.interp)).unit })
            return {
                ...here,
                variables: all.at(-1)?.variables ?? scope.variables,
                interp: unifyUnits(all.map(each => each.interp)),
                ast: { ...ast, elements: all.map(packExpression) },
            }
        }
        case 'objectLiteral': {
            const properties: [string, InferenceResult][] = []
            let soFar = scope
            for (const [name, value] of ast.properties) {
                const each = inferWithFallback(value, soFar, noUnitExpectation)
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
            const condition = inferWithFallback(ast.condition, scope, noUnitExpectation)
            const afterCondition = after(scope, condition)
            const bothOf = ast.else === undefined ? [ast.then] : [ast.then, ast.else]
            const arms = (inWhat: UnitExpectation): InferredStatement[] => bothOf.map(arm => inferStatement(arm, afterCondition, inWhat))
            const claimed = arms(wanted)
            const all = arms({ ...wanted, unit: unifyUnits(claimed.map(each => each.interp)).unit })
            const consequent = all[0]
            const otherwise = ast.else === undefined ? undefined : all[1]
            return {
                ...here,
                interp: unifyUnits(all.map(each => each.interp)),
                // a name an arm binds is bound outside it, where both arms bind it
                variables: unifyIfArms(scope, consequent, otherwise),
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
            const inner = inferWithFallback(ast.expr, scope, wanted)
            return { ...inner, ast: { ...ast, expr: packExpression(inner) } }
        }
        case 'customNode': {
            const inner = inferStatement(ast.expr, scope, wanted)
            return { ...inner, ast: { ...ast, expr: inner.ast } }
        }
    }
}

function inferIdentifier(ast: Expression & { type: 'identifier' }, scope: Scope, wanted: UnitExpectation): InferenceResult {
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
 * Unifies several abstract interpretations, naturally narrows. If inconsistent,
 * falls back to a bare number.
 */
function unifyUnits(interps: UnitAbstractInterp[]): UnitAbstractInterp {
    const first = interps.at(0)
    if (first === undefined) {
        return bareNumber
    }
    const least = interps.reduce((soFar, each) =>
        stronger(soFar.flexibility, each.flexibility) === soFar.flexibility ? soFar : each)
    const unit = least.flexibility === 'artificialPreference' ? first.unit : least.unit
    const times = unit.unit.baseIsScalar
        ? first.times
        : interps.map(each => each.times).reduce(intersect, first.times)
    return times.length === 0
        ? bareNumber
        : { unit, times, flexibility: interps.map(each => each.flexibility).reduce(stronger, 'artificialPreference') }
}

/** A name that both arms of an `if` bound is worth what the two of them agree it is. */
function unifyIfArms(scope: Scope, consequent: { variables: Bindings }, otherwise: { variables: Bindings } | undefined): Bindings {
    const bound = new Map(scope.variables)
    for (const [name, inArm] of consequent.variables) {
        const other = otherwise?.variables.get(name) ?? scope.variables.get(name)
        bound.set(name, other === undefined ? inArm : unifyUnits([inArm, other]))
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
    const left = inferWithFallback(ast.left, scope, noUnitExpectation)
    // each side of a comparison is in the other's unit, and the side with no unit of its own is the
    // one that takes it: the 80 of 80 < high_temp is a temperature
    const names = comparisons.includes(operator) && left.interp.flexibility !== 'artificialPreference'
    const right = inferWithFallback(ast.right, after(scope, left), names ? { unit: left.interp.unit } : noUnitExpectation)
    // and the other way round: the 80 of 80 < high_temp takes high_temp's unit
    const reread = left.interp.flexibility === 'artificialPreference' && right.interp.flexibility !== 'artificialPreference'
        ? inferWithFallback(ast.left, after(scope, right), { unit: right.interp.unit })
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
    const left = inferWithFallback(ast.left, scope, noUnitExpectation)
    const right = inferWithFallback(ast.right, after(scope, left), noUnitExpectation)
    const unit = left.interp.flexibility === 'artificialPreference' ? right.interp.unit : left.interp.unit
    const converts = (each: InferenceResult): boolean => !fits(unit, each.interp.unit)
    const counts = (each: InferenceResult, times: Times): Times => converts(each) ? [0] : times
    const pairs = counts(left, left.interp.times).flatMap(onLeft => counts(right, right.interp.times)
        .map(onRight => ({ l: onLeft, r: onRight, sum: onLeft + sign * onRight })))
        .filter(({ sum }) => wanted.times === undefined || wanted.times.includes(sum))
    if (pairs.length === 0) {
        throw new Unsatisfiable('cannot add or subtract these units to get the times wanted')
    }
    // the fewest quantities in play, and of those the most on the left
    const best = pairs.reduce((a, b) => {
        const [near, far] = [Math.abs(a.l) + Math.abs(a.r), Math.abs(b.l) + Math.abs(b.r)]
        return near < far || (near === far && a.l >= b.l) ? a : b
    })
    const over = inferWithFallback(ast.left, scope, { unit, times: [best.l] })
    const under = inferWithFallback(ast.right, after(scope, over), { unit, times: [best.r] })
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
    const left = inferWithFallback(ast.left, scope, noUnitExpectation)
    const right = inferWithFallback(ast.right, after(scope, left), noUnitExpectation)
    const scaling = right.literal ?? left.literal
    const scaled = right.literal !== undefined ? left : right
    // x * const, const * x, and x / const are all constant scalings, other multiplications aren't.
    if (scaling !== undefined && (power === 1 || right.literal !== undefined)) {
        if (wanted.unit !== undefined && right.literal !== undefined) {
            // a conversion lands on the literal rather than the whole product: population + area * 2
            // reads Area × 2/km^2
            const carries = power === 1
                ? unitProduct(wanted.unit, countedUnit(scaled.interp), -1)
                : unitProduct(countedUnit(scaled.interp), wanted.unit, -1)
            if (carries !== undefined) {
                const taken = inferWithFallback(ast.right, after(scope, left), { unit: carries })
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
                    : scaled.interp.times.map(each => power === 1 ? each * scaling : each / scaling),
                flexibility: 'flexiblePreference',
            },
        }
    }
    const over = inferWithFallback(ast.left, scope, { times: [0] })
    const under = inferWithFallback(ast.right, after(scope, over), { times: [0] })
    const unit = unitOfProduct(over, under, power)
    return {
        ast: { ...ast, left: packExpression(over), right: packExpression(under) },
        variables: under.variables,
        interp: { unit, times: [unit.unit.times], flexibility: stronger(over.interp.flexibility, under.interp.flexibility) },
    }
}

function unitOfProduct(left: InferenceResult, right: InferenceResult, power: 1 | -1): StoredUnit {
    const product = unitProduct(countedUnit(left.interp), countedUnit(right.interp), power)
    if (product === undefined) {
        throw new Unsatisfiable('nothing multiplies a quantity counted from a zero of its own')
    }
    return product
}

/** A temperature has no square, so what is raised to a power is a difference. */
function raised(ast: Expression & { type: 'binaryOperator' }, scope: Scope): InferenceResult {
    const left = inferWithFallback(ast.left, scope, { times: [0] })
    const right = inferWithFallback(ast.right, after(scope, left), noUnitExpectation)
    const exponent = right.literal
    return {
        ast: { ...ast, left: packExpression(left), right: packExpression(right) },
        variables: right.variables,
        interp: {
            unit: (exponent === undefined ? undefined : unitPower(countedUnit(left.interp), exponent)) ?? dimensionless,
            times: [1],
            flexibility: left.interp.flexibility,
        },
    }
}

interface ReadArgument { arg: UrbanStatsASTArg<UnitInferenceMetadata>, inferred: InferenceResult }

function call(ast: Expression & { type: 'call' }, scope: Scope, wanted: UnitExpectation): InferenceResult {
    const propagation = propagationOf(ast.fn, scope)
    const args = (inWhat: UnitExpectation): ReadArgument[] => {
        const all: ReadArgument[] = []
        let soFar = scope
        for (const arg of ast.args) {
            const inferred = inferWithFallback(arg.value, soFar, ofArgument(propagation, inWhat))
            all.push({ arg: { ...arg, value: packExpression(inferred) }, inferred })
            soFar = after(soFar, inferred)
        }
        return all
    }
    const claimed = args(wanted)
    // arguments that must agree are reread in their unified unit, not whichever the first claimed
    const all = argumentsAgree(propagation)
        ? args({ ...wanted, unit: unifyUnits(claimed.map(({ inferred }) => inferred.interp)).unit })
        : claimed
    const here = {
        ast: { ...ast, fn: packExpression(inferWithFallback(ast.fn, scope, noUnitExpectation)), args: all.map(({ arg }) => arg) },
        variables: all.at(-1)?.inferred.variables ?? scope.variables,
    }
    return { ...here, interp: gives(propagation, all.map(({ inferred }) => inferred), all) }
}

/** Whether every argument has to be in one unit, as max and min need of theirs. */
function argumentsAgree(propagation: UnitPropagation | undefined): boolean {
    return propagation?.kind === 'either' || propagation?.kind === 'rank'
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
            // read twice by the caller: first each argument claims a unit, then all take the unified one
            return { unit: wanted.unit }
        default:
            return noUnitExpectation
    }
}

function gives(propagation: UnitPropagation | undefined, args: InferenceResult[], named: { arg: UrbanStatsASTArg<UnitInferenceMetadata> }[]): UnitAbstractInterp {
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
                unit: (first === undefined ? undefined : unitPower(countedUnit(first.interp), propagation.exponent)) ?? dimensionless,
                times: [1],
                flexibility: first?.interp.flexibility ?? 'naturalPreference',
            }
        case 'either':
            return unifyUnits(args.map(each => each.interp))
        case 'regression':
            return { ...bareNumber, fields: regressionFields(args, named) }
    }
}

const parameterName = /^x(\d+)$/

/** What a regression gives back: an intercept in the units of what it was given, and slopes. */
function regressionFields(args: InferenceResult[], named: { arg: UrbanStatsASTArg<UnitInferenceMetadata> }[]): ReadonlyMap<string, UnitAbstractInterp> {
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
                unit: unitProduct(measured, countedUnit(args[index].interp), -1) ?? dimensionless,
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
    // empty expressions just fall back to bare number. doesn't really matter since it won't type check anyway.
    return { ast: stamped, variables: soFar.variables, interp: last ?? bareNumber }
}

interface InferredStatement {
    interp: UnitAbstractInterp
    ast: Statement
    variables: Bindings
}

function inferStatement(ast: Statement, scope: Scope, wanted: UnitExpectation): InferredStatement {
    const inferred = statementWithin(ast, scope, wanted)
    return { ...inferred, ast: { ...inferred.ast, computesTo: counted(inferred.interp.unit, inferred.interp.times) } }
}

function statementWithin(ast: Statement, scope: Scope, wanted: UnitExpectation): InferredStatement {
    switch (ast.type) {
        case 'parseError':
            return { ast, variables: scope.variables, interp: { unit: dimensionless, times: [0, 1], flexibility: 'naturalPreference' } }
        case 'expression': {
            const inner = inferWithFallback(ast.value, scope, wanted)
            return { ...inner, ast: { ...ast, value: packExpression(inner) } }
        }
        case 'assignment': {
            const inner = inferWithFallback(ast.value, scope, wanted)
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
            const condition = inferWithFallback(ast.condition, scope, noUnitExpectation)
            const rest = inferBlock(ast.rest, after(scope, condition), wanted)
            return { ...rest, ast: { ...ast, condition: packExpression(condition), rest: rest.ast } }
        }
    }
}

const toNumberOfOneThing = l.call({ fn: l.identifier('toNumber'), namedArgs: {}, unnamedArgs: [l.passthrough<UnitInferenceMetadata>()] })
const primitive = l.union<USSPrimitiveRawValue>([l.number(), l.string(), l.boolean()])

/** What a toNumber call is read as, or undefined where the expression is not one. */
function attemptParseNumber(ast: Expression, scope: Scope): Expression | undefined {
    // a script that binds the name itself is calling something else
    if (scope.variables.has('toNumber')) return undefined
    const inner = l.tryParse(toNumberOfOneThing, ast, scope.typeEnvironment)?.unnamedArgs[0]
    if (inner === undefined) return undefined
    // toNumber("1000") is the number 1000. A string of no number at all is left as it was
    const literal = l.tryParse(primitive, inner, scope.typeEnvironment)
    const value = literal === undefined ? undefined : asNumber(literal)
    return value === undefined
        ? inner
        : { type: 'constant', value: { node: { type: 'number', value }, location: locationOf(inner) }, computesTo: dimensionless }
}

/** The script rewritten, every node of it saying the unit it computes. */
export function unitCheck<M>(program: MapUSS<M>, typeEnvironment: TypeEnvironment, declaredUnits?: DeclaredUnits): MapUSS<M & UnitInferenceMetadata>
export function unitCheck<M>(program: UrbanStatsASTStatement<M>, typeEnvironment: TypeEnvironment, declaredUnits?: DeclaredUnits): Statement
export function unitCheck<M>(program: UrbanStatsASTExpression<M>, typeEnvironment: TypeEnvironment, declaredUnits?: DeclaredUnits): Expression
export function unitCheck(program: Expression | Statement, typeEnvironment: TypeEnvironment, declaredUnits: DeclaredUnits = nothingDeclared): Expression | Statement {
    const scope: Scope = { typeEnvironment, variables: new Map(), declaredUnits }
    return isExpression(program)
        ? packExpression(inferWithFallback(program, scope, noUnitExpectation))
        : inferStatement(program, scope, noUnitExpectation).ast
}

function isExpression(ast: Expression | Statement): ast is Expression {
    return !['assignment', 'expression', 'statements', 'condition', 'parseError'].includes(ast.type)
}
