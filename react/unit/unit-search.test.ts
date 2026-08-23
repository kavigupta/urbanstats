import assert from 'assert/strict'
import test from 'node:test'

import { reifyString } from '../src/utils/human-readable-name'
import { BaseUnit, Dimension, NamedUnit, nameOf } from '../src/utils/quantity'
import { NumberFormat } from '../src/utils/text'
import { chooseUnits } from '../src/utils/unit-search'

function unit(name: string, dimensions: Partial<Record<BaseUnit, number>>, size: number, cost = 0): NamedUnit {
    const entries = Object.entries(dimensions) as [BaseUnit, number][]
    return { name, dimensions: entries.map(([baseUnit, power]) => ({ baseUnit, power })), size, cost, abbreviation: false }
}

const people = unit('', { person: 1 }, 1)
const thousands = { ...unit('k', { person: 1 }, 1e3, 1), abbreviation: true }
const millions = { ...unit('m', { person: 1 }, 1e6, 1), abbreviation: true }
const counting: NamedUnit[] = [people, thousands, millions]

const dimensionsOf = (dimensions: Partial<Record<BaseUnit, number>>): Dimension[] =>
    (Object.entries(dimensions) as [BaseUnit, number][]).map(([baseUnit, power]) => ({ baseUnit, power }))

const wholeNumbers: NumberFormat = { kind: 'fixed', places: 0 }
const threeFigures: NumberFormat = { kind: 'significantFigures' }
/** What the site does: an abbreviated number is worth three figures, a counted one is whole. */
const countingStyle = (written: { unit: NamedUnit }[]): NumberFormat =>
    written.some(({ unit: each }) => each.abbreviation) ? threeFigures : wholeNumbers

/** The units chosen, as they would be written: a name, and the power it is raised to. */
function chosen(inBaseUnits: number, dimensions: Partial<Record<BaseUnit, number>>, pool: NamedUnit[], styleFor = countingStyle): string {
    const { written } = chooseUnits(inBaseUnits, dimensionsOf(dimensions), pool, styleFor)
    return written.map(({ unit: chosenUnit, power }) => `${chosenUnit.name === '' ? '<none>' : chosenUnit.name}^${power}`).join(' ')
}

// A unit is worth reaching for once the number it leaves behind is shorter by more than it costs
for (const [value, expected] of [
    [999, '<none>^1'],
    [9999, '<none>^1'],
    // five digits cost two, against three figures and the cost of the abbreviation
    [10000, 'k^1'],
    [12345, 'k^1'],
    [999499, 'k^1'],
    // counted from the number as printed: 999.5k prints as 1 000k, which is four digits
    [999500, 'm^1'],
    [1e9, 'm^1'],
] as const) {
    void test(`a count of ${value} is written in ${expected}`, () => {
        assert.equal(chosen(value, { person: 1 }, counting), expected)
    })
}

void test('a unit covers a dimension by being raised to its power', () => {
    // a thousand people squared is a million of them, which is where the digits are saved
    assert.equal(chosen(1e6, { person: 2 }, counting), 'k^2')
})

void test('a unit raised to a power costs what it costs each time it is used', () => {
    const pricey = [people, { ...unit('K', { person: 1 }, 1e3, 3), abbreviation: true }]
    // three per use is six over two uses, more than the four digits it saves
    assert.equal(chosen(1e6, { person: 2 }, pricey), '<none>^2')
})

void test('a unit of its own for the whole dimension competes with a power of a smaller one', () => {
    const pair = unit('pairs', { person: 2 }, 1e6, 0.5)
    // the same number either way, so the one that costs less to reach for wins
    assert.equal(chosen(1e6, { person: 2 }, [...counting, pair]), 'pairs^1')
})

void test('a unit can be used at a negative power, for what a quantity is written per', () => {
    const deaths = unit('', { fatality: 1 }, 1)
    const hundredThousand = unit('100k', { person: 1 }, 1e5, 0.5)
    // a death per hundred thousand people reads as 1.00 that way, and as 0.0000100 per person
    assert.equal(chosen(1e-5, { fatality: 1, person: -1 }, [deaths, people, hundredThousand], () => threeFigures), '<none>^1 100k^-1')
})

void test('a unit that rounds the quantity away is not worth choosing', () => {
    const threeDigits: NumberFormat = { kind: 'rounded', significantDigits: 3 }
    // one person per hundred thousand reads as 0.000 in people, and as 1.00 in hundreds of thousands
    const hundredThousand = unit('100k', { person: 1 }, 1e5, 0.5)
    assert.equal(chosen(1e-5, { person: -1 }, [people, hundredThousand], () => threeDigits), '100k^-1')
})

const threeFiguresRounded: NumberFormat = { kind: 'rounded', significantDigits: 3 }
const kilometer = unit('km', { m: 1 }, 1e3, 1)
const meter = unit('m', { m: 1 }, 1)

void test('a unit that leaves the figures behind is not reached for', () => {
    // a thousand people per square kilometre is a thousandth of one per square metre, which is as
    // many digits and one figure: written that way, a thousand and a thousand and a half are one
    assert.equal(chosen(1e-3, { person: 1, m: -2 }, [people, kilometer, meter], () => threeFiguresRounded), 'km^-2 <none>^1')
    // where a length small enough to leave three of them behind is
    assert.equal(chosen(1e-3, { m: 1 }, [kilometer, meter, unit('cm', { m: 1 }, 0.01, 1)], () => threeFiguresRounded), 'cm^1')
})

void test('a fixed number of places is a decision that rounding away is precise enough', () => {
    // a fraction of a person is no people, which is what whole numbers of them means
    assert.equal(chosen(0.123, { person: 1 }, counting), '<none>^1')
})

// The name the chosen units are written under, which is what goes in the unit column
for (const [written, expected] of [
    [[{ unit: people, power: 1 }], ''],
    [[{ unit: thousands, power: 1 }], 'k'],
    // a unit raised to a power says so, and one below the line goes under a solidus
    [[{ unit: unit('km', { person: 1 }, 1e3), power: 2 }], 'km^{2}'],
    [[{ unit: people, power: 1 }, { unit: unit('km', { person: 1 }, 1e3), power: -2 }], '/ km^{2}'],
    [[{ unit: unit('g', { fatality: 1 }, 1), power: 1 }, { unit: unit('km', { person: 1 }, 1e3), power: -2 }], 'g/km^{2}'],
    [[{ unit: unit('g', { fatality: 1 }, 1), power: 1 }, { unit: unit('k', { person: 1 }, 1e3), power: 1 }], 'g·k'],
] as const) {
    void test(`${expected === '' ? 'an unnamed unit' : expected} is the name of its units`, () => {
        assert.equal(reifyString(nameOf([...written])), expected)
    })
}
