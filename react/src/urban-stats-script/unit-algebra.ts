import { assert } from '../utils/defensive'
import { Coefficient, Decoration, dimensionless, Party, sameDimensions, snapToWhole, StoredUnit, unitPower, unitProduct } from '../utils/quantity'

import { BinaryOperatorSymbol, UnaryOperatorSymbol } from './operators'

/** `any` is that it could be in any unit; `none` is that no quantity is of it, as people plus an area. */
export type AbstractInterpValue = (
    { kind: 'any', constant?: number }
    | { kind: 'none' }
    | { kind: 'in', unit: StoredUnit, constant?: number }
)

export function constant(value: number): AbstractInterpValue {
    return { kind: 'any', constant: value }
}

export function inUnit(unit: StoredUnit): AbstractInterpValue {
    return { kind: 'in', unit }
}

/** As many of it as there were, which is not a number the reading can say. */
export function manyOf(value: AbstractInterpValue): AbstractInterpValue {
    return value.kind === 'in' ? written(value.unit, 'unknown') : value
}

/**
 * Asked at the end rather than at every step: two temperatures added are neither one temperature
 * nor none, but their mean is one again, and refusing the sum on the way past would lose that.
 */
export function unitToWriteIn(known: AbstractInterpValue): StoredUnit | undefined {
    if (known.kind !== 'in') {
        return undefined
    }
    const { unit } = known
    if (!unit.unit.baseIsScalar && unit.unit.times !== 0 && unit.unit.times !== 1) {
        return undefined
    }
    return unit
}

/** What an operand can be, once forward and backward have refused what came from nothing. */
type KnownAIV = Exclude<AbstractInterpValue, { kind: 'none' }>

function sameParty(left: Party | undefined, right: Party | undefined): boolean {
    if (left === undefined || right === undefined) {
        return left === right
    }
    if (left.kind === 'color' && right.kind === 'color') {
        return left.hue === right.hue
    }
    return left.kind === 'lead' && right.kind === 'lead' && left.system === right.system
}

/**
 * What both sides were dressed in, where that is the same thing. An orange share less a red one is
 * a share of no party, and a lead less a share is not a lead: whose it is does not survive.
 */
function sharedDecoration(left: Decoration, right: Decoration): Decoration {
    if (left.kind === 'percent' && right.kind === 'percent') {
        return sameParty(left.party, right.party) ? left : { kind: 'percent' }
    }
    if (left.kind === 'writtenIn' && right.kind === 'writtenIn' && left.in === right.in) {
        return left
    }
    return { kind: 'none' }
}

function written(unit: StoredUnit, times: Coefficient, decoration = unit.unit.decoration): AbstractInterpValue {
    return { kind: 'in', unit: { ...unit, unit: { ...unit.unit, decoration, times } } }
}

/** A hair apart after arithmetic is the same size: a square root squared does not come back exact. */
function sameSize(left: number, right: number): boolean {
    return Math.abs(left - right) <= 1e-9 * Math.max(Math.abs(left), Math.abs(right))
}

/** Arithmetic on coefficients, where anything but a number of them leaves how many there are unknown. */
function combined(left: Coefficient, right: Coefficient, combine: (left: number, right: number) => number): Coefficient {
    if (left === 'unknown' || right === 'unknown') {
        return 'unknown'
    }
    const times = combine(left, right)
    return Number.isFinite(times) ? snapToWhole(times) : 'unknown'
}

function joinedTimes(left: Coefficient, right: Coefficient): Coefficient {
    if (left === 'unknown' || right === 'unknown' || !sameSize(left, right)) {
        return 'unknown'
    }
    return left
}

function joinedUnits(left: StoredUnit, right: StoredUnit): StoredUnit | undefined {
    if (!sameDimensions(left, right) || left.unit.baseIsScalar !== right.unit.baseIsScalar) {
        return undefined
    }
    if (!sameSize(left.toBaseUnits, right.toBaseUnits)) {
        return undefined
    }
    return { ...left, unit: {
        ...left.unit,
        decoration: sharedDecoration(left.unit.decoration, right.unit.decoration),
        times: joinedTimes(left.unit.times, right.unit.times),
    } }
}

/** Either of two, as the arms of an `if` are: two of a kind are of it, and two of different kinds are of any. */
export function join(left: AbstractInterpValue, right: AbstractInterpValue): AbstractInterpValue {
    if (left.kind === 'none') {
        return right
    }
    if (right.kind === 'none') {
        return left
    }
    const shared = left.constant === right.constant ? left.constant : undefined
    if (left.kind === 'in' && right.kind === 'in') {
        const unit = joinedUnits(left.unit, right.unit)
        if (unit !== undefined) {
            return shared === undefined ? { kind: 'in', unit } : { kind: 'in', unit, constant: shared }
        }
    }
    return shared === undefined ? { kind: 'any' } : { kind: 'any', constant: shared }
}

/** How an operator's slots relate, which is what both directions are read off. */
type Form =
    /** Every slot is the same unit, and the operands' coefficients combine into the result's. */
    | { kind: 'sameUnit', combine: (left: number, right: number) => number, keepsUnit: boolean }
    /** The operands' dimensions add, or subtract where the right is taken to the power -1. */
    | { kind: 'product', rightPower: 1 | -1 }
    /** The left raised to the right, which has to be a constant for anything to be said. */
    | { kind: 'power' }
    /** Nothing relates the slots. */
    | { kind: 'opaque' }

const comparison: Form = { kind: 'sameUnit', combine: () => 0, keepsUnit: false }

const forms: Record<BinaryOperatorSymbol, Form> = {
    '+': { kind: 'sameUnit', combine: (left, right) => left + right, keepsUnit: true },
    '-': { kind: 'sameUnit', combine: (left, right) => left - right, keepsUnit: true },
    // between two of the same kind, and itself of no kind
    '==': comparison,
    '!=': comparison,
    '<': comparison,
    '>': comparison,
    '<=': comparison,
    '>=': comparison,
    '*': { kind: 'product', rightPower: 1 },
    '/': { kind: 'product', rightPower: -1 },
    '**': { kind: 'power' },
    '&': { kind: 'opaque' },
    '|': { kind: 'opaque' },
}

function addedForward(form: { combine: (left: number, right: number) => number }, left: KnownAIV, right: KnownAIV): AbstractInterpValue {
    // a side saying nothing is taken to be of the other's kind, since only alike things add; a
    // bare number added to a temperature is a number of degrees
    if (left.kind === 'any') {
        return right.kind === 'any' ? { kind: 'any' } : written(right.unit, combined(0, right.unit.unit.times, form.combine))
    }
    if (right.kind === 'any') {
        return written(left.unit, combined(left.unit.unit.times, 0, form.combine))
    }
    // nothing is both people and an area, so nothing is their sum
    if (!sameDimensions(left.unit, right.unit)) {
        return { kind: 'none' }
    }
    return written(
        left.unit,
        combined(left.unit.unit.times, right.unit.unit.times, form.combine),
        sharedDecoration(left.unit.unit.decoration, right.unit.unit.decoration),
    )
}

function productForward(rightPower: 1 | -1, left: KnownAIV, right: KnownAIV): AbstractInterpValue {
    if (left.kind === 'any') {
        if (right.kind === 'any' || left.constant === undefined) {
            return { kind: 'any' }
        }
        // scaling a quantity scales how many of itself it is: half of two temperatures is one
        if (rightPower === 1) {
            return written(right.unit, combined(right.unit.unit.times, left.constant, (times, scale) => times * scale))
        }
        // where a number over a quantity is not that many of it, but one over it
        const inverted = unitProduct(dimensionless, right.unit, -1)
        return inverted === undefined ? { kind: 'none' } : written(inverted, combined(left.constant, right.unit.unit.times, (scale, times) => scale / times))
    }
    if (right.kind === 'any') {
        return right.constant === undefined
            ? { kind: 'any' }
            : written(left.unit, combined(left.unit.unit.times, right.constant, (times, scale) => rightPower === 1 ? times * scale : times / scale))
    }
    const product = unitProduct(left.unit, right.unit, rightPower)
    const times = combined(left.unit.unit.times, right.unit.unit.times, (over, under) => rightPower === 1 ? over * under : over / under)
    return product === undefined ? { kind: 'none' } : written(product, times)
}

export function forward(operator: BinaryOperatorSymbol, left: AbstractInterpValue, right: AbstractInterpValue): AbstractInterpValue {
    // nothing computed from what cannot be, can be
    if (left.kind === 'none' || right.kind === 'none') {
        return { kind: 'none' }
    }
    const form = forms[operator]
    switch (form.kind) {
        case 'opaque':
            return { kind: 'any' }
        case 'sameUnit':
            return form.keepsUnit ? addedForward(form, left, right) : { kind: 'any' }
        case 'product':
            return productForward(form.rightPower, left, right)
        case 'power': {
            if (left.kind !== 'in' || right.kind !== 'any' || right.constant === undefined) {
                return { kind: 'any' }
            }
            const raised = unitPower(left.unit, right.constant)
            // the coefficient is raised along with what it multiplies: (2a)^0.5 is 2^0.5 of a^0.5
            return raised === undefined ? { kind: 'none' } : written(raised, combined(left.unit.unit.times, right.constant, Math.pow))
        }
    }
}

const inverses = { '+': '-', '-': '+', '*': '/', '/': '*' } as const

/** Solving an operator for one of its operands is running the operator that undoes it. */
function undo(operator: keyof typeof inverses, result: AbstractInterpValue, known: AbstractInterpValue, side: 'left' | 'right'): AbstractInterpValue {
    if (side === 'left') {
        return forward(inverses[operator], result, known)
    }
    // the right of a sum or a product is found the same way; of a difference or a quotient, the
    // operands change places, since the right of `a - b` is `a - result` rather than `result - a`
    return operator === '+' || operator === '*'
        ? forward(inverses[operator], result, known)
        : forward(operator, known, result)
}

/** How the 0.1 of `commute_bike < 0.1` is read as ten percent. */
export function backward(operator: BinaryOperatorSymbol, result: AbstractInterpValue, known: AbstractInterpValue, side: 'left' | 'right'): AbstractInterpValue {
    if (result.kind === 'none' || known.kind === 'none') {
        return { kind: 'none' }
    }
    const form = forms[operator]
    switch (form.kind) {
        case 'opaque':
        // a power is undone by a root, which is not one of these operators
        case 'power':
            return { kind: 'any' }
        case 'sameUnit':
            if (!form.keepsUnit) {
                // a comparison says nothing of its own kind, but its operands are of each other's
                return known
            }
            assert(operator === '+' || operator === '-', `${operator} keeps the unit of what it adds`)
            // An operand of an unknown sum may be a level or a difference, so only its dimensions are known.
            return result.kind === 'any' ? manyOf(known) : undo(operator, result, known, side)
        case 'product':
            assert(operator === '*' || operator === '/', `${operator} is a product`)
            return undo(operator, result, known, side)
    }
}

/** Each of these undoes itself: negating twice, or leaving alone twice, is what was there. */
export function backwardUnary(operator: UnaryOperatorSymbol, result: AbstractInterpValue): AbstractInterpValue {
    return forwardUnary(operator, result)
}

export function forwardUnary(operator: UnaryOperatorSymbol, operand: AbstractInterpValue): AbstractInterpValue {
    if (operator === '!') {
        return { kind: 'any' }
    }
    if (operator === '+' || operand.kind === 'none') {
        return operand
    }
    // negating takes it from nothing, so a level becomes minus one of itself, which a temperature
    // has no reading for, where a difference of two is still one
    const negated = operand.constant === undefined ? undefined : -operand.constant
    if (operand.kind === 'any') {
        return { kind: 'any', constant: negated }
    }
    const negatedTimes = written(operand.unit, combined(operand.unit.unit.times, -1, (times, sign) => times * sign))
    return negatedTimes.kind === 'in' ? { ...negatedTimes, constant: negated } : negatedTimes
}
