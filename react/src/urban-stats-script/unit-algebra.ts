import { dimensionless, sameDimensions, StoredUnit, unitPower, unitProduct } from '../utils/quantity'

import { BinaryOperatorSymbol, UnaryOperatorSymbol } from './operators'

/** `any` is that it could be in any unit; `none` is that no quantity is of it, as people plus an area. */
export type Known = (
    { kind: 'any', constant?: number }
    | { kind: 'none' }
    | { kind: 'in', unit: StoredUnit, constant?: number }
)

export function constant(value: number): Known {
    return { kind: 'any', constant: value }
}

export function inUnit(unit: StoredUnit): Known {
    return { kind: 'in', unit }
}

function unitOf(known: Known): StoredUnit | undefined {
    return known.kind === 'in' ? known.unit : undefined
}

function quantity(unit: StoredUnit | undefined): Known {
    return unit === undefined ? { kind: 'none' } : { kind: 'in', unit }
}

/**
 * Asked at the end rather than at every step: two temperatures added are neither one temperature
 * nor none, but their mean is one again, and refusing the sum on the way past would lose that.
 */
export function unitToWriteIn(known: Known): StoredUnit | undefined {
    const unit = unitOf(known)
    if (unit === undefined || (!unit.unit.baseIsScalar && unit.unit.times !== 0 && unit.unit.times !== 1)) {
        return undefined
    }
    return unit
}

function withTimes(unit: StoredUnit, times: number): Known {
    return quantity({ ...unit, unit: { ...unit.unit, times } })
}

function asFactor(known: Known): number | undefined {
    return known.kind === 'any' ? known.constant : undefined
}

/** How an operator's slots are related, which is what both directions are read off. */
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
    const [over, under] = [unitOf(left), unitOf(right)]
    // one side saying nothing is taken to be of the other's kind, since only alike things add
    const unit = over ?? under
    if (unit === undefined) {
        return { kind: 'any' }
    }
    if (over !== undefined && under !== undefined && !sameDimensions(over, under)) {
        // nothing is both, so nothing is their sum
        return { kind: 'none' }
    }
    // a bare number added to a temperature is a number of degrees rather than a temperature
    return withTimes(unit, form.combine(over?.unit.times ?? 0, under?.unit.times ?? 0))
}

function productForward(rightPower: 1 | -1, left: Known, right: Known): Known {
    const [over, under] = [unitOf(left), unitOf(right)]
    const [byLeft, byRight] = [asFactor(left), asFactor(right)]
    if (byRight !== undefined && over !== undefined) {
        // scaling a quantity scales how many of itself it is: half of two temperatures is one
        return withTimes(over, over.unit.times * (rightPower === 1 ? byRight : 1 / byRight))
    }
    if (byLeft !== undefined && under !== undefined) {
        return rightPower === 1
            ? withTimes(under, under.unit.times * byLeft)
            // a number over a quantity is not that many of it, but one over it
            : quantity(unitProduct(dimensionless, under, -1))
    }
    if (over === undefined || under === undefined) {
        return { kind: 'any' }
    }
    return quantity(unitProduct(over, under, rightPower))
}

export function forward(operator: BinaryOperatorSymbol, left: Known, right: Known): Known {
    // nothing computed from something no quantity is of is a quantity either
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
            const [base, exponent] = [unitOf(left), asFactor(right)]
            return exponent === undefined || base === undefined ? { kind: 'any' } : quantity(unitPower(base, exponent))
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

/** How the 0.1 of `commute_bike < 0.1` is read as ten percent. */
export function backward(operator: BinaryOperatorSymbol, result: Known, known: Known, side: 'left' | 'right'): Known {
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
            // a comparison says nothing of its own kind, but its operands are of each other's
            return form.keepsUnit ? undo(operator as '+' | '-', result, known, side) : known
        case 'product':
            return undo(operator as '*' | '/', result, known, side)
    }
}

export function forwardUnary(operator: UnaryOperatorSymbol, operand: Known): Known {
    return operator === '!' ? { kind: 'any' } : operand
}
