import assert from 'assert/strict'
import { test } from 'node:test'

import { bitapAlphabet } from '../src/utils/bitap'
import { bitap } from '../src/utils/bitap-selector'

const errors = (testFn: (name: string, testBlock: () => void) => void) => (haystack: string, needle: string, maxErrors: number, result: number): void => {
    testFn(`Number of errors looking for ${needle} in ${haystack} with maxErrors=${maxErrors} is ${result}`, () => {
        const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(needle.length + haystack.length + 1))
        assert.deepEqual(bitap(haystack, { alphabet: bitapAlphabet(needle), length: needle.length }, maxErrors, bitapBuffers), result)
    })
}

errors(test)('abcd', 'abcd', 1, 0)
errors(test)('abcd', 'abc', 1, 0)
errors(test)('abcd', 'bcd', 1, 0)
errors(test)('abcd', 'azcd', 1, 1) // replacement
errors(test)('abcd', 'acd', 1, 1) // insertion
errors(test)('acd', 'abcd', 1, 1) // deletion
errors(test)('true', 'str', 1, 1)
errors(test)('abc', 'def', 1, 2)
errors(test)('def', 'ab def', 31, 3)
errors(test)('Population Change (2010-2020)', 'PW Density (r=1km)', 31, 14)
