import assert from 'assert/strict'
import { test } from 'node:test'

import { evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { USSType, undocValue } from '../src/urban-stats-script/types-values'

import { boolType, emptyContext, numType, parseExpr, stringType } from './urban-stats-script-utils'

const stringVectorType = { type: 'vector', elementType: stringType } satisfies USSType
const boolVectorType = { type: 'vector', elementType: boolType } satisfies USSType

function evaluateExpr(input: string): ReturnType<typeof evaluate> {
    return evaluate(parseExpr(input), emptyContext())
}

void test('the predicates test a prefix, a suffix, and anywhere', (): void => {
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego, CA", "San ")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego, CA", "Diego")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('endsWith("San Diego, CA", ", CA")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('endsWith("San Diego, CA", ", NV")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("San Diego, CA", "Diego")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('includes("San Diego, CA", "Reno")'), undocValue(false, boolType))
})

void test('the predicates are case-sensitive, and lower makes them not', (): void => {
    assert.deepStrictEqual(evaluateExpr('startsWith("San Diego", "san")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('startsWith(lower("San Diego"), lower("SAN"))'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('lower("San Diego")'), undocValue('san diego', stringType))
    assert.deepStrictEqual(evaluateExpr('upper("San Diego")'), undocValue('SAN DIEGO', stringType))
})

void test('firstIndexOf and lastIndexOf pick different occurrences', (): void => {
    assert.deepStrictEqual(evaluateExpr('firstIndexOf("Washington, DC, USA", ", ")'), undocValue(10, numType))
    assert.deepStrictEqual(evaluateExpr('lastIndexOf("Washington, DC, USA", ", ")'), undocValue(14, numType))
    assert.deepStrictEqual(evaluateExpr('firstIndexOf("San Diego", ", ")'), undocValue(-1, numType))
    assert.deepStrictEqual(evaluateExpr('lastIndexOf("San Diego", ", ")'), undocValue(-1, numType))
})

void test('stringLength and substring extract part of a string', (): void => {
    assert.deepStrictEqual(evaluateExpr('stringLength("San Diego")'), undocValue(9, numType))
    assert.deepStrictEqual(evaluateExpr('substring("San Diego, CA", 0, 3)'), undocValue('San', stringType))
    assert.deepStrictEqual(
        evaluateExpr('substring("San Diego, CA", firstIndexOf("San Diego, CA", ", ") + 2, stringLength("San Diego, CA"))'),
        undocValue('CA', stringType),
    )
})

void test('substring counts a negative position from the end, and clamps rather than failing', (): void => {
    assert.deepStrictEqual(evaluateExpr('substring("San Diego, CA", -2, 13)'), undocValue('CA', stringType))
    assert.deepStrictEqual(evaluateExpr('substring("abc", -5, 100)'), undocValue('abc', stringType))
    assert.deepStrictEqual(evaluateExpr('substring("abc", 2, 1)'), undocValue('', stringType))
})

void test('replace and trim', (): void => {
    assert.deepStrictEqual(evaluateExpr('replace("a-b-c", "-", "+")'), undocValue('a+b+c', stringType))
    // the target is literal, so regex syntax matches nothing
    assert.deepStrictEqual(evaluateExpr('replace("a-b-c", "[a-z]", "!")'), undocValue('a-b-c', stringType))
    // and so is the replacement, in which $& would otherwise stand for the match
    assert.deepStrictEqual(evaluateExpr('replace("a-b", "-", "$&")'), undocValue('a$&b', stringType))
    assert.deepStrictEqual(evaluateExpr('replace("a-b", "-", "$$")'), undocValue('a$$b', stringType))
    assert.deepStrictEqual(evaluateExpr('trim("  San Diego \\t")'), undocValue('San Diego', stringType))
})

void test('string operations broadcast over a vector of strings', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('endsWith(["San Diego, CA", "Reno, NV"], ", CA")'),
        undocValue([true, false], boolVectorType),
    )
    assert.deepStrictEqual(evaluateExpr('upper(["a", "b"])'), undocValue(['A', 'B'], stringVectorType))
})

void test('the Regex functions take patterns where the others take literals', (): void => {
    assert.deepStrictEqual(evaluateExpr('matchesRegex("San Diego, CA", "^San .*, (CA|NV)$")'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('matchesRegex("San Diego, CA", "^Diego")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('replaceRegex("a1b22c", "[0-9]+", "-")'), undocValue('a-b-c', stringType))
    assert.deepStrictEqual(evaluateExpr('replaceRegex("San Diego, CA", "^(.*), (.*)$", "$2")'), undocValue('CA', stringType))
})

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

void test('an invalid pattern is an error, and only the Regex functions have patterns', (): void => {
    expectError('matchesRegex("abc", "(")', 'Invalid regular expression: /(/: Unterminated group at 1:1-24')
    assert.deepStrictEqual(evaluateExpr('includes("abc", "(")'), undocValue(false, boolType))
})

void test('a non-string argument is an error', (): void => {
    expectError('startsWith(1, "a")', 'Expected positional argument 1 to be a string (or vector thereof) but got number at 1:1-18')
})
