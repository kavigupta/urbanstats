import assert from 'assert/strict'
import { test } from 'node:test'

import { Context } from '../src/urban-stats-script/interpreter'
import { lex } from '../src/urban-stats-script/lexer'
import { parse, toSExp } from '../src/urban-stats-script/parser'
import { broadcastApply, locateType, USSRawValue, renderType, USSType, USSValue } from '../src/urban-stats-script/types-values'

void test('basic lexing with indices', (): void => {
    assert.deepStrictEqual(lex('1 23 3.3'), [
        { token: { type: 'number', value: 1 }, location: { lineIdx: 0, startIdx: 0, endIdx: 1 } },
        { token: { type: 'number', value: 23 }, location: { lineIdx: 0, startIdx: 2, endIdx: 4 } },
        { token: { type: 'number', value: 3.3 }, location: { lineIdx: 0, startIdx: 5, endIdx: 8 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 8, endIdx: 8 } },
    ])
    assert.deepStrictEqual(lex('"abc"'), [
        { token: { type: 'string', value: 'abc' }, location: { lineIdx: 0, startIdx: 0, endIdx: 5 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 5, endIdx: 5 } },
    ])
    assert.deepStrictEqual(lex('"abc\\""'), [
        { token: { type: 'string', value: 'abc"' }, location: { lineIdx: 0, startIdx: 0, endIdx: 7 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 7, endIdx: 7 } },
    ])
    assert.deepStrictEqual(lex('f(2, "abc \\" 3.5")'), [
        { token: { type: 'identifier', value: 'f' }, location: { lineIdx: 0, startIdx: 0, endIdx: 1 } },
        { token: { type: 'bracket', value: '(' }, location: { lineIdx: 0, startIdx: 1, endIdx: 2 } },
        { token: { type: 'number', value: 2 }, location: { lineIdx: 0, startIdx: 2, endIdx: 3 } },
        { token: { type: 'operator', value: ',' }, location: { lineIdx: 0, startIdx: 3, endIdx: 4 } },
        { token: { type: 'string', value: 'abc " 3.5' }, location: { lineIdx: 0, startIdx: 5, endIdx: 17 } },
        { token: { type: 'bracket', value: ')' }, location: { lineIdx: 0, startIdx: 17, endIdx: 18 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 18, endIdx: 18 } },
    ])
})

function shortFormLex(input: string): (string | number | [string | number, string])[] {
    const lines = input.split('\n')
    const lexedTokens = lex(input)
    const result: (string | number | [string | number, string])[] = []
    for (const token of lexedTokens) {
        const original = lines[token.location.lineIdx].slice(token.location.startIdx, token.location.endIdx)
        const valueStr = token.token.value.toString()
        if (original !== valueStr) {
            result.push([token.token.value, original])
        }
        else {
            result.push(token.token.value)
        }
    }
    return result
}

void test('various lexes', (): void => {
    assert.deepStrictEqual(shortFormLex('1 23 3.3'), [1, 23, 3.3, ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('"abc"'), [['abc', '"abc"'], ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('"abc\\""'), [['abc"', '"abc\\""'], ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('f(2, "abc \\" 3.5")'), ['f', '(', 2, ',', ['abc " 3.5', '"abc \\" 3.5"'], ')', ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('f(x) + g(2.34)'), ['f', '(', 'x', ')', '+', 'g', '(', 2.34, ')', ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('f(x) ++2'), ['f', '(', 'x', ')', ['Invalid operator: ++', '++'], 2, ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('pw_frac = (pw_density_2km / pw_density_500m) ** 2\ny = x ** 0.5'), [
        'pw_frac',
        '=',
        '(',
        'pw_density_2km',
        '/',
        'pw_density_500m',
        ')',
        '**',
        2,
        ['EOL', ''],
        'y',
        '=',
        'x',
        '**',
        0.5,
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('x = 2; x = 3'), [
        'x',
        '=',
        2,
        ';',
        'x',
        '=',
        3,
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('f(f(x))'), [
        'f',
        '(',
        'f',
        '(',
        'x',
        ')',
        ')',
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('x(y, z=f(x))'), [
        'x',
        '(',
        'y',
        ',',
        'z',
        '=',
        'f',
        '(',
        'x',
        ')',
        ')',
        ['EOL', ''],
    ])
})

function parseAndRender(input: string): string {
    const res = parse(lex(input))
    if (res.type === 'error') {
        return `(error ${JSON.stringify(res.message)} at ${res.location.lineIdx}:${res.location.startIdx})`
    }
    return toSExp(res)
}

const multiRegression = `
if (pw_density_1km < 1000) {
    regr = linear_regression(y=commute_transit, x0=commute_car, weight=population)
} else {
    regr = linear_regression(y=commute_transit, x0=commute_car, weight=population, allow_intercept=false)
}
regr.w0 = regr.w0 * 2; regr.w0
`

void test('basic parsing', (): void => {
    assert.deepStrictEqual(
        parse(lex('x = 2')),
        {
            type: 'assignment',
            lhs: { type: 'identifier', name: { node: 'x', location: { lineIdx: 0, startIdx: 0, endIdx: 1 } } },
            value: { type: 'constant', value: { node: 2, location: { lineIdx: 0, startIdx: 4, endIdx: 5 } } },
        },
    )
    assert.deepStrictEqual(
        parseAndRender('x = 2; y = x'),
        '(statements (assign (id x) (const 2)) (assign (id y) (id x)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x'),
        '(expr (id x))',
    )
    assert.deepStrictEqual(
        parseAndRender('abc()'),
        '(expr (fn (id abc)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y)'),
        '(expr (fn (id x) (id y)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z)'),
        '(expr (fn (id x) (id y) (id z)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z=2)'),
        '(expr (fn (id x) (id y) (named z (const 2))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z=2, y)'),
        '(expr (fn (id x) (id y) (named z (const 2)) (id y)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, f())'),
        '(expr (fn (id x) (id y) (fn (id f))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y)(z)'),
        '(expr (fn (fn (id x) (id y)) (id z)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + y + z'),
        '(expr (infix (+ +) ((id x) (id y) (id z))))',
    )
    assert.deepStrictEqual(
        parseAndRender('regr = linear_regression(y=commute_transit, x0=commute_car, weight=population)'),
        '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population))))',
    )
    const ifStmtS = '(if (infix (>) ((id x) (const 2))) (assign (id y) (const 3)) (assign (id y) (const 4)))'
    assert.deepStrictEqual(
        parseAndRender('if (x > 2) { y = 3 } else { y = 4 }'),
        ifStmtS,
    )
    const multiLineIf = `
    if (x > 2) {
        y = 3
    } else {
        y = 4
    }
    `
    assert.deepStrictEqual(
        parseAndRender(multiLineIf),
        ifStmtS,
    )
    assert.deepStrictEqual(
        parseAndRender('x.y'),
        '(expr (attr (id x) y))',
    )
    assert.deepStrictEqual(
        parseAndRender('f.z(2).y(3)'),
        '(expr (fn (attr (fn (attr (id f) z) (const 2)) y) (const 3)))',
    )
    assert.deepStrictEqual(
        parseAndRender(multiRegression),
        `(statements ${[
            [
                '(if',
                '(infix (<) ((id pw_density_1km) (const 1000)))',
                '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population))))',
                '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population)) (named allow_intercept (id false))))'//
                + ')',
            ].join(' '),
            '(assign (attr (id regr) w0) (infix (*) ((attr (id regr) w0) (const 2))))',
            '(expr (attr (id regr) w0))',
        ].join(' ')})`,
    )
})

const numType = { type: 'number' } satisfies USSType
const numVectorType = { type: 'vector', elementType: numType } satisfies USSType
const numMatrixType = { type: 'vector', elementType: numVectorType } satisfies USSType
const multiObjType = { type: 'object', properties: { a: numType, b: numVectorType } } satisfies USSType
const multiObjVectorType = {
    type: 'vector',
    elementType: multiObjType,
} satisfies USSType

const testFnType = { type: 'function', posArgs: [numType], namedArgs: { a: numType }, returnType: numType } satisfies USSType

const testFn1: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number)
const testFn2: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => (posArgs[0] as number) * (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number)

void test('broadcasting-locate-type', (): void => {
    assert.deepStrictEqual(
        locateType(
            { type: numType, value: 1 },
            t => t.type === 'number',
            'number',
        ),
        { type: 'success', result: [[], numType, 1] },
    )
    assert.deepStrictEqual(
        locateType(
            { type: numVectorType, value: [1, 2, 3] },
            t => t.type === 'number',
            'number',
        ),
        { type: 'success', result: [[3], numType, [1, 2, 3]] },
    )
    assert.deepStrictEqual(
        locateType(
            { type: numMatrixType, value: [[1, 2], [3, 4]] },
            t => t.type === 'number',
            'number',
        ),
        { type: 'success', result: [[2, 2], numType, [[1, 2], [3, 4]]] },
    )
    assert.deepStrictEqual(
        locateType(
            { type: numMatrixType, value: [[1, 2], [3, 4]] },
            t => t.type === 'vector' && t.elementType.type === 'number',
            'vector of number',
        ),
        { type: 'success', result: [[2], numVectorType, [[1, 2], [3, 4]]] },
    )
    assert.deepStrictEqual(
        locateType(
            { type: multiObjType, value: new Map<string, USSValue>([['a', 1], ['b', [1, 2, 3]]]) },
            t => t.type === 'number',
            'number',
        ),
        { type: 'error', message: 'Expected a vector, or vector of number but got {a: number, b: number}' },
    )
    assert.deepStrictEqual(
        locateType(
            { type: multiObjType, value: new Map<string, USSValue>([['a', 1], ['b', [1, 2, 3]]]) },
            t => renderType(t) === renderType({ type: 'object', properties: { a: numType, b: numType } }),
            'object with properties {a: number, b: number}',
        ),
        {
            type: 'success',
            result: [
                [3],
                { type: 'object', properties: { a: numType, b: numType } },
                [
                    new Map<string, USSValue>([['a', 1], ['b', 1]]),
                    new Map<string, USSValue>([['a', 1], ['b', 2]]),
                    new Map<string, USSValue>([['a', 1], ['b', 3]]),
                ],
            ],
        },
    )
    assert.deepStrictEqual(
        locateType(
            {
                type: multiObjVectorType,
                value: [
                    new Map<string, USSValue>([['a', 1], ['b', [1, 2, 3]]]),
                    new Map<string, USSValue>([['a', 6], ['b', [4, 5, 6]]]),
                ],
            },
            t => renderType(t) === renderType({ type: 'object', properties: { a: numType, b: numType } }),
            'object with properties {a: number, b: number}',
        ),
        {
            type: 'success',
            result: [
                [2, 3],
                { type: 'object', properties: { a: numType, b: numType } },
                [
                    [
                        new Map<string, USSValue>([['a', 1], ['b', 1]]),
                        new Map<string, USSValue>([['a', 1], ['b', 2]]),
                        new Map<string, USSValue>([['a', 1], ['b', 3]]),
                    ],
                    [
                        new Map<string, USSValue>([['a', 6], ['b', 4]]),
                        new Map<string, USSValue>([['a', 6], ['b', 5]]),
                        new Map<string, USSValue>([['a', 6], ['b', 6]]),
                    ],
                ],
            ],
        },
    )
})

void test('broadcasting-apply', (): void => {
    assert.deepStrictEqual(
        broadcastApply(
            { type: testFnType, value: testFn1 },
            [
                { type: numType, value: 10 },
            ],
            [
                ['a', { type: numType, value: 3 }],
            ],
            {} as Context, // Context is not used in this test, so we can pass an empty object
        ),
        { type: 'success', result: { type: numType, value: 10 * 10 + 3 } },
    )
    assert.deepStrictEqual(
        broadcastApply(
            { type: testFnType, value: testFn1 },
            [
                { type: numVectorType, value: [10, 20, 30] },
            ],
            [
                ['a', { type: numType, value: 3 }],
            ],
            {} as Context,
        ),
        {
            type: 'success',
            result: {
                type: numVectorType,
                value: [10 * 10 + 3, 20 * 20 + 3, 30 * 30 + 3],
            },
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            { type: testFnType, value: testFn1 },
            [
                { type: numMatrixType, value: [[10, 20], [30, 40]] },
            ],
            [
                ['a', { type: numType, value: 3 }],
            ],
            {} as Context,
        ),
        {
            type: 'success',
            result: {
                type: numMatrixType,
                value: [[10 * 10 + 3, 20 * 20 + 3], [30 * 30 + 3, 40 * 40 + 3]],
            },
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            { type: testFnType, value: testFn1 },
            [
                { type: numMatrixType, value: [[10, 20], [30, 40]] },
            ],
            [
                ['a', { type: numVectorType, value: [3, 4] }],
            ],
            {} as Context,
        ),
        {
            type: 'success',
            result: {
                type: numMatrixType,
                value: [[10 * 10 + 3, 20 * 20 + 4], [30 * 30 + 3, 40 * 40 + 4]],
            },
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            { type: { type: 'vector', elementType: testFnType }, value: [testFn1, testFn2] },
            [
                { type: numMatrixType, value: [[10, 20], [30, 40]] },
            ],
            [
                ['a', { type: numVectorType, value: [3, 4] }],
            ],
            {} as Context,
        ),
        {
            type: 'success',
            result: {
                type: numMatrixType,
                value: [[10 * 10 + 3, 20 * 20 * 20 + 4], [30 * 30 + 3, 40 * 40 * 40 + 4]],
            },
        },
    )
})
