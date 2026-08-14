import './util/localStorage'

// the theme setting asks the browser what it prefers
;(global as unknown as { window: unknown }).window = { matchMedia: () => ({ matches: false }) }

import assert from 'assert/strict'
import test from 'node:test'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { getUnitDisplay } from '../src/components/unit-display'
import { UnitType } from '../src/utils/unit'

// Flatten a React element tree into its text content.
function textOf(node: unknown): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(textOf).join('')
    // React element
    return textOf((node as { props?: { children?: unknown } }).props?.children)
}

function renderValue(unitType: UnitType, value: number): string {
    const { value: valueEl, unit: unitEl } = getUnitDisplay(unitType).renderValue(value)
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

// The quantities that belong to a party are written in its color, and say which party it is
function renderMarkup(unitType: UnitType, value: number): string {
    const { value: valueEl } = getUnitDisplay(unitType).renderValue(value)
    return renderToStaticMarkup(React.createElement(React.Fragment, null, valueEl))
}

for (const [unitType, value, expected] of [
    ['democraticMargin', 0.123, '<span style="color:#5a7dc3;display:flex;justify-content:flex-end">D+12.3</span>'],
    ['democraticMargin', -0.081, '<span style="color:#f96d6d;display:flex;justify-content:flex-end">R+8.10</span>'],
    ['democraticMargin', 0.0005, '<span style="color:#5a7dc3;display:flex;justify-content:flex-end">D+0.0500</span>'],
    ['democraticMargin', NaN, '<span>N/A</span>'],
    ['leftMargin', 0.123, '<span style="color:#f96d6d;display:flex;justify-content:flex-end">L+12.3</span>'],
    ['leftMargin', -0.123, '<span style="color:#5a7dc3;display:flex;justify-content:flex-end">R+12.3</span>'],
    ['partyPctOrange', 0.125, '<span style="color:#f7aa41;display:flex;justify-content:flex-end">12.50</span>'],
    ['partyChangeTeal', 0.125, '<span style="color:#07a5af;display:flex;justify-content:flex-end">+12.50</span>'],
    ['partyChangeTeal', -0.125, '<span style="color:#07a5af;display:flex;justify-content:flex-end">-12.50</span>'],
] as const) {
    void test(`${unitType} renders ${value} in its party's color`, () => {
        assert.equal(renderMarkup(unitType, value), expected)
    })
}

// The inequalities on a colorbar point the other way for a lead, which is written as a size
for (const [unitType, value, inequality, expected] of [
    ['percentage', 0.5, 'leq', '\u2264'],
    ['democraticMargin', 0.5, 'leq', '\u2264'],
    ['democraticMargin', -0.5, 'leq', '\u2265'],
    ['leftMargin', -0.5, 'geq', '\u2264'],
] as const) {
    void test(`${unitType} renders a ${inequality} at ${value} as ${expected}`, () => {
        assert.equal(getUnitDisplay(unitType).renderInequality(value, inequality), expected)
    })
}
