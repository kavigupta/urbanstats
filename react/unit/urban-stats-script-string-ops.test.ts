import assert from 'assert/strict'
import { test } from 'node:test'

import { evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { USSType, undocValue } from '../src/urban-stats-script/types-values'

import { boolType, emptyContext, parseExpr, stringType } from './urban-stats-script-utils'

const boolVectorType = { type: 'vector', elementType: boolType } satisfies USSType

function evaluateExpr(input: string): ReturnType<typeof evaluate> {
    return evaluate(parseExpr(input), emptyContext())
}

function expectError(input: string, message: string): void {
    assert.throws(
        () => evaluateExpr(input),
        (e: unknown) => {
            assert.ok(e instanceof InterpretationError)
            assert.equal(e.message, message)
            return true
        },
    )
}

void test('the predicates test a prefix, a suffix, and anywhere', (): void => {
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego, CA", "San ")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego, CA", "Diego")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('endsWith("San Diego, CA", ", CA")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('endsWith("San Diego, CA", ", NV")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("San Diego, CA", "Diego")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("San Diego, CA", "Reno")'), undocValue(false, boolType))
})

void test('comparisons normalize both sides, and normalize=false compares as written', (): void => {
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego", "san")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego", "san", normalize=false)'), undocValue(false, boolType))
    // punctuation and accents fold away too
    assert.deepStrictEqual(evaluateExpr('endsWith("Saint-Denis, \\u00CEle-de-France", "ile de france")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("Washington, DC", "washington dc")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("Washington, DC", "washington dc", normalize=false)'), undocValue(false, boolType))
})

void test('a match never begins or ends part-way through a grapheme', (): void => {
    // a decomposed e-acute is one grapheme, so nothing matches half of it
    assert.deepStrictEqual(evaluateExpr('endsWith("cafe\\u0301", "e", normalize=false)'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("cafe\\u0301", "e", normalize=false)'), undocValue(false, boolType))
    // a family emoji is one grapheme made of seven code points
    const family = 'a\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67b'
    assert.deepStrictEqual(evaluateExpr(`includes("${family}", "\\uD83D\\uDC68")`), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr(`includes("${family}", "\\uD83D\\uDC68\\u200D\\uD83D\\uDC69\\u200D\\uD83D\\uDC67")`), undocValue(true, boolType))
})

void test('fuzzyMatch tolerates a few edits, up to maxErrors', (): void => {
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("Pittsburgh, PA", "pittsburg")'), undocValue(true, boolType))
    // a dropped t is one edit, which maxErrors=0 does not allow
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("Pittsburgh, PA", "pitsburg")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("Pittsburgh, PA", "pitsburg", maxErrors=0)'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("Pittsburgh, PA", "philadelphia")'), undocValue(false, boolType))
    // it normalizes like the other predicates, so an exact spelling needs no errors at all
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("San Jos\u00E9", "san jose", maxErrors=0)'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("San Jos\u00E9", "san jose", maxErrors=0, normalize=false)'), undocValue(false, boolType))
})

void test('fuzzyMatch rejects a needle longer than bitap can hold', (): void => {
    expectError(
        'fuzzyMatch("abc", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")',
        'fuzzyMatch can look for at most 31 characters, but was given 34 at 1:1-55',
    )
})

void test('fuzzyMatch clamps maxErrors to the needle, rather than working through the number given', (): void => {
    assert.deepStrictEqual(evaluateExpr('fuzzyMatch("Pittsburgh, PA", "philadelphia", maxErrors=1000000)'), undocValue(true, boolType))
})

void test('normalizeString folds a name the way search does', (): void => {
    assert.deepStrictEqual(evaluateExpr('normalizeString("Saint-Denis, \\u00CEle-de-France")'), undocValue('saint denis ile de france', stringType))
    assert.deepStrictEqual(evaluateExpr('normalizeString("Washington [DC] (USA)")'), undocValue('washington dc usa', stringType))
})

void test('the predicates broadcast over a vector of strings', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('endsWith(["San Diego, CA", "Reno, NV"], ", CA")'),
        undocValue([true, false], boolVectorType),
    )
})

void test('matchesRegex takes a pattern, and normalizes neither side', (): void => {
    assert.deepStrictEqual(evaluateExpr('matchesRegex("San Diego, CA", "^San .*, (CA|NV)$")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('matchesRegex("San Diego, CA", "^san ")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('matchesRegex(normalizeString("San Diego, CA"), "^san ")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('matchesRegex("CA 92101", "\\\\d+")'), undocValue(true, boolType))
})

void test('an invalid pattern is an error, and only matchesRegex takes a pattern', (): void => {
    expectError('matchesRegex("abc", "(")', 'Invalid regular expression: /(/: Unterminated group at 1:1-24')
    assert.deepStrictEqual(evaluateExpr('includes("abc", "(", normalize=false)'), undocValue(false, boolType))
})

void test('a non-string argument is an error', (): void => {
    expectError('startsWith(1, "a")', 'Expected positional argument 1 to be a string (or vector thereof) but got number at 1:1-18')
})
