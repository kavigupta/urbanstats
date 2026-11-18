import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { hre } from '../src/utils/human-readable-template'

void describe('hre', () => {
    void test('parses subscript and superscript in template literal text', () => {
        assert.deepEqual(
            hre`log_{10}(Density)^{2}`,
            [
                { type: 'atom', value: 'log' },
                { type: 'subscript', value: [{ type: 'atom', value: '10' }] },
                { type: 'atom', value: '(Density)' },
                { type: 'superscript', value: [{ type: 'atom', value: '2' }] },
            ],
        )
    })

    void test('parses backtick-delimited code spans verbatim, without parsing their contents', () => {
        assert.deepEqual(
            hre`e.g. \`label="log_{10}(Density)^{2}"\``,
            [
                { type: 'atom', value: 'e.g. ' },
                { type: 'code', value: 'label="log_{10}(Density)^{2}"' },
            ],
        )
    })

    void test('splices in interpolated elements after code spans', () => {
        assert.deepEqual(
            hre`Label, e.g. \`label="log_{10}(Density)^{2}"\`, is ${[{ type: 'subscript', value: [{ type: 'atom', value: 'important' }] }]}`,
            [
                { type: 'atom', value: 'Label, e.g. ' },
                { type: 'code', value: 'label="log_{10}(Density)^{2}"' },
                { type: 'atom', value: ', is ' },
                { type: 'subscript', value: [{ type: 'atom', value: 'important' }] },
            ],
        )
    })
})
