import assert from 'assert/strict'
import { test } from 'node:test'

import { Context } from '../src/urban-stats-script/context'
import { broadcastApply, locateType } from '../src/urban-stats-script/forward-broadcasting'
import { LocInfo } from '../src/urban-stats-script/location'
import { USSRawValue, USSType, renderType, undocValue } from '../src/urban-stats-script/types-values'

import { emptyContext, multiObjType, multiObjVectorType, numMatrixType, numType, numVectorType, stringType, testFn1, testFn2, testFnType } from './urban-stats-script-utils'

void test('broadcasting-locate-type', (): void => {
    assert.deepStrictEqual(
        locateType(
            // { type: numType, value: 1 },
            undocValue(1, numType),
            t => t.type === 'number',
            { typeDesc: 'number', role: 'test' },
        ),
        { type: 'success', result: [[], numType, 1] },
    )
    assert.deepStrictEqual(
        locateType(
            undocValue([1, 2, 3], numVectorType),
            t => t.type === 'number',
            { typeDesc: 'number', role: 'test' },
        ),
        { type: 'success', result: [[3], numType, [1, 2, 3]] },
    )
    assert.deepStrictEqual(
        locateType(
            undocValue([[1, 2], [3, 4]], numMatrixType),
            t => t.type === 'number',
            { typeDesc: 'number', role: 'test' },
        ),
        { type: 'success', result: [[2, 2], numType, [[1, 2], [3, 4]]] },
    )
    assert.deepStrictEqual(
        locateType(
            undocValue([[1, 2], [3, 4]], numMatrixType),
            t => t.type === 'vector' && t.elementType.type === 'number',
            { typeDesc: '[number]', role: 'test' },
        ),
        { type: 'success', result: [[2], numVectorType, [[1, 2], [3, 4]]] },
    )
    assert.deepStrictEqual(
        locateType(
            undocValue(new Map<string, USSRawValue>([['a', 1], ['b', [1, 2, 3]]]), multiObjType),
            t => t.type === 'number',
            { typeDesc: 'number', role: 'test' },
        ),
        { type: 'error', message: 'Expected test to be a number (or vector thereof) but got {a: number, b: number}' },
    )
    assert.deepStrictEqual(
        locateType(
            undocValue(new Map<string, USSRawValue>([['a', 1], ['b', [1, 2, 3]]]), multiObjType),
            t => renderType(t) === renderType({ type: 'object', properties: new Map([['a', numType], ['b', numType]]) }),
            { typeDesc: 'object with properties {a: number, b: number}', role: 'test' },
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
            undocValue([
                new Map<string, USSRawValue>([['a', 1], ['b', [1, 2, 3]]]),
                new Map<string, USSRawValue>([['a', 6], ['b', [4, 5, 6]]]),
            ], multiObjVectorType),
            t => renderType(t) === renderType({ type: 'object', properties: new Map([['a', numType], ['b', numType]]) }),
            { typeDesc: 'object with properties {a: number, b: number}', role: 'test' },
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
    const locInfo: LocInfo = {
        start: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
        end: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
    }
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue(10, numType),
            ],
            [
                ['a', undocValue(3, numType)],
            ],
            emptyContext(),
            locInfo,
        ),
        { type: 'success', result: undocValue(10 * 10 + 3, numType) },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([10, 20, 30], numVectorType),
            ],
            [
                ['a', undocValue(3, numType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'success',
            result: undocValue([10 * 10 + 3, 20 * 20 + 3, 30 * 30 + 3], numVectorType),
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([[10, 20], [30, 40]], numMatrixType),
            ],
            [
                ['a', undocValue(3, numType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'success',
            result: undocValue([[10 * 10 + 3, 20 * 20 + 3], [30 * 30 + 3, 40 * 40 + 3]], numMatrixType),
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([[10, 20], [30, 40]], numMatrixType),
            ],
            [
                ['a', undocValue([3, 4], numVectorType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'success',
            result: undocValue([[10 * 10 + 3, 20 * 20 + 4], [30 * 30 + 3, 40 * 40 + 4]], numMatrixType),
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue([testFn1, testFn2], { type: 'vector', elementType: testFnType }),
            [
                undocValue([[10, 20], [30, 40]], numMatrixType),
            ],
            [
                ['a', undocValue([3, 4], numVectorType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'success',
            result: undocValue([[10 * 10 + 3, 20 * 20 * 20 + 4], [30 * 30 + 3, 40 * 40 * 40 + 4]], numMatrixType),
        },
    )
})

void test('jagged array', (): void => {
    const locInfo: LocInfo = {
        start: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
        end: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
    }
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn2, testFnType),
            [
                undocValue([[10], [10, 20]], numMatrixType),
            ],
            [
                ['a', undocValue(3, numType)],
            ],
            emptyContext(),
            locInfo,
        ),
        { type: 'error', message: 'Jagged vector (nested vector where not all are the same length) cannot be broadcasted' },
    )
    const takesArray = { type: 'function', posArgs: [{ type: 'concrete', value: numVectorType }], namedArgs: {}, returnType: { type: 'concrete', value: numType } } satisfies USSType
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- To match the type signature
    const fn = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const arr = posArgs[0] as number[]
        return arr.reduce((acc, val) => acc + val, 0)
    }
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(fn, takesArray),
            [
                undocValue([[10], [10, 20]], numMatrixType),
            ],
            [],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'success',
            result: undocValue([10, 30], numVectorType),
        },
    )
})

void test('wrong number of arguments', (): void => {
    const locInfo: LocInfo = {
        start: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
        end: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
    }
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [],
            [],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Function expects 1 positional arguments, but received 0',
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([10, 20, 30], numVectorType),
            ],
            [
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Function expects named argument a, but it was not provided',
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([10, 20, 30], numVectorType),
            ],
            [
                ['a', undocValue(3, numType)],
                ['b', undocValue(4, numType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Function does not expect named argument b, but it was provided',
        },
    )
})

void test('wrong argument type', (): void => {
    const locInfo: LocInfo = {
        start: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
        end: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
    }
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue('hi', stringType),
            ],
            [
                ['a', undocValue([[1, 2], [3, 4]], numMatrixType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Expected positional argument 1 to be a number (or vector thereof) but got string',
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue(['hi'], { type: 'vector', elementType: stringType }),
            ],
            [
                ['a', undocValue([[1, 2], [3, 4]], numMatrixType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Expected positional argument 1 to be a number (or vector thereof) but got string',
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([10, 20, 30], numVectorType),
            ],
            [
                ['a', undocValue('hi', stringType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Expected named argument a to be a number (or vector thereof) but got string',
        },
    )
})

void test('bad-shape-broadcasting', (): void => {
    const locInfo: LocInfo = {
        start: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
        end: { block: { type: 'single', ident: 'test' }, lineIdx: 1, colIdx: 1, charIdx: 1 },
    }
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([10, 20, 30], numVectorType),
            ],
            [
                ['a', undocValue([1, 2], numVectorType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Incompatibility between the shape of named argument a (2) and the shape of positional argument 1 (3)',
        },
    )
    assert.deepStrictEqual(
        broadcastApply(
            undocValue(testFn1, testFnType),
            [
                undocValue([[10, 20, 3], [30, 40, 4]], numMatrixType),
            ],
            [
                ['a', undocValue([1, 2], numVectorType)],
            ],
            emptyContext(),
            locInfo,
        ),
        {
            type: 'error',
            message: 'Incompatibility between the shape of named argument a (2) and the shape of positional argument 1 (2, 3)',
        },
    )
})
