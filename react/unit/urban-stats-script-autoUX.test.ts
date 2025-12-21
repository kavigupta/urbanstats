import assert from 'assert/strict'
import { test } from 'node:test'

import { evaluate } from '../src/urban-stats-script/interpreter'
import { Block } from '../src/urban-stats-script/location'
import { parse, toSExp } from '../src/urban-stats-script/parser'

import { emptyContext } from './urban-stats-script-utils'

const testBlock: Block = {
    type: 'single',
    ident: 'test',
}

void test('parse autoUX expression', () => {
    const result = parse('autoUX(1 + 2, {type: "arithmetic", operation: "addition"})', testBlock)
    assert.strictEqual(result.type, 'expression')
    assert.strictEqual(result.value.type, 'autoUX')
    assert.strictEqual(result.value.expr.type, 'binaryOperator')
    assert.strictEqual(result.value.metadata.type, 'objectLiteral')
})

void test('autoUX S-expression representation', () => {
    const result = parse('autoUX(x, {hint: "variable"})', testBlock)
    assert.strictEqual(result.type, 'expression')
    const sexp = toSExp(result.value)
    assert.strictEqual(sexp, '(autoUX (id x) (object (hint (const variable))))')
})

void test('autoUX with invalid arguments should fail', () => {
    // Should fail with only one argument
    const result1 = parse('autoUX(x)', testBlock)
    assert.strictEqual(result1.type, 'error')

    // Should fail with non-object metadata
    const result2 = parse('autoUX(x, "not an object")', testBlock)
    assert.strictEqual(result2.type, 'error')

    // Should fail with three arguments
    const result3 = parse('autoUX(x, y, z)', testBlock)
    assert.strictEqual(result3.type, 'error')
})

void test('autoUX expression evaluates correctly', () => {
    const result = parse('autoUX(5 + 3, {operation: "addition"})', testBlock)
    assert.strictEqual(result.type, 'expression')
    const ctx = emptyContext()
    const evaluated = evaluate(result.value, ctx)
    assert.strictEqual(evaluated.type.type, 'number')
    assert.strictEqual(evaluated.value, 8)
})
