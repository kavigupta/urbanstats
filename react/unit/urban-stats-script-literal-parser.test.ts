import assert from 'assert/strict'
import test from 'node:test'

import { defaultConstants } from '../src/urban-stats-script/constants/constants'
import * as l from '../src/urban-stats-script/literal-parser'
import { unparse } from '../src/urban-stats-script/parser'

import { parseExpr } from './urban-stats-script-utils'

void test('object', () => {
    assert.deepEqual(
        l.object({ a: l.number(), b: l.number() }).parse(parseExpr('{ a: 1, b: 2 }'), defaultConstants),
        { a: 1, b: 2 },
    )
})

void test('edit', () => {
    assert.equal(
        unparse(
            l.object({ a: l.number(), b: l.edit(l.number()) })
                .parse(parseExpr('{a: 1, b: 2}'), defaultConstants)!.b.edit(parseExpr('3'))),
        '{a: 1, b: 3}',
    )
})

void test('string', () => {
    assert.equal(
        l.string().parse(parseExpr('"hello"'), defaultConstants),
        'hello',
    )
    assert.equal(
        l.string().parse(parseExpr('123'), defaultConstants),
        undefined,
    )
})

void test('boolean', () => {
    assert.equal(
        l.boolean().parse(parseExpr('true'), defaultConstants),
        true,
    )
    assert.equal(
        l.boolean().parse(parseExpr('false'), defaultConstants),
        false,
    )
    assert.equal(
        l.boolean().parse(parseExpr('1'), defaultConstants),
        undefined,
    )
})

void test('number', () => {
    assert.equal(
        l.number().parse(parseExpr('42'), defaultConstants),
        42,
    )
    assert.equal(
        l.number().parse(parseExpr('-7'), defaultConstants),
        -7,
    )
    assert.equal(
        l.number().parse(parseExpr('"not a number"'), defaultConstants),
        undefined,
    )
})

void test('optional', () => {
    const optNum = l.optional(l.number())
    assert.equal(optNum.parse(undefined, defaultConstants), null)
    assert.equal(optNum.parse(parseExpr('5'), defaultConstants), 5)
    assert.equal(optNum.parse(parseExpr('"no"'), defaultConstants), undefined)
})

void test('vector', () => {
    assert.deepEqual(
        l.vector(l.number()).parse(parseExpr('[1, 2, 3]'), defaultConstants),
        [1, 2, 3],
    )
    assert.equal(
        l.vector(l.number()).parse(parseExpr('[1, "a"]'), defaultConstants),
        undefined,
    )
})

void test('call', () => {
    const parser = l.call({
        namedArgs: { foo: l.number() },
        unnamedArgs: [l.string(), l.boolean()],
    })
    assert.deepEqual(
        parser.parse(parseExpr('bar("hi", true, foo=7)'), defaultConstants),
        { namedArgs: { foo: 7 }, unnamedArgs: ['hi', true] },
    )
    assert.equal(
        parser.parse(parseExpr('bar("hi", foo="no", true)'), defaultConstants),
        undefined,
    )
})

void test('deconstruct', () => {
    // This test assumes a constant with equivalentExpressions is present in defaultConstants
    // If not, this will just return undefined
    assert.deepEqual(
        l.deconstruct(l.call({ namedArgs: {}, unnamedArgs: [l.number(), l.number(), l.number()] })).parse(parseExpr('colorBlue'), defaultConstants),
        {
            namedArgs: {},
            unnamedArgs: [0.353, 0.49, 0.765],
        },
    )
})
