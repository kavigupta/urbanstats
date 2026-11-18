import assert from 'assert/strict'
import { test } from 'node:test'

import { bitap, toHaystack, toNeedle, toSignature } from '../src/utils/bitap'

const errors = (testFn: (name: string, testBlock: () => void) => void) => (haystack: string, needle: string, maxErrors: number, result: number): void => {
    testFn(`Number of errors looking for ${needle} in ${haystack} with maxErrors=${maxErrors} is ${result}`, () => {
        assert.equal(bitap(toHaystack(haystack), toNeedle(needle), maxErrors), result)
    })
}

errors(test)('abcd', 'abcd', 1, 0)
errors(test)('abcd', 'acd', 1, 1)
errors(test)('abcd', 'bcd', 1, 1)
errors(test)('abcd', 'zabcd', 1, 1)
errors(test)('dallas', 'dalas', 2, 1)
errors(test)('abcd', 'abcde', 2, 1)
errors(test)('abcde', 'abcd', 2, 0)
errors(test)('china', 'india', 2, 2)
errors(test)('aple', 'apple', 2, 1)

void test('every letter gets its own signature bit', () => {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i))
    assert.equal(new Set(letters.map(toSignature)).size, letters.length)
})
