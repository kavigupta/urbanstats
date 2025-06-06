import assert from 'assert/strict'
import { test } from 'node:test'

import { Context } from '../src/urban-stats-script/context'
import { LocInfo } from '../src/urban-stats-script/lexer'
import { indexMask, mergeValuesViaMasks, splitMask } from '../src/urban-stats-script/split-broadcasting'
import { USSRawValue, USSType, USSValue } from '../src/urban-stats-script/types-values'

import { numMatrixType, numType, numVectorType, testingContext } from './urban-stats-script-utils'

void test('index mask', (): void => {
    // vector/vector
    assert.deepStrictEqual(
        indexMask(
            {
                type: numVectorType,
                value: [100, 200, 300],
            },
            {
                type: numVectorType,
                value: [2, 2, 3],
            },
            2,
        ),
        { type: 'success', value: { type: numVectorType, value: [100, 200] } },
    )
    // only first dimension
    assert.deepStrictEqual(
        indexMask(
            {
                type: numMatrixType,
                value: [[100, 200, 300], [400, 500, 600]],
            },
            {
                type: numVectorType,
                value: [2, 4],
            },
            2,
        ),
        { type: 'success', value: { type: numMatrixType, value: [[100, 200, 300]] } },
    )
    // matrix / matrix indexing -> vector
    assert.deepStrictEqual(
        indexMask(
            {
                type: numMatrixType,
                value: [[100, 200, 300], [400, 500, 600]],
            },
            {
                type: numMatrixType,
                value: [[2, 2, 3], [4, 2, 5]],
            },
            2,
        ),
        { type: 'success', value: { type: numVectorType, value: [100, 200, 500] } },
    )
    // automatically expand number to vector
    assert.deepStrictEqual(
        indexMask(
            {
                type: numType,
                value: 100,
            },
            {
                type: numVectorType,
                value: [2, 2, 3],
            },
            2,
        ),
        { type: 'success', value: { type: numVectorType, value: [100, 100] } },
    )
    // empty mask
    assert.deepStrictEqual(
        indexMask(
            {
                type: numVectorType,
                value: [100, 200, 300],
            },
            {
                type: numVectorType,
                value: [2, 2, 3],
            },
            0,
        ),
        { type: 'success', value: { type: numVectorType, value: [] } },
    )
})

void test('merge values via masks', (): void => {
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numVectorType, value: [100, 200, 300] },
                { type: numVectorType, value: [600, 700] },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: numVectorType, value: [100, 200, 600, 300, 700] } },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numVectorType, value: [100, 200, 300] },
                { type: numType, value: 1 },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: numVectorType, value: [100, 200, 1, 300, 1] } },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numType, value: 2 },
                { type: numType, value: 1 },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: numVectorType, value: [2, 2, 1, 2, 1] } },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numMatrixType, value: [[100], [200], [300]] },
                { type: numMatrixType, value: [[600], [700]] },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: numMatrixType, value: [[100], [200], [600], [300], [700]] } },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numMatrixType, value: [[100], [200], [300]] },
                { type: numMatrixType, value: [[600], [700]] },
            ],
            {
                type: numMatrixType,
                value: [[2], [2], [3], [2], [3]],
            },
            [2, 3],
        ),
        { type: 'error', message: 'Cannot condition on a mask of type [[number]]' },
    )
    const stringVectorType = { type: 'vector', elementType: { type: 'string' } } satisfies USSType
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numVectorType, value: [100, 200, 300] },
                { type: stringVectorType, value: ['hi', 'bye'] },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'error', message: 'Cannot merge values of different types: number, string' },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: stringVectorType, value: ['a', 'b', 'c'] },
                { type: stringVectorType, value: ['x', 'y'] },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: stringVectorType, value: ['a', 'b', 'x', 'c', 'y'] } },
    )
    const nullValue: USSValue = { type: { type: 'null' }, value: null } satisfies USSValue
    // default values
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                { type: numVectorType, value: [100, 200, 300] },
                nullValue,
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: numVectorType, value: [100, 200, 0, 300, 0] } },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [
                nullValue,
                { type: stringVectorType, value: ['hi', 'bye'] },
            ],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: { type: stringVectorType, value: ['', '', 'hi', '', 'bye'] } },
    )
    assert.deepStrictEqual(
        mergeValuesViaMasks(
            [nullValue, nullValue],
            {
                type: numVectorType,
                value: [2, 2, 3, 2, 3],
            },
            [2, 3],
        ),
        { type: 'success', value: nullValue },
    )
})

void test('split mask testing', (): void => {
    const lengthFn = (value: USSValue, ctx: Context): USSValue => {
        return { type: numType, value: (ctx.getVariable('a')!.value as USSRawValue[]).length }
    }
    const basicContext = (): Context => testingContext([], [], new Map(
        [
            ['a', { type: numVectorType, value: [100, 100, 200, 300, 400, 200, 200, 100, 100] }],
            ['b', { type: numVectorType, value: [10, 30, 60, 20, 20, 10, 104, 389, 10] }],
        ],
    ))
    const defaultLocInfo = { start: { lineIdx: 1, colIdx: 1 }, end: { lineIdx: 1, colIdx: 1 } } satisfies LocInfo
    // basic mask testing
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            {
                type: numVectorType,
                value: [100, 100, 100, 200, 200, 100, 100, 200, 200],
            },
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        { type: numVectorType, value: [5, 5, 5, 4, 4, 5, 5, 4, 4] },
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            {
                type: numType,
                value: 2,
            },
            (value: USSValue, ctx: Context): USSValue => {
                return { type: numType, value: (ctx.getVariable('a')!.value as USSRawValue[]).length }
            },
            defaultLocInfo,
            defaultLocInfo,
        ),
        { type: numType, value: 9 } satisfies USSValue,
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            {
                type: numVectorType,
                value: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            },
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        { type: numVectorType, value: [1, 1, 1, 1, 1, 1, 1, 1, 1] } satisfies USSValue,
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            {
                type: numVectorType,
                value: [1, 2, 3, 1, 5, 1, 7, 8, 2],
            },
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        { type: numVectorType, value: [3, 2, 1, 3, 1, 3, 1, 1, 2] } satisfies USSValue,
    )
    assert.deepStrictEqual(
        splitMask(
            basicContext(),
            {
                type: numVectorType,
                value: [1, 1, 1, 1, 1, 1, 1, 1, 1],
            },
            lengthFn,
            defaultLocInfo,
            defaultLocInfo,
        ),
        { type: numType, value: 9 } satisfies USSValue,
    )
})
