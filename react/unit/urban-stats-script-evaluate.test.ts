import assert from 'assert/strict'
import { test } from 'node:test'

import { Context, evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { USSRawValue, USSType, USSValue } from '../src/urban-stats-script/types-values'

import { boolType, multiArgFnType, numMatrixType, numType, numVectorType, parseExpr, stringType, testFn1, testFn2, testFnMultiArg, testFnType, testingContext, testObjType } from './urban-stats-script-utils'

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
    assert.deepStrictEqual(
        evaluate(parseExpr('2 ** -10'), emptyCtx),
        { type: numType, value: 1 / 1024 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('-2 ** 10'), emptyCtx),
        { type: numType, value: -1024 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 > 3'), emptyCtx),
        { type: boolType, value: false },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('12 > 3'), emptyCtx),
        { type: boolType, value: true },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"12" > "3"'), emptyCtx),
        { type: boolType, value: false },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"abc" + "def"'), emptyCtx),
        { type: stringType, value: 'abcdef' },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"abc" + "def" + "ghi"'), emptyCtx),
        { type: stringType, value: 'abcdefghi' },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 3 > 4'), emptyCtx),
        { type: boolType, value: true },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 3 > 4 & 5 < 6'), emptyCtx),
        { type: boolType, value: true },
    )
    assert.throws(
        () => evaluate(parseExpr('2(3)'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected function to be a function (or vector thereof) but got number at 1:1-4'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('2 + "3"'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid types for operator +: number and string at 1:1-7'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('+ "2"'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid type for operator +: string at 1:1-5'
        },
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
    env.set('z', { type: numVectorType, value: [10, 20, 30, 40] })
    assert.throws(
        () => evaluate(parseExpr('y + z'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Incompatibility between the shape of positional argument 2 (4) and the shape of positional argument 1 (2, 3) at 1:1-5'
        },
    )
    env.set('s', { type: { type: 'vector', elementType: stringType }, value: ['hello'] })
    assert.throws(
        () => evaluate(parseExpr('+ s'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid type for operator +: string at 1:1-3'
        },
    )
    env.set('obj', {
        type: testObjType,
        value: new Map<string, USSRawValue>([['u', 401], ['v', 502]]),
    })
    assert.throws(
        () => evaluate(parseExpr('obj + 1'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected positional argument 1 to be a any (or vector thereof) but got {u: number, v: number} at 1:1-7'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('+ obj'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected positional argument 1 to be a any (or vector thereof) but got {u: number, v: number} at 1:1-5'
        },
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
            return err instanceof InterpretationError && err.message === 'Attribute x not found in object of type {u: number, v: number} at 1:1-5'
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
    assert.throws(
        () => evaluate(parseExpr('objs2.a'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Attribute a not found in object of type [[{u: number, v: number}]] at 1:1-7'
        },
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
            properties: new Map<string, USSType>([
                ['u', numType],
                ['v', numVectorType],
            ]),
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
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={u: 100, v: [200, 300]})'), emptyCtx),
        {
            type: numMatrixType,
            value: [
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 300],
            ],
        },
    )
    assert.throws(
        () => evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={u: 100, v: []})'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Cannot broadcast object property v because its type is an empty vector with no inferred type at 1:1-44'
        },
    )
    env.set('objsBoth', {
        type: {
            type: 'object',
            properties: new Map<string, USSType>([
                ['u', numVectorType],
                ['v', numVectorType],
            ]),
        } satisfies USSType,
        value: new Map<string, USSRawValue>([
            ['u', [100, 101]],
            ['v', [200, 300]],
        ]),
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objsBoth)'), emptyCtx),
        {
            type: numMatrixType,
            value: [
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 101, 300],
            ],
        },
    )
    env.set('objsBothRagged', {
        type: {
            type: 'object',
            properties: new Map<string, USSType>([
                ['u', numVectorType],
                ['v', numVectorType],
            ]),
        } satisfies USSType,
        value: new Map<string, USSRawValue>([
            ['u', [100, 101]],
            ['v', [200]],
        ]),
    })
    assert.throws(
        () => evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objsBothRagged)'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Object properties u, v have different lengths (2, 1), cannot be broadcasted at 1:1-43'
        },
    )
})

void test('evaluate if expressions', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    env.set('x', { type: numType, value: 3 })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (x > 2) { 1 } else { 2 }'), emptyCtx),
        { type: numType, value: 1 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (x < 2) { 1 } else { 2 }'), emptyCtx),
        { type: numType, value: 2 },
    )
    env.set('xs', { type: numVectorType, value: [1, 2, 3, 4, 5, 6] })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { xs + 1 } else { xs - 2 }'), emptyCtx),
        { type: numVectorType, value: [2, 3, 1, 2, 3, 4] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { xs + 1 }'), emptyCtx),
        { type: numVectorType, value: [2, 3, 0, 0, 0, 0] },
    )
    assert.throws(
        () => evaluate(parseExpr('if (xs) { ys = xs + 1 } else { ys = xs - 2 }'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Condition in if statement must be a boolean, but got number at 1:5-6'
        },
    )
})

void test('evaluate if expressions mutations', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    emptyCtx.variables.set('xs', { type: numVectorType, value: [1, 2, 3, 4, 5, 6] })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { ys = xs + 1 } else { ys = xs - 2 }'), emptyCtx),
        { type: numVectorType, value: [2, 3, 1, 2, 3, 4] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('ys'), emptyCtx),
        { type: numVectorType, value: [2, 3, 1, 2, 3, 4] },
    )
    emptyCtx.variables.set('ys', { type: numVectorType, value: [100, 200, 300, 400, 500, 600] })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { ys = xs + 1 }'), emptyCtx),
        { type: numVectorType, value: [2, 3, 0, 0, 0, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('ys'), emptyCtx),
        { type: numVectorType, value: [2, 3, 300, 400, 500, 600] }, // ys is mutated only for the first two elements
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { zs = xs + 1 }'), emptyCtx),
        { type: numVectorType, value: [2, 3, 0, 0, 0, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('zs'), emptyCtx),
        { type: numVectorType, value: [2, 3, 0, 0, 0, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { as = xs + 1; bs = as ** 2 }'), emptyCtx),
        { type: numVectorType, value: [4, 9, 0, 0, 0, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('as'), emptyCtx),
        { type: numVectorType, value: [2, 3, 0, 0, 0, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('bs'), emptyCtx),
        { type: numVectorType, value: [4, 9, 0, 0, 0, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (0 == 1) { 2 }'), emptyCtx),
        { type: { type: 'null' }, value: null },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (1 == 1) { }'), emptyCtx),
        { type: { type: 'null' }, value: null },
    )
    assert.throws(
        () => evaluate(parseExpr('2 + (if (1 == 1) { })() + 3'), emptyCtx),
        function (err: Error): boolean {
            return err instanceof InterpretationError && err.message === 'Expected function to be a function (or vector thereof) but got null at 1:6-23'
        },
    )
})

void test('evaluate objects', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2 }'), emptyCtx),
        {
            type: { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType]]) },
            value: new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2, c: "hello" }'), emptyCtx),
        {
            type: { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType], ['c', stringType]]) },
            value: new Map<string, USSRawValue>([['a', 1], ['b', 2], ['c', 'hello']]),
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{}'), emptyCtx),
        {
            type: {
                type: 'object',
                properties: new Map<string, USSType>([
                ]),
            },
            value: new Map<string, USSRawValue>(),
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2, c: "hello", d: { e: 3 } }'), emptyCtx),
        {
            type: {
                type: 'object',
                properties: new Map<string, USSType>([
                    ['a', numType],
                    ['b', numType],
                    ['c', stringType],
                    ['d', { type: 'object', properties: new Map<string, USSType>([['e', numType]]) }],
                ]),
            },
            value: new Map<string, USSRawValue>([
                ['a', 1],
                ['b', 2],
                ['c', 'hello'],
                ['d', new Map<string, USSRawValue>([['e', 3]])],
            ]),
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{a: 1, b: 2}.a'), emptyCtx),
        { type: numType, value: 1 },
    )
    assert.throws(
        () => evaluate(parseExpr('if ({a: 1, b: 2}) {}'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Conditional mask must be a vector of numbers, strings, or booleans, but got {a: number, b: number} at 1:1-20'
        },
    )
})

void test('evaluate vectors', (): void => {
    const env = new Map<string, USSValue>()
    const emptyCtx: Context = testingContext([], [], env)
    // assert.deepStrictEqual(
    //     evaluate(parseExpr('[1, 2]'), emptyCtx),
    //     { type: numVectorType, value: [1, 2] },
    // )
    assert.deepStrictEqual(
        evaluate(parseExpr('[]'), emptyCtx),
        { type: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }, value: [] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[]]'), emptyCtx),
        { type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } }, value: [[]] },
    )
    assert.throws(
        () => evaluate(parseExpr('[1, [2, 3]]'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'vector literal contains heterogenous types number and [number] at 1:1-11'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 2, 3], [4]]'), emptyCtx),
        { type: numMatrixType, value: [[1, 2, 3], [4]] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 2, 3], []]'), emptyCtx),
        { type: numMatrixType, value: [[1, 2, 3], []] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[[1, 2, 3]], []]'), emptyCtx),
        { type: { type: 'vector', elementType: numMatrixType }, value: [[[1, 2, 3]], []] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[], []]'), emptyCtx),
        { type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } }, value: [[], []] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[], [[]]]'), emptyCtx),
        {
            type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } } },
            value: [[], [[]]],
        },
    )
    assert.throws(
        () => evaluate(parseExpr('[] + [1]'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'positional argument 1 is an empty vector whose type cannot be inferred at 1:1-8'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{a: []}.a'), emptyCtx),
        { type: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }, value: [] },
    )
    assert.throws(
        () => evaluate(parseExpr('[{a: []}, {b: [1]}]'), emptyCtx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'vector literal contains heterogenous types {a: []} and {b: [number]} at 1:1-19'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[{a: []}, {a: [1]}]'), emptyCtx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['a', { type: 'vector', elementType: { type: 'number' } }]]) } },
            value: [
                new Map<string, USSRawValue>([['a', []]]),
                new Map<string, USSRawValue>([['a', [1]]]),
            ],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[{a: []}, {a: []}]'), emptyCtx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['a', { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }]]) } },
            value: [
                new Map<string, USSRawValue>([['a', []]]),
                new Map<string, USSRawValue>([['a', []]]),
            ],
        },
    )
})
