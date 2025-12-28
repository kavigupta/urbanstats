import assert from 'assert/strict'
import test from 'node:test'

import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { defaultConstants } from '../src/urban-stats-script/constants/constants'
import * as l from '../src/urban-stats-script/literal-parser'
import { unparse } from '../src/urban-stats-script/parser'
import { replace } from '../src/utils/array-edits'

import { parseExpr, parseProgram } from './urban-stats-script-utils'

void test('object', () => {
    assert.deepEqual(
        l.object({ a: l.number(), b: l.number() }).parse(parseExpr('{ a: 1, b: 2 }'), defaultConstants),
        { a: 1, b: 2 },
    )
})

void test('edit object', () => {
    assert.equal(
        unparse(
            l.object({ a: l.number(), b: l.edit(l.number()) })
                .parse(parseExpr('{a: 1, b: 2}'), defaultConstants).b.edit(parseExpr('3'))!),
        '{a: 1, b: 3}',
    )
})

void test('remove from object', () => {
    assert.equal(
        unparse(
            l.object({ a: l.number(), b: l.edit(l.number()) })
                .parse(parseExpr('{a: 1, b: 2}'), defaultConstants).b.edit(undefined)!),
        '{a: 1}',
    )
})

void test('string', () => {
    assert.equal(
        l.string().parse(parseExpr('"hello"'), defaultConstants),
        'hello',
    )
    assert.throws(
        () => l.string().parse(parseExpr('123'), defaultConstants),
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
    assert.throws(
        () => l.boolean().parse(parseExpr('1'), defaultConstants),
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
    assert.throws(
        () => l.number().parse(parseExpr('"not a number"'), defaultConstants),
    )
})

void test('optional', () => {
    const optNum = l.optional(l.number())
    assert.equal(optNum.parse(undefined, defaultConstants), undefined)
    assert.equal(optNum.parse(parseExpr('5'), defaultConstants), 5)
    assert.throws(
        () => optNum.parse(parseExpr('"no"'), defaultConstants),
    )
})

void test('vector', () => {
    assert.deepEqual(
        l.vector(l.number()).parse(parseExpr('[1, 2, 3]'), defaultConstants),
        [1, 2, 3],
    )
    assert.throws(
        () => l.vector(l.number()).parse(parseExpr('[1, "a"]'), defaultConstants),
    )
})

void test('identifier', () => {
    const parser = l.identifier('testIdent')
    assert.equal(parser.parse(parseExpr('testIdent'), defaultConstants), 'testIdent')
    assert.throws(
        () => parser.parse(parseExpr('wrongIdent'), defaultConstants),
    )
})

void test('call', () => {
    const parser = l.call({
        fn: l.identifier('bar'),
        namedArgs: { foo: l.number() },
        unnamedArgs: [l.string(), l.boolean()],
    })
    assert.deepEqual(
        parser.parse(parseExpr('bar("hi", foo=7, true)'), defaultConstants),
        { fn: 'bar', namedArgs: { foo: 7 }, unnamedArgs: ['hi', true] },
    )
    assert.throws(
        () => parser.parse(parseExpr('bar("hi", foo="no", true)'), defaultConstants),
    )
})

void test('edit call', () => {
    assert.equal(
        unparse(
            l.call({ fn: l.edit(l.ignore()), namedArgs: {}, unnamedArgs: [l.number()] })
                .parse(parseExpr('sin(1)'), defaultConstants).fn.edit(parseExpr('cos'))!),
        'cos(1)',
    )
})

void test('remove named argument call', () => {
    assert.equal(
        unparse(
            l.call({ fn: l.ignore(), namedArgs: { a: l.edit(l.ignore()) }, unnamedArgs: [] })
                .parse(parseExpr('fn(a=1)'), defaultConstants).namedArgs.a.edit(undefined)!),
        'fn()',
    )
})

void test('remove unnamed argument', () => {
    assert.equal(
        unparse(
            l.call({ fn: l.ignore(), namedArgs: {}, unnamedArgs: [l.edit(l.ignore())] })
                .parse(parseExpr('fn(1)'), defaultConstants).unnamedArgs[0].edit(undefined)!),
        'fn()',
    )
})

void test('error when not enough named args', () => {
    assert.throws(() => l.call({ fn: l.ignore(), namedArgs: {}, unnamedArgs: [l.ignore()] }).parse(parseExpr('fn()'), defaultConstants))
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
        unparse(editSchema.parse(parseExpr('colorBlue'), defaultConstants).unnamedArgs[2].edit(parseExpr('1'))!),
        'rgb(0.353, 0.49, 1)',
    )
})

void test('reparse', () => {
    // Should parse and reparse the expression when editing
    const parser = l.reparse('testBlock', [{ type: 'number' }], l.edit(l.number()))
    const editResult = parser.parse(parseExpr('5'), defaultConstants).edit(parseExpr('4'))!
    assert.equal(editResult.type, 'constant')
    assert.deepEqual(editResult.value.location.start.block, { type: 'single', ident: 'testBlock' })
})

void test('expression', () => {
    // Wraps an expression statement
    const exprStmt = parseProgram('42')
    const parser = l.expression(l.number())
    assert.equal(parser.parse(exprStmt, defaultConstants), 42)
    // Should throw for non-expression
    assert.throws(
        () => parser.parse(undefined, defaultConstants),
    )
})

void test('statements', () => {
    // Wraps a statements node
    const stmt = parseProgram('1; 2')
    const parser = l.statements([l.expression(l.number()), l.expression(l.number())])
    assert.deepEqual(parser.parse(stmt, defaultConstants), [1, 2])
    // Should throw for non-statements
    assert.throws(
        () => parser.parse(undefined, defaultConstants),
    )
    // throws when not enough statements
    assert.throws(() => parser.parse(parseProgram('1;'), defaultConstants), 'not enough statements')
})

void test('ignore', () => {
    // Always returns undefined
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- This is meant to return undefined
    assert.equal(l.ignore().parse(parseExpr('123'), defaultConstants), undefined)
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- This is meant to return undefined
    assert.equal(l.ignore().parse(undefined, defaultConstants), undefined)
})

void test('condition', () => {
    // Parses a condition statement
    const stmt = parseProgram('condition (true); 5')
    const parser = l.condition({ condition: l.boolean(), rest: [l.expression(l.number())] })
    assert.deepEqual(parser.parse(stmt, defaultConstants), { condition: true, rest: [5] })
    // Should throw for non-condition
    assert.throws(
        () => parser.parse(undefined, defaultConstants),
    )
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
    assert.equal(parsed[0], 1)
    assert.equal(parsed[1].currentValue, 2)

    // Edit the second statement
    const edited = parsed[1].edit(parseExpr('3'))!
    assert.equal(unparse(edited), '1;\n3')
})

void test('editable vector', () => {
    assert.equal(
        unparse(
            l.editableVector(l.number())
                .parse(parseExpr('[1,2,3]'), defaultConstants)
                .edit(replace<UrbanStatsASTExpression>(i => i, [1, 2], []))),
        '[1, 3]')
})

void test('edit condition', () => {
    const stmt = parseProgram('condition (true); 5')
    const parser = l.condition({ condition: l.edit(l.boolean()), rest: [l.expression(l.number())] })
    assert.equal(unparse(parser.parse(stmt, defaultConstants).condition.edit(parseExpr('false'))!), 'condition (false)\n5')
    assert.throws(
        () => parser.parse(stmt, defaultConstants).condition.edit(undefined),
    )
})

void test('customNode', () => {
    assert.equal(l.maybeCustomNodeExpr(l.identifier('x')).parse(parseExpr('customNode("x")'), defaultConstants), 'x')
    assert.equal(unparse(l.maybeCustomNodeExpr(l.edit(l.identifier('x'))).parse(parseExpr('customNode("x")'), defaultConstants).edit(parseExpr('y'))!), 'customNode("y")')
    assert.equal(l.maybeCustomNodeExpr(l.edit(l.identifier('x'))).parse(parseExpr('customNode("x")'), defaultConstants).edit(undefined), undefined)
})

void test('autoUXNode', () => {
    assert.deepEqual(l.maybeAutoUXNode(l.identifier('x')).parse(parseExpr('autoUXNode(x, "{\\"collapsed\\":true}")'), defaultConstants), { expr: 'x', metadata: { collapsed: true } })
    assert.deepEqual(l.maybeAutoUXNode(l.identifier('x')).parse(parseExpr('x'), defaultConstants), { expr: 'x', metadata: {} })
    assert.equal(unparse(l.maybeAutoUXNode(l.edit(l.identifier('x'))).parse(parseExpr('autoUXNode(x, "{\\"collapsed\\":true}")'), defaultConstants).expr.edit(parseExpr('y'))!), 'autoUXNode(y, "{\\"collapsed\\":true}")')
    assert.equal(unparse(l.maybeAutoUXNode(l.edit(l.identifier('x'))).parse(parseExpr('autoUXNode(x, "{\\"collapsed\\":true}")'), defaultConstants).expr.edit(parseExpr('autoUXNode(y, "{\\"collapsed\\":false}")'))!), 'autoUXNode(y, "{\\"collapsed\\":false}")')
    assert.equal(unparse(l.vector(l.maybeAutoUXNode(l.edit(l.identifier('x')))).parse(parseExpr('[autoUXNode(x, "{\\"collapsed\\":true}")]'), defaultConstants)[0].expr.edit(parseExpr('autoUXNode(y, "{\\"collapsed\\":false}")'))!), '[autoUXNode(y, "{\\"collapsed\\":false}")]')
})
