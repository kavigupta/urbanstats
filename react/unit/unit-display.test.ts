import './util/localStorage'

import assert from 'assert/strict'
import test from 'node:test'

import { getUnit, getUnitDisplay } from '../src/components/unit-display'
import { reifyString } from '../src/utils/human-readable-name'
import { allUnitTypes, displayQuantity, displayUnitFor, unitTypeToUnit, UnitType } from '../src/utils/unit'

// Flatten a React element tree into its text content.
function textOf(node: unknown): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    // React element
    return textOf((node as { props?: { children?: unknown } }).props?.children)
}

function renderValue(unitType: UnitType, value: number, useImperial = false): string {
    const { value: valueEl, unit: unitEl } = getUnitDisplay(unitType).renderValue(value, useImperial)
    const { attached } = displayUnitFor(value, unitTypeToUnit(unitType), useImperial)
    const unit = textOf(unitEl)
    return `${textOf(valueEl)}${attached ? '' : ' '}${unit}`.trim()
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
    ['minutes', 34, '34'],
    ['minutes', 90, '1:30'],
    ['minutes', 600, '10:00'],
    ['minutes', 1234, '20:34'],
    ['minutes', 5000, '83:20'],
    ['time', 7.5, '7:30'],
    ['time', 0.5, '30'],
    ['distanceInM', 543, '543 m'],
    ['distanceInM', 1234, '1\u202f234 m'],
    ['distanceInKm', 3.42, '3.42 km'],
    ['density', 1234, '1\u202f234/\u00a0km2'],
    ['area', 0.005, '5\u202f000 m2'],
    ['area', 12.5, '12.5 km2'],
    ['usd', 75000, '$75.0k'],
    ['percentage', 0.125, '12.50%'],
    ['percentageChange', 0.125, '+12.50%'],
    ['population', 1234, '1\u202f234'],
    ['density', 5.67, '5.7/\u00a0km2'],
    ['area', 0.5, '0.500 km2'],
    ['fatalities', 1234, '1\u202f234'],
    ['fatalitiesPerCapita', 1.2e-5, '1.20/100k'],
    ['contaminantLevel', 8.2, '8.20 \u03bcg/m3'],
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
    ['area', 12.5, '4.83 mi2'],
    ['density', 1234, '3\u202f196/\u00a0mi2'],
    ['area', 0.5, '124 acres'],
    ['distancePerYear', 1.2, '47.2 in/yr'],
] as const) {
    void test(`${unitType} renders ${value} in imperial as ${expected}`, () => {
        assert.equal(renderValue(unitType, value, true), expected)
    })
}

// Values that have to survive being formatted, whatever the unit
for (const [unitType, value, expected] of [
    ['population', 0, '0'],
    ['population', -1234, '-1\u202f234'],
    ['population', -12345, '-12.3k'],
    ['population', NaN, 'NaN'],
    ['density', 0, '0.00/\u00a0km2'],
    ['density', -5.67, '-5.7/\u00a0km2'],
    ['percentage', -0.125, '-12.50%'],
    ['percentageChange', -0.125, '-12.50%'],
    ['usd', -12345, '$-12.3k'],
    ['minutes', 0, '0'],
    ['number', 0, '0'],
    ['number', Infinity, 'Infinity'],
] as const) {
    void test(`${unitType} renders ${value} as ${expected}`, () => {
        assert.equal(renderValue(unitType, value), expected)
    })
}

void test('temperature is rendered in the reader\'s temperature unit', () => {
    const { value, unit } = getUnitDisplay('temperature').renderValue(50, false, 'celsius')
    assert.equal(`${textOf(value)} ${textOf(unit)}`, '10.0 °C')
    const fahrenheit = getUnitDisplay('temperature').renderValue(50, false, 'fahrenheit')
    assert.equal(`${textOf(fahrenheit.value)} ${textOf(fahrenheit.unit)}`, '50.0 °F')
})

// Anything without a unit type of its own is displayed in base units
void test('a quantity with no display units is displayed in base units', () => {
    const personSquareMeters = { dimensions: { person: 1, length: 2 }, multiplier: 1e6 }
    const { value, unit } = displayQuantity(1234, personSquareMeters, false)
    assert.equal(value, '1\u202f230\u202f000\u202f000')
    assert.equal(reifyString(unit), 'm^{2}·person')
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
        assert.equal(getUnitDisplay(unitType).renderInequality(value, inequality), expected)
    })
}
