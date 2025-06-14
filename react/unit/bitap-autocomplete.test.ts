import assert from 'assert/strict'
import { test } from 'node:test'

import { bitapAlphabet } from '../src/utils/bitap'
import { bitap } from '../src/utils/bitap-autocomplete'

const errors = (testFn: (name: string, testBlock: () => void) => void) => (haystack: string, needle: string, maxErrors: number, result: undefined | { location: number, numErrors: number }): void => {
    testFn(`Number of errors looking for ${needle} in ${haystack} with maxErrors=${maxErrors} is ${result}`, () => {
        const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(needle.length + haystack.length + 1))
        assert.deepEqual(bitap(haystack, { alphabet: bitapAlphabet(needle), length: needle.length }, maxErrors, bitapBuffers), result)
    })
}

errors(test)('abcd', 'abcd', 1, { location: 0, numErrors: 0 })
errors(test)('abcd', 'abc', 1, { location: 0, numErrors: 0 })
errors(test)('abcd', 'bcd', 1, { location: 1, numErrors: 0 })
errors(test)('abcd', 'azcd', 1, undefined)
errors(test)('abcd', 'acd', 1, { location: 0, numErrors: 1 })
errors(test)('true', 'str', 1, undefined)
