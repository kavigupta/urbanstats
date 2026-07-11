import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { reifyString } from '../src/urban-stats-script/derive-human-readable-name'

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
