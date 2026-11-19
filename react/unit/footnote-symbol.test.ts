import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { footnoteSymbol } from '../src/components/footnote-symbol'

void describe('footnoteSymbol', () => {
    void test('returns single symbols for indices 0–2', () => {
        assert.equal(footnoteSymbol(0), '*')
        assert.equal(footnoteSymbol(1), '†')
        assert.equal(footnoteSymbol(2), '‡')
    })

    void test('returns base-3 combinations for index >= 3 (at least two chars)', () => {
        assert.equal(footnoteSymbol(3), '**')
        assert.equal(footnoteSymbol(4), '*†')
        assert.equal(footnoteSymbol(5), '*‡')
        assert.equal(footnoteSymbol(6), '†*')
        assert.equal(footnoteSymbol(7), '††')
        assert.equal(footnoteSymbol(8), '†‡')
        assert.equal(footnoteSymbol(9), '‡*')
        assert.equal(footnoteSymbol(10), '‡†')
        assert.equal(footnoteSymbol(11), '‡‡')
    })

    void test('continues with three-char combinations after 11', () => {
        assert.equal(footnoteSymbol(12), '***')
        assert.equal(footnoteSymbol(13), '**†')
        assert.equal(footnoteSymbol(14), '**‡')
        assert.equal(footnoteSymbol(15), '*†*')
        assert.equal(footnoteSymbol(16), '*††')
        assert.equal(footnoteSymbol(17), '*†‡')
        assert.equal(footnoteSymbol(18), '*‡*')
        assert.equal(footnoteSymbol(19), '*‡†')
        assert.equal(footnoteSymbol(20), '*‡‡')
        assert.equal(footnoteSymbol(21), '†**')
        assert.equal(footnoteSymbol(22), '†*†')
    })

    void test('all unique 1-10000', () => {
        const symbols = new Set<string>()
        for (let i = 0; i < 10000; i++) {
            symbols.add(footnoteSymbol(i))
        }
        assert.equal(symbols.size, 10000)
    })
})
