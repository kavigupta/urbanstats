import * as assert from 'assert/strict'
import { test } from 'node:test'

import { Context } from '../src/urban-stats-script/context'
import { newLocation } from '../src/urban-stats-script/lexer'
import { indexMask, mergeValuesViaMasks, splitMask } from '../src/urban-stats-script/split-broadcasting'
import { USSRawValue, USSType, USSValue, USSVectorType, undocValue } from '../src/urban-stats-script/types-values'

import { numMatrixType, numType, numVectorType, testingContext } from './urban-stats-script-utils'

void test('index mask', (): void => {
    // vector/vector
    assert.deepStrictEqual(
        indexMask(
            undocValue([100, 200, 300], numVectorType),
            undocValue([2, 2, 3], numVectorType),
            2,
        ),
        { type: 'success', value: undocValue([100, 200], numVectorType) },
    )
    // only first dimension
    assert.deepStrictEqual(
        indexMask(
            undocValue([[100, 200, 300], [400, 500, 600]], numMatrixType),
            undocValue([2, 4], numVectorType),
            2,
        ),
        { type: 'success', value: undocValue([[100, 200, 300]], numMatrixType) },
    )
    // matrix / matrix indexing -> vector
    assert.deepStrictEqual(
        indexMask(
            undocValue([[100, 200, 300], [400, 500, 600]], numMatrixType),
            undocValue([[2, 2, 3], [4, 2, 5]], numMatrixType),
            2,
        ),
        { type: 'success', value: undocValue([100, 200, 500], numVectorType) },
    )
    // automatically expand number to vector
    assert.deepStrictEqual(
        indexMask(
            undocValue(100, numType),
            undocValue([2, 2, 3], numVectorType),
            2,
        ),
        { type: 'success', value: undocValue([100, 100], numVectorType) },
    )
    // empty mask
    assert.deepStrictEqual(
        indexMask(
            undocValue([100, 200, 300], numVectorType),
            undocValue([2, 2, 3], numVectorType),
            0,
        ),
        { type: 'success', value: undocValue([], numVectorType) },
    )
})

void test('merge values via masks', (): void => {
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue([100, 200, 300], numVectorType),
                undocValue([600, 700], numVectorType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue([100, 200, 600, 300, 700], numVectorType) },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue([100, 200, 300], numVectorType),
                undocValue(1, numType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue([100, 200, 1, 300, 1], numVectorType) },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue(2, numType),
                undocValue(1, numType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue([2, 2, 1, 2, 1], numVectorType) },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue([[100], [200], [300]], numMatrixType),
                undocValue([[600], [700]], numMatrixType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue([[100], [200], [600], [300], [700]], numMatrixType) },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue([[100], [200], [300]], numMatrixType),
                undocValue([[600], [700]], numMatrixType),
            ],
            undocValue([[2], [2], [3], [2], [3]], numMatrixType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'error', message: 'Cannot condition on a mask of type [[number]]' },
    )
    const stringVectorType = { type: 'vector', elementType: { type: 'string' } } satisfies USSType
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue([100, 200, 300], numVectorType),
                undocValue(['hi', 'bye'], stringVectorType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'error', message: 'Cannot merge values of different types: number, string' },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue(['a', 'b', 'c'], stringVectorType),
                undocValue(['x', 'y'], stringVectorType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue(['a', 'b', 'x', 'c', 'y'], stringVectorType) },
    )
    const nullValue: USSValue = undocValue(null, { type: 'null' })
    // default values
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                undocValue([100, 200, 300], numVectorType),
                nullValue,
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue([100, 200, NaN, 300, NaN], numVectorType) },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                nullValue,
                undocValue(['hi', 'bye'], stringVectorType),
            ],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: undocValue(['', '', 'hi', '', 'bye'], stringVectorType) },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [nullValue, nullValue],
            undocValue([2, 2, 3, 2, 3], numVectorType) as USSValue & { type: USSVectorType },
            [2, 3],
        ),
        { type: 'success', value: nullValue },
    )
})

void test('split mask testing', (): void => {
    const lengthFn = (value: USSValue, ctx: Context): USSValue => {
        return undocValue((ctx.getVariable('a')!.value as USSRawValue[]).length, numType)
    }
    const basicContext = (): Context => testingContext([], [], new Map(
        [
            ['a', undocValue([100, 100, 200, 300, 400, 200, 200, 100, 100], numVectorType)],
            ['b', undocValue([10, 30, 60, 20, 20, 10, 104, 389, 10], numVectorType)],
        ],
    ))
    const defaultLocInfo = newLocation({ start: { lineIdx: 1, colIdx: 1 }, end: { lineIdx: 1, colIdx: 1 } })
    // basic mask testing
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            undocValue([100, 100, 100, 200, 200, 100, 100, 200, 200], numVectorType),
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        undocValue([5, 5, 5, 4, 4, 5, 5, 4, 4], numVectorType),
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            undocValue(2, numType),
            (value: USSValue, ctx: Context): USSValue => {
                return undocValue((ctx.getVariable('a')!.value as USSRawValue[]).length, numType)
            },
            defaultLocInfo,
            defaultLocInfo,
        ),
        undocValue(9, numType),
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            undocValue([1, 2, 3, 4, 5, 6, 7, 8, 9], numVectorType),
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        undocValue([1, 1, 1, 1, 1, 1, 1, 1, 1], numVectorType),
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            undocValue([1, 2, 3, 1, 5, 1, 7, 8, 2], numVectorType),
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        undocValue([3, 2, 1, 3, 1, 3, 1, 1, 2], numVectorType),
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            undocValue([1, 1, 1, 1, 1, 1, 1, 1, 1], numVectorType),
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        undocValue(9, numType),
    )
})
