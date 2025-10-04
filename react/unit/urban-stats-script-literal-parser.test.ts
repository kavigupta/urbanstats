import assert from 'assert/strict'
import test from 'node:test'

import { defaultConstants } from '../src/urban-stats-script/constants/constants'
import * as l from '../src/urban-stats-script/literal-parser'
import { unparse } from '../src/urban-stats-script/parser'

import { parseExpr, parseProgram } from './urban-stats-script-utils'

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

void test('identifier', () => {
    const parser = l.identifier('testIdent')
    assert.equal(parser.parse(parseExpr('testIdent'), defaultConstants), 'testIdent')
    assert.equal(parser.parse(parseExpr('wrongIdent'), defaultConstants), undefined)
})

void test('call', () => {
    const parser = l.call({
        fn: l.identifier('bar'),
        namedArgs: { foo: l.number() },
        unnamedArgs: [l.string(), l.boolean()],
    })
    assert.deepEqual(
        parser.parse(parseExpr('bar("hi", true, foo=7)'), defaultConstants),
        { fn: 'bar', namedArgs: { foo: 7 }, unnamedArgs: ['hi', true] },
    )
    assert.equal(
        parser.parse(parseExpr('bar("hi", foo="no", true)'), defaultConstants),
        undefined,
    )
})

void test('deconstruct', () => {
    const schema = l.deconstruct(l.call({ fn: l.identifier('rgb'), namedArgs: {}, unnamedArgs: [l.number(), l.number(), l.number()] }))

    assert.deepEqual(
        schema.parse(parseExpr('colorBlue'), defaultConstants),
        {
            fn: 'rgb',
            namedArgs: {},
            unnamedArgs: [0.353, 0.49, 0.765],
        },
    )

    assert.deepEqual(
        // eslint-disable-next-line no-restricted-syntax -- This is USS
        schema.parse(parseExpr('rgb(0, 0, 1)'), defaultConstants),
        {
            fn: 'rgb',
            namedArgs: {},
            unnamedArgs: [0, 0, 1],
        },
    )

    // edit deconstruct
    const editSchema = l.deconstruct(l.call({ fn: l.ignore(), namedArgs: {}, unnamedArgs: [l.number(), l.number(), l.edit(l.number())] }))
    assert.equal(
        unparse(editSchema.parse(parseExpr('colorBlue'), defaultConstants)!.unnamedArgs[2].edit(parseExpr('1'))),
        'rgb(0.353, 0.49, 1)',
    )
})

void test('reparse', () => {
    // Should parse and reparse the expression when editing
    const parser = l.reparse('testBlock', [{ type: 'number' }], l.edit(l.number()))
    const editResult = parser.parse(parseExpr('5'), defaultConstants)!.edit(parseExpr('4'))
    assert.equal(editResult.type, 'constant')
    assert.deepEqual(editResult.value.location.start.block, { type: 'single', ident: 'testBlock' })
})

void test('expression', () => {
    // Wraps an expression statement
    const exprStmt = parseProgram('42')
    const parser = l.expression(l.number())
    assert.equal(parser.parse(exprStmt, defaultConstants), 42)
    // Should return undefined for non-expression
    assert.equal(parser.parse(undefined, defaultConstants), undefined)
})

void test('statements', () => {
    // Wraps a statements node
    const stmt = parseProgram('1; 2')
    const parser = l.statements([l.expression(l.number()), l.expression(l.number())])
    assert.deepEqual(parser.parse(stmt, defaultConstants), [1, 2])
    // Should return undefined for non-statements
    assert.equal(parser.parse(undefined, defaultConstants), undefined)
})

void test('ignore', () => {
    // Always returns null
    assert.equal(l.ignore().parse(parseExpr('123'), defaultConstants), null)
    assert.equal(l.ignore().parse(undefined, defaultConstants), null)
})

void test('condition', () => {
    // Parses a condition statement
    const stmt = parseProgram('condition (true); 5')
    const parser = l.condition({ condition: l.boolean(), rest: [l.expression(l.number())] })
    assert.deepEqual(parser.parse(stmt, defaultConstants), { condition: true, rest: [5] })
    // Should return undefined for non-condition
    assert.equal(parser.parse(undefined, defaultConstants), undefined)
})

void test('transformExpr', () => {
    // Maps the result of a parser
    const parser = l.transformExpr(l.number(), n => n * 2)
    assert.equal(parser.parse(parseExpr('21'), defaultConstants), 42)
})

void test('transformStmt', () => {
    // Maps the result of a statement parser
    const parser = l.transformStmt(l.expression(l.number()), n => n + 1)
    const exprStmt = parseProgram('41')
    assert.equal(parser.parse(exprStmt, defaultConstants), 42)
})

void test('edit statements', () => {
    // Parses and edits a statements node
    const stmt = parseProgram('1; 2')
    const parser = l.statements([l.expression(l.number()), l.expression(l.edit(l.number()))])
    const parsed = parser.parse(stmt, defaultConstants)
    assert.partialDeepStrictEqual(parsed, [1, { currentValue: 2 }])

    // Edit the second statement
    const edited = parsed![1].edit(parseExpr('3'))
    assert.equal(unparse(edited), '1;\n3')
})
