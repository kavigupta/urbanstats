import './util/localStorage'

import assert from 'assert/strict'
import test from 'node:test'

import { getUnit, renderInequality } from '../src/components/unit-display'
import { reifyString } from '../src/utils/human-readable-name'
import { allUnitTypes, ReaderSettings, unitSuffix, unitTypeToStoredUnit, UnitType, writeQuantity } from '../src/utils/unit'

// Flatten a React element tree into its text content.
function textOf(node: unknown): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    // React element
    return textOf((node as { props?: { children?: unknown } }).props?.children)
}

function renderValue(unitType: UnitType, value: number, settings: ReaderSettings = {}): string {
    const { number, name, attached } = writeQuantity(value, unitTypeToStoredUnit(unitType), settings)
    return `${number}${reifyString(unitSuffix(name, attached))}`
}

// Regression tests for toPrecision(3) emitting scientific notation at tier boundaries.
// Before the fix, values in [999.5eN, 1e(N+3)) rounded to 4 significant digits and
// rendered as e.g. "1.00e+3k" instead of being promoted to the next tier.
for (const [value, expected] of [
    [12345, '12.3k'],
    [999499, '999k'],
    [999500, '1.00m'],
    [999999, '1.00m'],
    [999499999, '999m'],
    [999500000, '1.00B'],
    [999999999, '1.00B'],
] as const) {
    void test(`population renders ${value} as ${expected}`, () => {
        assert.equal(renderValue('population', value), expected)
    })
}

for (const [value, expected] of [
    [12345, '$12.3k'],
    [999499, '$999k'],
    [999500, '$1.00m'],
    [999999, '$1.00m'],
    [999499999, '$999m'],
    [999500000, '$1.00B'],
    [999999999, '$1.00B'],
] as const) {
    void test(`usd renders ${value} as ${expected}`, () => {
        assert.equal(renderValue('usd', value), expected)
    })
}

// Every quantity is displayed in the unit it is stored in, and durations as h:mm
for (const [unitType, value, expected] of [
    ['minutes', 34, '34.0 min'],
    ['minutes', 90, '1:30'],
    ['minutes', 600, '10:00'],
    ['minutes', 1234, '20:34'],
    ['minutes', 5000, '83:20'],
    ['minutes', 1e6, '694 days'],
    ['time', 7.5, '7:30'],
    ['time', 0.5, '30.0 min'],
    // a length is a length: an elevation and a distance are written the same way
    ['distanceInM', 543, '543 m'],
    ['distanceInM', 1234, '1.23 km'],
    ['distanceInM', 12345, '12.3 km'],
    ['distanceInKm', 3.42, '3.42 km'],
    ['distanceInKm', 0.543, '543 m'],
    // a rate is written per whichever number of people leaves a readable number
    ['fatalitiesPerCapita', 1.2e-5, '1.20/100k'],
    ['fatalitiesPerCapita', 0.5, '0.50/person'],
    ['density', 1234, '1\u202f234/km^{2}'],
    ['area', 0.005, '5\u202f000 m^{2}'],
    ['area', 12.5, '12.5 km^{2}'],
    ['usd', 75000, '$75.0k'],
    ['usd', 1234, '$1\u202f234'],
    ['percentage', 0.125, '12.50%'],
    ['percentageChange', 0.125, '+12.50%'],
    ['population', 1234, '1\u202f234'],
    ['density', 5.67, '5.7/km^{2}'],
    ['area', 0.5, '0.500 km^{2}'],
    ['fatalities', 1234, '1\u202f234'],
    ['contaminantLevel', 8.2, '8.20 \u03bcg/m^{3}'],
    ['distancePerYear', 1.2, '120.0 cm/yr'],
    ['number', 1234, '1230'],
] as const) {
    void test(`${unitType} renders ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

for (const [unitType, value, expected] of [
    ['distanceInKm', 3.42, '2.13 mi'],
    ['distanceInM', 543, '1\u202f781 ft'],
    ['distanceInM', 12345, '7.67 mi'],
    ['area', 12.5, '4.83 mi^{2}'],
    ['density', 1234, '3\u202f196/mi^{2}'],
    // an acre is not a power of any length, so an imperial area stays in square miles
    ['area', 0.5, '0.193 mi^{2}'],
    ['distancePerYear', 1.2, '47.2 in/yr'],
] as const) {
    void test(`${unitType} renders ${value} in imperial as ${expected}`, () => {
        assert.equal(renderValue(unitType, value, { useImperial: true }), expected)
    })
}

// Values that have to survive being formatted, whatever the unit
for (const [unitType, value, expected] of [
    ['population', 0, '0'],
    ['population', -1234, '-1\u202f234'],
    ['population', -12345, '-12.3k'],
    ['population', NaN, 'NaN'],
    ['density', 0, '0.00/km^{2}'],
    ['density', -5.67, '-5.7/km^{2}'],
    ['percentage', -0.125, '-12.50%'],
    ['percentageChange', -0.125, '-12.50%'],
    ['usd', -12345, '$-12.3k'],
    ['minutes', 0, '0.000 s'],
    ['number', 0, '0'],
    ['number', Infinity, 'Infinity'],
] as const) {
    void test(`${unitType} renders ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

void test('temperature is written in the reader\'s temperature unit', () => {
    assert.equal(renderValue('temperature', 50, { temperatureUnit: 'celsius' }), '10.0 °C')
    assert.equal(renderValue('temperature', 50, { temperatureUnit: 'fahrenheit' }), '50.0 °F')
})

// Every unit type has to be renderable, or a statistic displays as undefined
void test('every unit type renders', () => {
    for (const unitType of allUnitTypes) {
        for (const value of [0, 0.005, 1, 1234, 1e9]) {
            const rendered = renderValue(unitType, value)
            assert.ok(!rendered.includes('undefined'), `${unitType} rendered ${value} as ${rendered}`)
            assert.ok(!rendered.includes('NaN'), `${unitType} rendered ${value} as ${rendered}`)
        }
        assert.notEqual(textOf(getUnit(unitType)), '', `${unitType} has no documented unit name`)
    }
})

// The inequalities on a colorbar point the other way for margins, which display as absolute values
for (const [unitType, value, inequality, expected] of [
    ['percentage', 0.5, 'leq', '\u2264'],
    ['percentage', 0.5, 'geq', '\u2265'],
    ['democraticMargin', 0.5, 'leq', '\u2264'],
    ['democraticMargin', -0.5, 'leq', '\u2265'],
    ['democraticMargin', -0.5, 'geq', '\u2264'],
    ['leftMargin', -0.5, 'geq', '\u2264'],
] as const) {
    void test(`${unitType} renders a ${inequality} at ${value} as ${expected}`, () => {
        assert.equal(renderInequality(value, unitTypeToStoredUnit(unitType), inequality), expected)
    })
}

// The quantities written in a party's color say which party, and are blank when missing
/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
for (const [unitType, value, expected, hue] of [
    ['democraticMargin', 0.123, 'D+12.3%', 'blue'],
    ['democraticMargin', -0.081, 'R+8.10%', 'red'],
    ['democraticMargin', 0.0005, 'D+0.0500%', 'blue'],
    ['democraticMargin', NaN, 'N/A%', undefined],
    ['leftMargin', 0.123, 'L+12.3%', 'red'],
    ['leftMargin', -0.123, 'R+12.3%', 'blue'],
    ['partyPctOrange', 0.125, '12.50%', 'orange'],
    ['partyChangeTeal', 0.125, '+12.50%', 'cyan'],
    ['partyChangeTeal', -0.125, '-12.50%', 'cyan'],
] as const) {
    void test(`${unitType} writes ${value} as ${expected} in ${hue ?? 'no color'}`, () => {
        const written = writeQuantity(value, unitTypeToStoredUnit(unitType))
        assert.equal(`${written.number}${reifyString(unitSuffix(written.name, written.attached))}`, expected)
        assert.equal(written.hue, hue)
    })
}
/* eslint-enable no-restricted-syntax */
