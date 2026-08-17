import './util/localStorage'

import assert from 'assert/strict'
import test from 'node:test'

import { getUnitDisplay, renderInequality } from '../src/components/unit-display'
import { writeQuantity } from '../src/utils/quantity'
import { storedUnits, UnitType } from '../src/utils/unit'

// Flatten a React element tree into its text content.
function textOf(node: unknown): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    // React element
    return textOf((node as { props?: { children?: unknown } }).props?.children)
}

function renderValue(unitType: UnitType, value: number, useImperial = false, temperatureUnit = 'fahrenheit'): string {
    const { value: valueEl, unit: unitEl } = getUnitDisplay(unitType).renderValue(value, useImperial, temperatureUnit)
    return `${textOf(valueEl)}${textOf(unitEl)}`.trim()
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

// Every number's digits are separated, whatever it is measured in
for (const [unitType, value, expected] of [
    ['population', 1234, '1\u202f234'],
    ['fatalities', 1234, '1\u202f234'],
    ['density', 1234, '1\u202f234/\u00a0km2'],
    ['distanceInM', 1234, '1\u202f234m'],
    ['area', 1234, '1\u202f234km2'],
    ['distanceInKm', 1234, '1\u202f234.00km'],
    ['contaminantLevel', 1234, '1\u202f234.00μg/m3'],
    ['percentage', 12.34, '1\u202f234.00%'],
    ['fatalitiesPerCapita', 0.01234, '1\u202f234.00/\u00a0100k'],
    ['distancePerYear', 12.34, '1\u202f234.0cm/yr'],
    ['number', 1234, '1\u202f230'],
    ['temperature', 1234, '1\u202f234.0°F'],
] as const) {
    void test(`${unitType} separates the digits of ${value}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

// A number below one keeps its digits together, and a sign stays where it is
for (const [value, expected] of [
    [0.123456, '0.123'],
    [-476, '-476'],
    [-1234, '-1\u202f230'],
] as const) {
    void test(`number renders ${value} as ${expected}`, () => {
        assert.equal(renderValue('number', value), expected)
    })
}

// A solidus with nothing in front of it is set with a space, as a bare per reads better that way
for (const [unitType, value, expected] of [
    ['density', 5.67, '5.7/\u00a0km2'],
    ['fatalitiesPerCapita', 1.2e-5, '1.20/\u00a0100k'],
    ['contaminantLevel', 8.2, '8.20μg/m3'],
    ['distancePerYear', 1.2, '120.0cm/yr'],
] as const) {
    void test(`${unitType} writes ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

// Money and people are counted in thousands at the same point
for (const [unitType, value, expected] of [
    ['usd', 1234, '$1\u202f234'],
    ['usd', 9999, '$9\u202f999'],
    ['usd', 12345, '$12.3k'],
    ['population', 1234, '1\u202f234'],
    ['population', 12345, '12.3k'],
] as const) {
    void test(`${unitType} renders ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

// A duration reads as hours and minutes, rounded to the minute, wherever it arrived from
for (const [unitType, value, expected] of [
    ['minutes', 34, '34min'],
    ['minutes', 90, '1:30h'],
    ['minutes', 99.5, '1:40h'],
    ['minutes', -90, '-1:30h'],
    ['time', 7.5, '7:30h'],
    ['time', 0.5, '30min'],
] as const) {
    void test(`${unitType} renders ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

// A quantity we do not have reads the same way whatever it would have been measured in
for (const unitType of ['population', 'usd', 'density', 'area', 'time', 'minutes', 'temperature', 'number', 'fatalities',
    'democraticMargin', 'leftMargin', 'partyPctBlue', 'partyChangeRed'] as const) {
    void test(`${unitType} renders a missing value as N/A, with no unit`, () => {
        assert.equal(renderValue(unitType, NaN), 'N/A')
    })
}

// How large a number is, rather than which side of zero it falls, decides the unit it is
// written in and the places it is written to
for (const [unitType, value, expected] of [
    ['area', -1234, '-1\u202f234km2'],
    ['area', -0.5, '-0.500km2'],
    ['area', -0.005, '-5\u202f000m2'],
    ['density', -1234, '-1\u202f234/\u00a0km2'],
    ['usd', -12345, '$-12.3k'],
] as const) {
    void test(`${unitType} renders ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

// The places a number is written to, where that depends on how large it is
for (const [unitType, value, expected] of [
    ['density', 1234, '1\u202f234/\u00a0km2'],
    ['density', 12.3, '12/\u00a0km2'],
    ['density', 5.67, '5.7/\u00a0km2'],
    ['density', 0.5, '0.50/\u00a0km2'],
    ['density', 0, '0.00/\u00a0km2'],
    ['area', 1234, '1\u202f234km2'],
    ['area', 12.34, '12.3km2'],
    ['area', 0.5, '0.500km2'],
] as const) {
    void test(`${unitType} writes ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

// The inequalities on a colorbar point the other way for a lead, which is written as a size
for (const [unitType, value, inequality, expected] of [
    ['percentage', 0.5, 'leq', '\u2264'],
    ['percentage', 0.5, 'geq', '\u2265'],
    ['democraticMargin', 0.5, 'leq', '\u2264'],
    ['democraticMargin', -0.5, 'leq', '\u2265'],
    ['democraticMargin', -0.5, 'geq', '\u2264'],
    ['leftMargin', -0.5, 'geq', '\u2264'],
] as const) {
    void test(`${unitType} renders a ${inequality} at ${value} as ${expected}`, () => {
        assert.equal(renderInequality(value, unitType, inequality), expected)
    })
}

// A quantity written in a party's color says which party it belongs to, and in which hue
/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
for (const [unitType, value, expected, hue] of [
    ['democraticMargin', 0.123, 'D+12.3', 'blue'],
    ['democraticMargin', -0.081, 'R+8.10', 'red'],
    // a lead is given more digits the closer it is
    ['democraticMargin', 0.0005, 'D+0.0500', 'blue'],
    ['leftMargin', 0.123, 'L+12.3', 'red'],
    ['leftMargin', -0.123, 'R+12.3', 'blue'],
    ['partyPctOrange', 0.125, '12.50', 'orange'],
    ['partyChangeTeal', 0.125, '+12.50', 'cyan'],
    ['partyChangeTeal', -0.125, '-12.50', 'cyan'],
] as const) {
    void test(`${unitType} writes ${value} as ${expected} in ${hue}`, () => {
        const written = writeQuantity(value, storedUnits[unitType])
        assert.equal(written.renderedValue, expected)
        assert.equal(written.hue, hue)
    })
}
/* eslint-enable no-restricted-syntax */

// A quantity we do not have belongs to no party, and is measured in nothing
for (const unitType of ['democraticMargin', 'partyPctOrange', 'percentage', 'temperature'] as const) {
    void test(`${unitType} writes a missing value plainly`, () => {
        assert.deepEqual(writeQuantity(NaN, storedUnits[unitType]), { renderedValue: 'N/A', unitName: [] })
    })
}

void test('temperature is written in the reader\'s own unit', () => {
    assert.equal(renderValue('temperature', 50), '50.0°F')
    assert.equal(renderValue('temperature', 50, false, 'celsius'), '10.0°C')
})
