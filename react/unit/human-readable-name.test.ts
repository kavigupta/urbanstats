import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { reifyString, writtenPlainly } from '../src/utils/human-readable-name'
import { parseHumanReadableTemplate } from '../src/utils/human-readable-template'
import { storedUnits } from '../src/utils/unit'

void describe('reifyString', () => {
    void test('renders code elements wrapped in backticks', () => {
        assert.equal(
            reifyString([
                { type: 'atom', value: 'e.g. ' },
                { type: 'code', value: 'label="log_{10}(Density)^{2}"' },
            ], { unicode: false }),
            'e.g. `label="log_{10}(Density)^{2}"`',
        )
    })

    void test('leaves subscript/superscript content nested inside code untouched', () => {
        assert.equal(
            reifyString([{ type: 'code', value: 'x_{1}^{2}' }], { unicode: false }),
            '`x_{1}^{2}`',
        )
    })

    void test('a quantity is written in the units it is read in', () => {
        const eighty = [{ type: 'atom' as const, value: 'above ' }, { type: 'quantity' as const, value: 80, unit: storedUnits.temperature }]
        assert.equal(reifyString(eighty, { unicode: false }), 'above 80°F')
        assert.equal(reifyString(eighty, { temperatureUnit: 'celsius', unicode: false }), 'above 26.7°C')
        assert.equal(writtenPlainly(100, storedUnits.area, { useImperial: true, unicode: true }), '38.6mi²')
        // and the trailing zeros a unit's own style writes are not what a caption wants
        assert.equal(writtenPlainly(1e6, storedUnits.population, { unicode: true }), '1m')
    })
})

void describe('reifyString with unicode', () => {
    void test('writes scripts in Unicode where it has them, and the syntax otherwise', () => {
        assert.equal(
            reifyString(parseHumanReadableTemplate('log_{10}(Density)^{2}, sin^{-1}, x_{max}, 10^{0.5}'), { unicode: true }),
            'log₁₀(Density)², sin⁻¹, x_{max}, 10^{0.5}',
        )
    })
})
