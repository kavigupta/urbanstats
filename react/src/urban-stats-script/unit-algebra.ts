import { dimensionless, sameDimensions, StoredUnit, unitPower, unitProduct } from '../utils/quantity'

import { BinaryOperatorSymbol, UnaryOperatorSymbol } from './operators'

/**
 * What is known about a value: the unit it is in, where that can be told, and the value itself,
 * where it is a constant. Knowing nothing is an ordinary member of this rather than a failure to
 * be one, so every expression has one and no operation on them can fail.
 */
export interface Known {
    unit?: StoredUnit
    constant?: number
}

export const unknown: Known = {}

/** A number written in the script, which is in whatever unit the operator on it says it is. */
export function constant(value: number): Known {
    return { constant: value }
}

export function inUnit(unit: StoredUnit): Known {
    return { unit }
}

function quantity(unit: StoredUnit | undefined): Known {
    return unit === undefined ? unknown : { unit }
}

/**
 * The unit to write a value in, which a quantity measured from a zero of its own has only while it
 * is one of itself or none of it. Two temperatures added together are neither -- but their mean is
 * one again, so this is asked at the end rather than of every step along the way.
 */
export function unitToWriteIn(known: Known): StoredUnit | undefined {
    const { unit } = known
    if (unit === undefined || (!unit.unit.baseIsScalar && unit.unit.times !== 0 && unit.unit.times !== 1)) {
        return undefined
    }
    return unit
}

function withTimes(unit: StoredUnit, times: number): Known {
    return quantity({ ...unit, unit: { ...unit.unit, times } })
}

/** A constant with no unit of its own, which is what a bare number is when it scales something. */
function asFactor(known: Known): number | undefined {
    return known.unit === undefined ? known.constant : undefined
}

/**
 * The shapes an operator takes. Each says how its slots are related; the directions are read off
 * that relation rather than written out one at a time.
 */
type Form =
    /** Every slot is the same unit, and the operands' coefficients combine into the result's. */
    | { kind: 'sameUnit', combine: (left: number, right: number) => number, keepsUnit: boolean }
    /** The operands' dimensions add, or subtract where the right is taken to the power -1. */
    | { kind: 'product', rightPower: 1 | -1 }
    /** The left raised to the right, which has to be a constant for anything to be said. */
    | { kind: 'power' }
    /** Nothing relates the slots, so nothing can be told from any of them. */
    | { kind: 'opaque' }

const comparison: Form = { kind: 'sameUnit', combine: () => 0, keepsUnit: false }

const forms: Record<BinaryOperatorSymbol, Form> = {
    '+': { kind: 'sameUnit', combine: (left, right) => left + right, keepsUnit: true },
    '-': { kind: 'sameUnit', combine: (left, right) => left - right, keepsUnit: true },
    // a comparison is between two of the same kind, and is itself of no kind at all
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

function addedForward(form: { combine: (left: number, right: number) => number }, left: Known, right: Known): Known {
    // one side saying nothing is taken to be of the other's kind, since only alike things add
    const unit = left.unit ?? right.unit
    if (unit === undefined) {
        return unknown
    }
    if (left.unit !== undefined && right.unit !== undefined && !sameDimensions(left.unit, right.unit)) {
        return unknown
    }
    // a bare number added to a temperature is a number of degrees rather than a temperature
    return withTimes(unit, form.combine(left.unit?.unit.times ?? 0, right.unit?.unit.times ?? 0))
}

function productForward(rightPower: 1 | -1, left: Known, right: Known): Known {
    const [byLeft, byRight] = [asFactor(left), asFactor(right)]
    if (byRight !== undefined && left.unit !== undefined) {
        // scaling a quantity scales how many of itself it is: half of two temperatures is one
        return withTimes(left.unit, left.unit.unit.times * (rightPower === 1 ? byRight : 1 / byRight))
    }
    if (byLeft !== undefined && right.unit !== undefined) {
        return rightPower === 1
            ? withTimes(right.unit, right.unit.unit.times * byLeft)
            // a number over a quantity is not that many of it, but one over it
            : quantity(unitProduct(dimensionless, right.unit, -1))
    }
    if (left.unit === undefined || right.unit === undefined) {
        return unknown
    }
    return quantity(unitProduct(left.unit, right.unit, rightPower))
}

/** What is known about `left operator right`, from what is known about each of them. */
export function forward(operator: BinaryOperatorSymbol, left: Known, right: Known): Known {
    const form = forms[operator]
    switch (form.kind) {
        case 'opaque':
            return unknown
        case 'sameUnit':
            return form.keepsUnit ? addedForward(form, left, right) : unknown
        case 'product':
            return productForward(form.rightPower, left, right)
        case 'power': {
            const exponent = asFactor(right)
            return exponent === undefined || left.unit === undefined
                ? unknown
                : quantity(unitPower(left.unit, exponent))
        }
    }
}

const inverses = { '+': '-', '-': '+', '*': '/', '/': '*' } as const

/** Solving an operator for one of its operands is running the operator that undoes it. */
function undo(operator: keyof typeof inverses, result: Known, known: Known, side: 'left' | 'right'): Known {
    if (side === 'left') {
        return forward(inverses[operator], result, known)
    }
    // the right of a sum or a product is found the same way; of a difference or a quotient, the
    // operands change places, since the right of `a - b` is `a - result` rather than `result - a`
    return operator === '+' || operator === '*'
        ? forward(inverses[operator], result, known)
        : forward(operator, known, result)
}

/**
 * What is known about the other operand of `left operator right`, from the result and one of them.
 * This is how a bare number written against a quantity is read in that quantity's unit.
 */
export function backward(operator: BinaryOperatorSymbol, result: Known, known: Known, side: 'left' | 'right'): Known {
    const form = forms[operator]
    switch (form.kind) {
        case 'opaque':
        // a power is undone by a root, which is not one of these operators
        case 'power':
            return unknown
        case 'sameUnit':
            // a comparison says nothing of its own kind, but its operands are of each other's
            return form.keepsUnit ? undo(operator as '+' | '-', result, known, side) : quantity(known.unit)
        case 'product':
            return undo(operator as '*' | '/', result, known, side)
    }
}

/** What is known about `operator operand`. Negating a quantity leaves it the quantity it was. */
export function forwardUnary(operator: UnaryOperatorSymbol, operand: Known): Known {
    return operator === '!' ? unknown : operand
}
