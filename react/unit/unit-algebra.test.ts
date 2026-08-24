import assert from 'assert/strict'
import test from 'node:test'

import { BinaryOperatorSymbol, infixOperators, unaryOperators } from '../src/urban-stats-script/operators'
import { backward, backwardUnary, constant, forward, forwardUnary, inUnit, join, AbstractInterpValue, unitToWriteIn } from '../src/urban-stats-script/unit-algebra'
import { reifyString } from '../src/utils/human-readable-name'
import { StoredUnit, writeQuantity } from '../src/utils/quantity'
import { storedUnits } from '../src/utils/unit'

/** What is known, as a string: the dimensions, how many of itself it is, and its scale. */
function shape(known: AbstractInterpValue): string {
    if (known.kind !== 'in') return known.kind === 'any' ? 'unknown' : 'inconsistent'
    const written = [...known.unit.unit.dimensions]
        .sort((a, b) => a.baseUnit.localeCompare(b.baseUnit))
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
    return `${written === '' ? 'dimensionless' : written} times=${known.unit.unit.times} x${known.unit.toBaseUnits}`
}

const unknown: AbstractInterpValue = { kind: 'any' }
const inconsistent: AbstractInterpValue = { kind: 'none' }
const people = inUnit(storedUnits.population)
const area = inUnit(storedUnits.area)
const temperature = inUnit(storedUnits.temperature)
const difference = (of: StoredUnit): AbstractInterpValue => inUnit({ ...of, unit: { ...of.unit, times: 0 } })

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

void test('with nothing known of a sum, an operand is of the other\'s dimensions and no count of them', () => {
    // a temperature and a difference of two add to each other either way round, so which of the
    // two an operand is cannot be said, and the 32 of high_temp - 32 is no reading of 32 degrees
    assert.equal(shape(backward('-', unknown, temperature, 'right')), 'F^1 times=unknown x1')
    assert.equal(shape(backward('+', unknown, temperature, 'left')), 'F^1 times=unknown x1')
    assert.equal(unitToWriteIn(backward('-', unknown, temperature, 'right')), undefined)
    // people and a difference of people are written alike, so saying only that much costs nothing
    assert.equal(shape(backward('-', unknown, people, 'right')), 'person^1 times=unknown x1')
    assert.notEqual(unitToWriteIn(backward('-', unknown, people, 'right')), undefined)
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

void test('negating takes a quantity from nothing, which is not what it was', () => {
    assert.equal(shape(forwardUnary('+', people)), 'person^1 times=1 x1')
    assert.equal(shape(forwardUnary('-', people)), 'person^1 times=-1 x1')
    // a difference of two is one however it is signed, so it stays one to write
    assert.equal(shape(forwardUnary('-', difference(storedUnits.population))), 'person^1 times=0 x1')
    assert.notEqual(unitToWriteIn(forwardUnary('-', difference(storedUnits.population))), undefined)
    // where minus a temperature is no reading at all: -50F and -10C are not the same one
    assert.equal(unitToWriteIn(forwardUnary('-', temperature)), undefined)
    assert.equal(shape(forwardUnary('!', people)), 'unknown')
})

void test('a negated number is the negative of it, so that it scales the right way', () => {
    assert.equal(shape(forward('*', people, forwardUnary('-', constant(2)))), 'person^1 times=-2 x1')
    assert.equal(shape(forward('*', people, forwardUnary('+', constant(2)))), 'person^1 times=2 x1')
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

void test('a unary operator undoes itself, so the operand is found the same way', () => {
    for (const operand of [unknown, people, temperature, constant(2), inconsistent]) {
        for (const operator of unaryOperators) {
            assert.equal(shape(backwardUnary(operator, forwardUnary(operator, operand))),
                operator === '!' ? 'unknown' : shape(operand))
        }
    }
})

// Whose a quantity is survives a sum only where both sides are the same party's: an orange share
// less a red one belongs to neither, and a lead less a share is no lead at all
/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
function partyOf(value: AbstractInterpValue): string {
    if (value.kind !== 'in') return value.kind
    const { decoration } = value.unit.unit
    if (decoration.kind !== 'percent') return decoration.kind
    if (decoration.party === undefined) return 'percent'
    return decoration.party.kind === 'color' ? decoration.party.hue : `lead ${decoration.party.system}`
}

for (const [label, left, right, expected] of [
    ['a share less the same party\'s', storedUnits.partyPctOrange, storedUnits.partyPctOrange, 'orange'],
    ['a share less another party\'s', storedUnits.partyPctOrange, storedUnits.partyPctRed, 'percent'],
    ['a share less a plain percentage', storedUnits.partyPctOrange, storedUnits.percentage, 'percent'],
    ['a lead less a percentage', storedUnits.democraticMargin, storedUnits.percentage, 'percent'],
    ['a density less a density', storedUnits.density, storedUnits.density, 'writtenIn'],
] as const) {
    void test(`${label} is written as ${expected}`, () => {
        assert.equal(partyOf(forward('-', inUnit(left), inUnit(right))), expected)
    })
}

void test('scaling a share leaves it the party\'s that it was', () => {
    assert.equal(partyOf(forward('*', inUnit(storedUnits.partyPctOrange), constant(2))), 'orange')
    assert.equal(partyOf(forward('-', inUnit(storedUnits.partyPctOrange), constant(0.05))), 'orange')
})
/* eslint-enable no-restricted-syntax */

// Taking a level from a level leaves a difference, and the site declares some of those already:
// what is inferred for one of them is what was declared for it
for (const [level, declared] of [
    ['partyPctOrange', 'partyChangeOrange'],
    ['partyPctBlue', 'partyChangeBlue'],
    ['percentage', 'percentageChange'],
] as const) {
    void test(`${level} less itself is written as ${declared} is`, () => {
        const inferred = unitToWriteIn(forward('-', inUnit(storedUnits[level]), inUnit(storedUnits[level])))
        assert.notEqual(inferred, undefined)
        const write = (stored: StoredUnit): string => {
            const written = writeQuantity(0.05, stored)
            return `${written.renderedValue}${reifyString(written.unitName)} ${written.hue ?? ''}`
        }
        assert.equal(write(inferred!), write(storedUnits[declared]))
    })
}

void test('a coefficient that comes back a hair off a whole one is the whole one', () => {
    // 49 * (1/49) is 0.9999999999999999, so the mean of 49 temperatures would be no temperature
    let sum = temperature
    for (let count = 1; count < 49; count++) {
        sum = forward('+', sum, temperature)
    }
    const mean = forward('*', sum, constant(1 / 49))
    assert.equal(shape(mean), 'F^1 times=1 x1')
    assert.notEqual(unitToWriteIn(mean), undefined)
})

void test('either of two is of their kind, where they have one', () => {
    assert.equal(shape(join(people, people)), 'person^1 times=1 x1')
    assert.equal(shape(join(people, area)), 'unknown')
    // stored at different scales, they are of one dimension but not of one unit
    assert.equal(shape(join(inUnit(storedUnits.distanceInM), inUnit(storedUnits.distanceInKm))), 'unknown')
    // and where they are of one kind but not one many-of-itself, of that kind, with how many unknown
    assert.equal(shape(join(people, difference(storedUnits.population))), 'person^1 times=unknown x1')
    assert.equal(shape(join(inconsistent, people)), 'person^1 times=1 x1')
    assert.equal(shape(join(unknown, people)), 'unknown')
    assert.equal(shape(join(constant(2), constant(2))), 'unknown')
    assert.equal(shape(join(constant(2), constant(3))), 'unknown')
})

void test('either of two shares of different parties is a share of neither', () => {
    const orange = inUnit(storedUnits.partyPctOrange)
    const joined = join(orange, inUnit(storedUnits.partyPctRed))
    assert.equal(shape(joined), shape(orange))
    assert.equal(writeQuantity(0.05, unitToWriteIn(joined)!).hue, undefined)
    assert.notEqual(writeQuantity(0.05, unitToWriteIn(orange)!).hue, undefined)
})

void test('a coefficient is carried through a product and raised through a power', () => {
    const twice = forward('*', area, constant(2))
    assert.equal(shape(forward('*', twice, people)), 'm^2 person^1 times=2 x1000000')
    assert.equal(shape(forward('/', twice, people)), 'm^2 person^-1 times=2 x1000000')
    assert.equal(shape(forward('/', people, twice)), 'm^-2 person^1 times=0.5 x0.000001')
    assert.equal(shape(forward('**', twice, constant(0.5))), 'm^1 times=1.4142135623730951 x1000')
    // and a difference is still one of nothing however it is scaled
    assert.equal(shape(forward('/', forward('-', area, area), people)), 'm^2 person^-1 times=0 x1000000')
})

void test('a coefficient no longer known is no bar to writing a scalar, and is one to writing a temperature', () => {
    const scaled = join(forward('*', area, constant(2)), area)
    assert.equal(shape(scaled), 'm^2 times=unknown x1000000')
    // an area is written the same whether it is one area or twice one, or a difference of two
    assert.notEqual(unitToWriteIn(scaled), undefined)
    assert.notEqual(unitToWriteIn(join(forward('-', area, area), area)), undefined)
    // where a temperature is not, since only a level is written up from the zero of its scale
    const eitherWay = join(temperature, forward('-', temperature, temperature))
    assert.equal(shape(eitherWay), 'F^1 times=unknown x1')
    assert.equal(unitToWriteIn(eitherWay), undefined)
})

void test('a coefficient that is not a number of anything is no longer known', () => {
    // nothing is minus one area to the half, nor an area over none of one
    assert.equal(shape(forward('**', forwardUnary('-', area), constant(0.5))), 'm^1 times=unknown x1000')
    assert.equal(shape(forward('/', area, forward('-', area, area))), 'dimensionless times=unknown x1')
})

void test('a difference of temperatures multiplies as any other quantity does', () => {
    const change = forward('-', temperature, temperature)
    assert.equal(shape(forward('/', change, area)), 'F^1 m^-2 times=0 x0.000001')
    assert.equal(shape(forward('**', change, constant(2))), 'F^2 times=0 x1')
    // where a reading has no zero to multiply from, and nothing comes of trying
    assert.equal(shape(forward('/', temperature, area)), 'inconsistent')
    assert.equal(shape(forward('*', temperature, temperature)), 'inconsistent')
    assert.equal(shape(forward('/', forwardUnary('-', temperature), area)), 'inconsistent')
})

void test('a difference of temperatures divides into things as well as by them', () => {
    const change = forward('-', temperature, temperature)
    const perDegree = unitToWriteIn(forward('/', people, change))
    assert.notEqual(perDegree, undefined)
    const write = (settings: object): string => {
        const written = writeQuantity(5, perDegree!, settings)
        return `${written.renderedValue}${reifyString(written.unitName)}`
    }
    // five to the Fahrenheit degree is nine to the Celsius one, that being the larger degree
    assert.equal(write({}), '5.00/\u00a0°F')
    assert.equal(write({ temperatureUnit: 'celsius' }), '9.00/\u00a0°C')
    // and a reading is no more divisible into than it is by: nothing is so many people per 50°F
    assert.equal(shape(forward('/', people, temperature)), 'inconsistent')
})

void test('a difference per something is read in degrees of the reader\'s own scale', () => {
    const perArea = unitToWriteIn(forward('/', forward('-', temperature, temperature), area))
    assert.notEqual(perArea, undefined)
    const write = (settings: object): string => {
        const written = writeQuantity(5, perArea!, settings)
        return `${written.renderedValue}${reifyString(written.unitName)}`
    }
    // five Fahrenheit degrees per square kilometre is two and a bit Celsius degrees, the zero
    // of neither scale being in it
    assert.equal(write({}), '+5.00°F/km^{2}')
    assert.equal(write({ temperatureUnit: 'celsius' }), '+2.78°C/km^{2}')
})
