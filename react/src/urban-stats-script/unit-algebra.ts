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

/**
 * Asked at the end rather than at every step: two temperatures added are neither one temperature
 * nor none, but their mean is one again, and refusing the sum on the way past would lose that.
 */
export function unitToWriteIn(known: Known): StoredUnit | undefined {
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
type Possible = Exclude<Known, { kind: 'none' }>

function withTimes(unit: StoredUnit, times: number): Known {
    return { kind: 'in', unit: { ...unit, unit: { ...unit.unit, times } } }
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

function addedForward(form: { combine: (left: number, right: number) => number }, left: Possible, right: Possible): Known {
    // a side saying nothing is taken to be of the other's kind, since only alike things add, and a
    // bare number added to a temperature is a number of degrees rather than a temperature
    if (left.kind === 'any') {
        return right.kind === 'any' ? { kind: 'any' } : withTimes(right.unit, form.combine(0, right.unit.unit.times))
    }
    if (right.kind === 'any') {
        return withTimes(left.unit, form.combine(left.unit.unit.times, 0))
    }
    // nothing is both people and an area, so nothing is their sum
    if (!sameDimensions(left.unit, right.unit)) {
        return { kind: 'none' }
    }
    return withTimes(left.unit, form.combine(left.unit.unit.times, right.unit.unit.times))
}

function productForward(rightPower: 1 | -1, left: Possible, right: Possible): Known {
    if (left.kind === 'any') {
        if (right.kind === 'any' || left.constant === undefined) {
            return { kind: 'any' }
        }
        // scaling a quantity scales how many of itself it is: half of two temperatures is one
        if (rightPower === 1) {
            return withTimes(right.unit, right.unit.unit.times * left.constant)
        }
        // where a number over a quantity is not that many of it, but one over it
        const inverted = unitProduct(dimensionless, right.unit, -1)
        return inverted === undefined ? { kind: 'none' } : { kind: 'in', unit: inverted }
    }
    if (right.kind === 'any') {
        return right.constant === undefined
            ? { kind: 'any' }
            : withTimes(left.unit, left.unit.unit.times * (rightPower === 1 ? right.constant : 1 / right.constant))
    }
    const product = unitProduct(left.unit, right.unit, rightPower)
    return product === undefined ? { kind: 'none' } : { kind: 'in', unit: product }
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
            if (left.kind !== 'in' || right.kind !== 'any' || right.constant === undefined) {
                return { kind: 'any' }
            }
            const raised = unitPower(left.unit, right.constant)
            return raised === undefined ? { kind: 'none' } : { kind: 'in', unit: raised }
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
