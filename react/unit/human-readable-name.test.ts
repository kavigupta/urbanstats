import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { reifyString, writtenPlainly } from '../src/utils/human-readable-name'
import { storedUnits } from '../src/utils/unit'

void describe('reifyString', () => {
    void test('renders code elements wrapped in backticks', () => {
        assert.equal(
            reifyString([
                { type: 'atom', value: 'e.g. ' },
                { type: 'code', value: 'label="log_{10}(Density)^{2}"' },
            ]),
            'e.g. `label="log_{10}(Density)^{2}"`',
        )
    })

    void test('leaves subscript/superscript content nested inside code untouched', () => {
        assert.equal(
            reifyString([{ type: 'code', value: 'x_{1}^{2}' }]),
            '`x_{1}^{2}`',
        )
    })
})

void test('a quantity is written in the units of whoever is reading it', () => {
    const eighty = { type: 'quantity' as const, value: 80, unit: storedUnits.temperature }
    // where nobody is asked, a title or a card takes the units the site is written in
    assert.equal(reifyString([{ type: 'atom', value: 'above ' }, eighty]), 'above 80°F')
    assert.equal(writtenPlainly(80, storedUnits.temperature, { temperatureUnit: 'celsius' }), '26.7°C')
    assert.equal(writtenPlainly(100, storedUnits.area, { useImperial: true }), '38.6mi^{2}')
    // and the trailing zeros a unit's own style writes are not what a caption wants
    assert.equal(writtenPlainly(1e6, storedUnits.population), '1m')
})
