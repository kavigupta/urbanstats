import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { parseNoError, unparse } from '../src/urban-stats-script/parser'

void describe('unparse vector', () => {
    void test('without wrapping', () => {
        assert.equal(unparse(parseNoError('[1, 2, 3]', '')), '[1, 2, 3]')
    })
    void test('with wrapping', () => {
        const expected = `[
    "The quick brown fox jumped over the lazy dog!",
    "The quick brown fox jumped over the lazy dog!",
    "The quick brown fox jumped over the lazy dog!"
]`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('start wrapping from top level', () => {
        const expected = `[
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
]`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('some need to be wrapped', () => {
        const expected = `[
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    [
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50
    ]
]`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })
})
