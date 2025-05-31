import assert from 'assert/strict'
import { test } from 'node:test'

import { Context, Effect, evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { lex, LocInfo } from '../src/urban-stats-script/lexer'
import { parse, toSExp, UrbanStatsASTExpression } from '../src/urban-stats-script/parser'
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
    const ifStmtS = '(expr (if (infix (>) ((id x) (const 2))) (assign (id y) (const 3)) (assign (id y) (const 4))))'
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
                '(expr (if',
                '(infix (<) ((id pw_density_1km) (const 1000)))',
                '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population))))',
                '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population)) (named allow_intercept (id false))))'//
                + '))',
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

const testObjType = {
    type: 'object',
    properties: {
        u: numType,
        v: numType,
    },
} satisfies USSType

const multiArgFnType = {
    type: 'function',
    posArgs: [numType, numVectorType],
    namedArgs: { a: numType, b: testObjType },
    returnType: numVectorType,
} satisfies USSType

function testFnMultiArg(ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue {
    const x = posArgs[0] as number
    const y = posArgs[1] as number[]
    const a = namedArgs.a as number
    const b = namedArgs.b as Map<string, USSRawValue>
    return [
        x,
        y.reduce((acc, val) => acc + val, 0),
        y.reduce((acc, val) => acc + val * val, 0),
        a,
        b.get('u') as number,
        b.get('v') as number,
    ]
}

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
            { type: multiObjType, value: new Map<string, USSRawValue>([['a', 1], ['b', [1, 2, 3]]]) },
            t => t.type === 'number',
            'number',
        ),
        { type: 'error', message: 'Expected a vector, or vector of number but got {a: number, b: number}' },
    )
    assert.deepStrictEqual(
        locateType(
            { type: multiObjType, value: new Map<string, USSRawValue>([['a', 1], ['b', [1, 2, 3]]]) },
            t => renderType(t) === renderType({ type: 'object', properties: { a: numType, b: numType } }),
            'object with properties {a: number, b: number}',
        ),
        {
            type: 'success',
            result: [
                [3],
                { type: 'object', properties: { a: numType, b: numType } },
                [
                    new Map<string, USSRawValue>([['a', 1], ['b', 1]]),
                    new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
                    new Map<string, USSRawValue>([['a', 1], ['b', 3]]),
                ],
            ],
        },
    )
    assert.deepStrictEqual(
        locateType(
            {
                type: multiObjVectorType,
                value: [
                    new Map<string, USSRawValue>([['a', 1], ['b', [1, 2, 3]]]),
                    new Map<string, USSRawValue>([['a', 6], ['b', [4, 5, 6]]]),
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
                        new Map<string, USSRawValue>([['a', 1], ['b', 1]]),
                        new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
                        new Map<string, USSRawValue>([['a', 1], ['b', 3]]),
                    ],
                    [
                        new Map<string, USSRawValue>([['a', 6], ['b', 4]]),
                        new Map<string, USSRawValue>([['a', 6], ['b', 5]]),
                        new Map<string, USSRawValue>([['a', 6], ['b', 6]]),
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

function testingContext(effectsOut: Effect[], errorsOut: { msg: string, location: LocInfo }[], env: Map<string, USSValue>): Context {
    return {
        effect: (eff: Effect): void => {
            effectsOut.push(eff)
        },
        error: (msg: string, location: LocInfo): InterpretationError => {
            errorsOut.push({ msg, location })
            return new InterpretationError(msg, location)
        },
        variables: env,
    }
}

function parseExpr(input: string): UrbanStatsASTExpression {
    const lexed = lex(input)
    const parsed = parse(lexed)
    if (parsed.type !== 'expression') {
        throw new Error(`Expected an expression, but got ${JSON.stringify(parsed)}`)
    }
    return parsed.value
}

void test('evaluate basic expressions', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 2'), emptyCtx),
        { type: numType, value: 4 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4'), emptyCtx),
        { type: numType, value: 10 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5'), emptyCtx),
        { type: numType, value: 26 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5 + 6 ** 2'), emptyCtx),
        { type: numType, value: 62 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5 + 6 ** 2 - 7'), emptyCtx),
        { type: numType, value: 55 },
    )
})
void test('evaluate basic variable expressions', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    env.set('x', { type: numVectorType, value: [1, 2, 3] })
    assert.deepStrictEqual(
        evaluate(parseExpr('x + 1'), emptyCtx),
        { type: numVectorType, value: [2, 3, 4] },
    )
    env.set('y', { type: numMatrixType, value: [[10, 20, 30], [40, 50, 60]] })
    assert.deepStrictEqual(
        evaluate(parseExpr('y + x'), emptyCtx),
        { type: numMatrixType, value: [[11, 22, 33], [41, 52, 63]] },
    )
})

void test('evaluate attr accesses', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    env.set('obj', {
        type: testObjType,
        value: new Map<string, USSRawValue>([['u', 401], ['v', 502]]),
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('obj.u'), emptyCtx),
        { type: numType, value: 401 },
    )

    assert.throws(
        () => evaluate(parseExpr('obj.x'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Attribute x not found in object of type {u: number, v: number}'
        },
    )
    env.set('objs', {
        type: { type: 'vector', elementType: testObjType },
        value: [
            new Map<string, USSRawValue>([['u', 101], ['v', 202]]),
            new Map<string, USSRawValue>([['u', 301], ['v', 402]]),
        ],
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('objs.u'), emptyCtx),
        { type: numVectorType, value: [101, 301] },
    )
    env.set('objs2', {
        type: { type: 'vector', elementType: { type: 'vector', elementType: testObjType } },
        value: [
            [
                new Map<string, USSRawValue>([['u', 101], ['v', 202]]),
                new Map<string, USSRawValue>([['u', 301], ['v', 402]]),
            ],
            [
                new Map<string, USSRawValue>([['u', 501], ['v', 602]]),
                new Map<string, USSRawValue>([['u', 701], ['v', 802]]),
            ],
        ],
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('objs2.u'), emptyCtx),
        { type: { type: 'vector', elementType: numVectorType }, value: [[101, 301], [501, 701]] },
    )
})

void test('evaluate function calls', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    env.set('x', { type: numVectorType, value: [1, 2, 3] })
    env.set('testFn1', { type: testFnType, value: testFn1 })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFn1(2, a=3)'), emptyCtx),
        { type: numType, value: 2 * 2 + 3 },
    )
    env.set('testFns', { type: { type: 'vector', elementType: testFnType }, value: [testFn1, testFn2] })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFns(2, a=3)'), emptyCtx),
        { type: numVectorType, value: [2 * 2 + 3, 2 * 2 * 2 + 3] },
    )
    env.set('testFns', { type: { type: 'vector', elementType: testFnType }, value: [testFn1, testFn2, testFn1] })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFns(2, a=x)'), emptyCtx),
        { type: numVectorType, value: [2 * 2 + 1, 2 * 2 * 2 + 2, 2 * 2 + 3] }, // x is [1, 2, 3], so the last one is 2 * 2 + 3
    )
    env.set('testFnMultiArg', { type: multiArgFnType, value: testFnMultiArg })
    env.set('obj', {
        type: testObjType,
        value: new Map<string, USSRawValue>([['u', 401], ['v', 502]]),
    })
    env.set('y', { type: numVectorType, value: [1, 2, 3] })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=obj)'), emptyCtx),
        {
            type: numVectorType,
            value: [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 401, 502],
        },
    )
    env.set('objs', {
        type: {
            type: 'object',
            properties: {
                u: numType,
                v: numVectorType,
            },
        } satisfies USSType,
        value: new Map<string, USSRawValue>([
            ['u', 100],
            ['v', [200, 300]],
        ]),
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objs)'), emptyCtx),
        {
            type: numMatrixType,
            value: [
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 300],
            ],
        },
    )
})
