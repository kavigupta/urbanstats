import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { formatToSignificantFigures } from '../src/utils/text'

void describe('formatToSignificantFigures', () => {
    void test('formats numbers >= 1 correctly with 3 sig figs', () => {
        assert.equal(formatToSignificantFigures(123.456), '123')
        assert.equal(formatToSignificantFigures(12.3456), '12.3')
        assert.equal(formatToSignificantFigures(1.23456), '1.23')
        assert.equal(formatToSignificantFigures(1000.5), '1000')
        assert.equal(formatToSignificantFigures(999.9), '1000')
        assert.equal(formatToSignificantFigures(78.5), '78.5')
        assert.equal(formatToSignificantFigures(78.45), '78.5')
        assert.equal(formatToSignificantFigures(78.456), '78.5')
    })

    void test('formats numbers < 1 correctly with 3 sig figs', () => {
        assert.equal(formatToSignificantFigures(0.123456), '0.123')
        assert.equal(formatToSignificantFigures(0.0123456), '0.0123')
        assert.equal(formatToSignificantFigures(0.00123456), '0.00123')
        assert.equal(formatToSignificantFigures(0.253), '0.253')
        assert.equal(formatToSignificantFigures(0.1234), '0.123')
    })

    void test('handles zero', () => {
        assert.equal(formatToSignificantFigures(0), '0')
        assert.equal(formatToSignificantFigures(-0), '0')
    })

    void test('handles negative numbers', () => {
        assert.equal(formatToSignificantFigures(-123.456), '-123')
        assert.equal(formatToSignificantFigures(-12.3456), '-12.3')
        assert.equal(formatToSignificantFigures(-1.23456), '-1.23')
        assert.equal(formatToSignificantFigures(-0.123456), '-0.123')
        assert.equal(formatToSignificantFigures(-0.0123456), '-0.0123')
    })

    void test('handles edge cases', () => {
        assert.equal(formatToSignificantFigures(81.407), '81.4')
        assert.equal(formatToSignificantFigures(1.0), '1.00')
        assert.equal(formatToSignificantFigures(10.0), '10.0')
        assert.equal(formatToSignificantFigures(100.0), '100')
        assert.equal(formatToSignificantFigures(0.1), '0.100')
        assert.equal(formatToSignificantFigures(0.01), '0.0100')
    })

    void test('handles non-finite numbers', () => {
        assert.equal(formatToSignificantFigures(Infinity), 'Infinity')
        assert.equal(formatToSignificantFigures(-Infinity), '-Infinity')
        assert.equal(formatToSignificantFigures(NaN), 'NaN')
    })

    void test('works with custom sigFigs', () => {
        assert.equal(formatToSignificantFigures(123.456, 2), '120')
        assert.equal(formatToSignificantFigures(123.456, 4), '123.5')
        assert.equal(formatToSignificantFigures(0.123456, 2), '0.12')
        assert.equal(formatToSignificantFigures(0.123456, 4), '0.1235')
        assert.equal(formatToSignificantFigures(1.23456, 1), '1')
        assert.equal(formatToSignificantFigures(1.23456, 5), '1.2346')
    })

    void test('does not use scientific notation', () => {
        const result = formatToSignificantFigures(0.000123456)
        assert.ok(!result.includes('e'))
        assert.ok(!result.includes('E'))
        assert.equal(result, '0.000123')
    })

    void test('formats large numbers correctly with 3 sig figs', () => {
        // Round numbers
        assert.equal(formatToSignificantFigures(1000), '1000')
        assert.equal(formatToSignificantFigures(10000), '10000')
        assert.equal(formatToSignificantFigures(100000), '100000')
        assert.equal(formatToSignificantFigures(1000000), '1000000')
        assert.equal(formatToSignificantFigures(10000000), '10000000')
        assert.equal(formatToSignificantFigures(100000000), '100000000')
        assert.equal(formatToSignificantFigures(1000000000), '1000000000')
        assert.equal(formatToSignificantFigures(10000000000), '10000000000')

        // Numbers that need rounding
        assert.equal(formatToSignificantFigures(1234), '1230')
        assert.equal(formatToSignificantFigures(12345), '12300')
        assert.equal(formatToSignificantFigures(123456), '123000')
        assert.equal(formatToSignificantFigures(1234567), '1230000')
        assert.equal(formatToSignificantFigures(12345678), '12300000')
        assert.equal(formatToSignificantFigures(123456789), '123000000')
        assert.equal(formatToSignificantFigures(1234567890), '1230000000')

        // Numbers near round boundaries
        assert.equal(formatToSignificantFigures(999999), '1000000')
        assert.equal(formatToSignificantFigures(9999999), '10000000')
        assert.equal(formatToSignificantFigures(99999999), '100000000')

        // Large numbers with decimals
        assert.equal(formatToSignificantFigures(1234.56), '1230')
        assert.equal(formatToSignificantFigures(12345.67), '12300')
        assert.equal(formatToSignificantFigures(123456.78), '123000')

        // Negative large numbers
        assert.equal(formatToSignificantFigures(-1234), '-1230')
        assert.equal(formatToSignificantFigures(-123456), '-123000')
        assert.equal(formatToSignificantFigures(-1000000), '-1000000')

        // Very large numbers (billions, trillions)
        assert.equal(formatToSignificantFigures(1e9), '1000000000')
        assert.equal(formatToSignificantFigures(1e10), '10000000000')
        assert.equal(formatToSignificantFigures(1e11), '100000000000')
        assert.equal(formatToSignificantFigures(1e12), '1000000000000')
    })
})
