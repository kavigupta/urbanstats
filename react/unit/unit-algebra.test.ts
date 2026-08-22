import assert from 'assert/strict'
import test from 'node:test'

import { BinaryOperatorSymbol, infixOperators } from '../src/urban-stats-script/operators'
import { backward, constant, forward, forwardUnary, inUnit, Known, unitToWriteIn } from '../src/urban-stats-script/unit-algebra'
import { StoredUnit } from '../src/utils/quantity'
import { storedUnits } from '../src/utils/unit'

/** What is known, as a string: the dimensions, how many of itself it is, and its scale. */
function shape(known: Known): string {
    if (known.kind !== 'in') return known.kind === 'any' ? 'unknown' : 'inconsistent'
    const written = [...known.unit.unit.dimensions]
        .sort((a, b) => a.baseUnit.localeCompare(b.baseUnit))
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
    return `${written === '' ? 'dimensionless' : written} times=${known.unit.unit.times} x${known.unit.toBaseUnits}`
}

const unknown: Known = { kind: 'any' }
const inconsistent: Known = { kind: 'none' }
const people = inUnit(storedUnits.population)
const area = inUnit(storedUnits.area)
const temperature = inUnit(storedUnits.temperature)
const difference = (of: StoredUnit): Known => inUnit({ ...of, unit: { ...of.unit, times: 0 } })

void test('a product adds dimensions and a quotient subtracts them', () => {
    assert.equal(shape(forward('*', people, area)), 'm^2 person^1 times=1 x1000000')
    assert.equal(shape(forward('/', people, area)), 'm^-2 person^1 times=1 x0.000001')
    assert.equal(shape(forward('/', people, people)), 'dimensionless times=1 x1')
})

void test('a bare number scales a quantity rather than being a quantity', () => {
    assert.equal(shape(forward('*', people, constant(2))), 'person^1 times=2 x1')
    assert.equal(shape(forward('*', constant(2), people)), 'person^1 times=2 x1')
    // and a number over a quantity is one over it, not that many of it
    assert.equal(shape(forward('/', constant(1), people)), 'person^-1 times=1 x1')
})

void test('only alike things add, and the sum is of their kind', () => {
    assert.equal(shape(forward('+', people, people)), 'person^1 times=2 x1')
    assert.equal(shape(forward('-', people, people)), 'person^1 times=0 x1')
    // nothing is both people and an area, so nothing is their sum
    assert.equal(shape(forward('+', people, area)), 'inconsistent')
})

void test('a side that says nothing is taken to be of the other side\'s kind', () => {
    assert.equal(shape(forward('+', people, unknown)), 'person^1 times=1 x1')
    assert.equal(shape(forward('+', unknown, people)), 'person^1 times=1 x1')
    assert.equal(shape(forward('+', unknown, unknown)), 'unknown')
})

void test('a temperature is one of itself, and only stays a quantity while it is one or none', () => {
    assert.equal(shape(temperature), 'F^1 times=1 x1')
    // a difference of two temperatures is none of one, which is a quantity of degrees
    assert.equal(shape(forward('-', temperature, temperature)), 'F^1 times=0 x1')
    // their sum is two temperatures, which is carried along even though it is not one
    assert.equal(shape(forward('+', temperature, temperature)), 'F^1 times=2 x1')
    // because their mean is a temperature again
    assert.equal(shape(forward('/', forward('+', temperature, temperature), constant(2))), 'F^1 times=1 x1')
    // and a number of degrees added to one is a temperature
    assert.equal(shape(forward('+', temperature, constant(2))), 'F^1 times=1 x1')
})

void test('two temperatures are not a temperature, and nothing writes them as one', () => {
    assert.equal(unitToWriteIn(forward('+', temperature, temperature)), undefined)
    assert.equal(unitToWriteIn(forward('*', temperature, constant(2))), undefined)
    // where a mean of them, and a difference, are things to write
    assert.notEqual(unitToWriteIn(forward('/', forward('+', temperature, temperature), constant(2))), undefined)
    assert.notEqual(unitToWriteIn(forward('-', temperature, temperature)), undefined)
    assert.notEqual(unitToWriteIn(people), undefined)
})

void test('a temperature cannot be multiplied by another quantity', () => {
    // twice a temperature is two of them, which is carried, though it is not a temperature
    assert.equal(shape(forward('*', temperature, constant(2))), 'F^1 times=2 x1')
    // where there is no such quantity at all as a temperature times a population
    assert.equal(shape(forward('*', temperature, people)), 'inconsistent')
    assert.equal(shape(forward('**', temperature, constant(2))), 'inconsistent')
    // a difference of two of them may be, since it is measured from nothing
    assert.equal(shape(forward('*', difference(storedUnits.temperature), constant(2))), 'F^1 times=0 x1')
})

void test('a power needs its exponent to be a constant', () => {
    assert.equal(shape(forward('**', inUnit(storedUnits.distanceInKm), constant(2))), 'm^2 times=1 x1000000')
    assert.equal(shape(forward('**', inUnit(storedUnits.distanceInKm), people)), 'unknown')
})

void test('a comparison is of no kind, and its operands are of each other\'s', () => {
    assert.equal(shape(forward('<', people, constant(2))), 'unknown')
    assert.equal(shape(backward('<', unknown, people, 'right')), 'person^1 times=1 x1')
    assert.equal(shape(backward('==', unknown, area, 'left')), 'm^2 times=1 x1000000')
})

void test('an operand is found by undoing the operator', () => {
    const perArea = forward('/', people, area)
    assert.equal(shape(backward('/', perArea, area, 'left')), 'person^1 times=1 x1')
    assert.equal(shape(backward('/', perArea, people, 'right')), 'm^2 times=1 x1000000')
    const total = forward('*', people, area)
    assert.equal(shape(backward('*', total, area, 'left')), 'person^1 times=1 x1')
    assert.equal(shape(backward('*', total, people, 'right')), 'm^2 times=1 x1000000')
})

void test('a difference gives back the level it was taken from', () => {
    const change = forward('-', people, people)
    assert.equal(shape(backward('-', change, people, 'left')), 'person^1 times=1 x1')
    assert.equal(shape(backward('+', people, difference(storedUnits.population), 'left')), 'person^1 times=1 x1')
})

void test('every operator answers in both directions, whatever it is given', () => {
    const inputs = [unknown, people, temperature, constant(2), constant(0)]
    for (const operator of infixOperators satisfies readonly BinaryOperatorSymbol[]) {
        for (const left of inputs) {
            for (const right of inputs) {
                assert.doesNotThrow(() => forward(operator, left, right))
                assert.doesNotThrow(() => backward(operator, left, right, 'left'))
                assert.doesNotThrow(() => backward(operator, left, right, 'right'))
            }
        }
    }
})

void test('negating a quantity leaves it what it was, and not-ing it says nothing', () => {
    assert.equal(shape(forwardUnary('-', people)), 'person^1 times=1 x1')
    assert.equal(shape(forwardUnary('!', people)), 'unknown')
})

// Not knowing which unit something is in is a different thing from nothing being of any unit, and
// the second is worth telling a script's author about where the first is not
void test('what cannot be told apart from what cannot be', () => {
    assert.equal(shape(unknown), 'unknown')
    assert.equal(shape(inconsistent), 'inconsistent')
    assert.equal(shape(forward('+', people, area)), 'inconsistent')
    assert.equal(shape(forward('+', unknown, unknown)), 'unknown')
    // and nothing computed from what cannot be is either
    assert.equal(shape(forward('*', forward('+', people, area), constant(2))), 'inconsistent')
    assert.equal(shape(backward('*', forward('+', people, area), people, 'left')), 'inconsistent')
    // neither is written in anything, which is all the display asks
    assert.equal(unitToWriteIn(unknown), undefined)
    assert.equal(unitToWriteIn(inconsistent), undefined)
})
