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

// void test('evaluate if expressions', (): void => {
//     const env = new Map<string, USSValue>()
//     const emptyCtx: Context = testingContext([], [], env)
//     env.set('x', { type: numType, value: 3 })
//     assert.deepStrictEqual(
//         evaluate(parseExpr('if (x > 2) { 1 } else { 2 }'), emptyCtx),
//         { type: numType, value: 1 },
//     )
//     assert.deepStrictEqual(
//         evaluate(parseExpr('if (x < 2) { 1 } else { 2 }'), emptyCtx),
//         { type: numType, value: 2 },
//     )
// })
