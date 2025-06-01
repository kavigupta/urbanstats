import assert from 'assert/strict'
import { test } from 'node:test'

import { broadcastApply, locateType } from '../src/urban-stats-script/forward-broadcasting'
import { Context } from '../src/urban-stats-script/interpreter'
import { USSRawValue, renderType } from '../src/urban-stats-script/types-values'

import { multiObjType, multiObjVectorType, numMatrixType, numType, numVectorType, testFn1, testFn2, testFnType } from './urban-stats-script-utils'

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
            t => renderType(t) === renderType({ type: 'object', properties: new Map([['a', numType], ['b', numType]]) }),
            'object with properties {a: number, b: number}',
        ),
        {
            type: 'success',
            result: [
                [3],
                { type: 'object', properties: new Map([['a', numType], ['b', numType]]) },
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
            t => renderType(t) === renderType({ type: 'object', properties: new Map([['a', numType], ['b', numType]]) }),
            'object with properties {a: number, b: number}',
        ),
        {
            type: 'success',
            result: [
                [2, 3],
                { type: 'object', properties: new Map([['a', numType], ['b', numType]]) },
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
