import { test } from 'uvu'
import * as assert from 'uvu/assert'

import { bitap, toHaystack, toNeedle } from '../src/utils/bitap'

const errors = (testFn: (name: string, testBlock: () => void) => void) => (haystack: string, needle: string, maxErrors: number, result: number): void => {
    testFn(`Number of errors looking for ${needle} in ${haystack} with maxErrors=${maxErrors} is ${result}`, () => {
        const bitapBuffers = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(needle.length + maxErrors + 1))
        assert.is(bitap(toHaystack(haystack), toNeedle(needle), maxErrors, bitapBuffers), result)
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

test.run()
