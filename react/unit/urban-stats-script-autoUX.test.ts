import assert from 'assert/strict'
import { test } from 'node:test'

import { evaluate } from '../src/urban-stats-script/interpreter'
import { Block } from '../src/urban-stats-script/location'
import { parse, parseNoError, toSExp, unparse } from '../src/urban-stats-script/parser'

import { emptyContext } from './urban-stats-script-utils'

const testBlock: Block = {
    type: 'single',
    ident: 'test',
}

void test('parse autoUX expression', () => {
    const result = parse('autoUX(1 + 2, "{}")', testBlock)
    assert.strictEqual(result.type, 'expression')
    assert.strictEqual(result.value.type, 'autoUX')
    assert.strictEqual(result.value.expr.type, 'binaryOperator')
    assert.deepStrictEqual(result.value.metadata, {})
})

void test('autoUX S-expression representation', () => {
    const result = parse('autoUX(x, "{\\"collapsed\\": true }")', testBlock)
    assert.strictEqual(result.type, 'expression')
    const sexp = toSExp(result.value)
    assert.strictEqual(sexp, '(autoUX (id x) {"collapsed":true})')
})

void test('autoUX with invalid arguments', () => {
    // Should fail with only one argument
    const result1 = parse('autoUX(x)', testBlock)
    assert.strictEqual(result1.type, 'error')

    // Wrong arg type
    const result2 = parse('autoUX(x, {})', testBlock)
    assert.strictEqual(result2.type, 'error')

    // Should fail with three arguments
    const result3 = parse('autoUX(x, y, z)', testBlock)
    assert.strictEqual(result3.type, 'error')
})

void test('invalid metadata', () => {
    // Should return empty object with invalid metadata (for forwards compatiblity)
    for (const code of [
        'autoUX(x, "not an object")',
        'autoUX(x, "{}")',
        'autoUX(x, "{ \\"invalidKey\\": 0 }")',
    ]) {
        const result = parse(code, testBlock)
        assert.strictEqual(result.type, 'expression')
        assert.strictEqual(result.value.type, 'autoUX')
        assert.deepStrictEqual(result.value.metadata, {})
    }
})

void test('forwards compatibility', () => {
    const result = parse('autoUX(x, "{ \\"collapsed\\": true, \\"futureProperty\\": [] }")', testBlock)
    assert.strictEqual(result.type, 'expression')
    assert.strictEqual(result.value.type, 'autoUX')
    assert.deepStrictEqual(result.value.metadata, { collapsed: true })
})

void test('autoUX expression evaluates correctly', () => {
    const result = parse('autoUX(5 + 3, "{\\"collapsed\\": true}")', testBlock)
    assert.strictEqual(result.type, 'expression')
    const ctx = emptyContext()
    const evaluated = evaluate(result.value, ctx)
    assert.strictEqual(evaluated.type.type, 'number')
    assert.strictEqual(evaluated.value, 8)
})

void test('unparsing', () => {
    assert.equal(unparse(parseNoError('autoUX(1 + 2, "{}")', 'test')), 'autoUX(1 + 2, "{}")')
    assert.equal(unparse(parseNoError('autoUX(1 + 2, "{\\"collapsed\\": true}")', 'test')), 'autoUX(1 + 2, "{\\"collapsed\\":true}")')
    assert.equal(unparse(parseNoError('autoUX(1 + 2, "{\\"collapsed\\": true}")', 'test'), { simplify: true }), '1 + 2')
})
