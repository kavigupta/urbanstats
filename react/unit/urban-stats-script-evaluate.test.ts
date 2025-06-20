import assert from 'assert/strict'
import { test } from 'node:test'

import { colorType } from '../src/urban-stats-script/constants/color'
import { CMap } from '../src/urban-stats-script/constants/map'
import { regressionType, regressionResultType } from '../src/urban-stats-script/constants/regr'
import { ScaleInstance } from '../src/urban-stats-script/constants/scale'
import { Context } from '../src/urban-stats-script/context'
import { getFunction } from '../src/urban-stats-script/function-registry'
import { evaluate, execute, InterpretationError } from '../src/urban-stats-script/interpreter'
import { renderType, USSRawValue, USSType, USSValue, renderValue } from '../src/urban-stats-script/types-values'

import { boolType, emptyContext, multiArgFnType, numMatrixType, numType, numVectorType, parseExpr, parseProgram, stringType, testFn1, testFn2, testFnMultiArg, testFnType, testFnTypeWithDefault, testFnWithDefault, testingContext, testObjType } from './urban-stats-script-utils'

void test('evaluate basic expressions', (): void => {
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 2'), emptyContext()),
        { type: numType, value: 4 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4'), emptyContext()),
        { type: numType, value: 10 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5'), emptyContext()),
        { type: numType, value: 26 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5 + 6 ** 2'), emptyContext()),
        { type: numType, value: 62 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5 + 6 ** 2 - 7'), emptyContext()),
        { type: numType, value: 55 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 ** -10'), emptyContext()),
        { type: numType, value: 1 / 1024 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('-2 ** 10'), emptyContext()),
        { type: numType, value: -1024 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 > 3'), emptyContext()),
        { type: boolType, value: false },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('12 > 3'), emptyContext()),
        { type: boolType, value: true },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"12" > "3"'), emptyContext()),
        { type: boolType, value: false },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"abc" + "def"'), emptyContext()),
        { type: stringType, value: 'abcdef' },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"abc" + "def" + "ghi"'), emptyContext()),
        { type: stringType, value: 'abcdefghi' },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 3 > 4'), emptyContext()),
        { type: boolType, value: true },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 3 > 4 & 5 < 6'), emptyContext()),
        { type: boolType, value: true },
    )
    assert.throws(
        () => evaluate(parseExpr('2(3)'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected function to be a function (or vector thereof) but got number at 1:1-4'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('2 + "3"'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid types for operator +: number and string at 1:1-7'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('+ "2"'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid type for operator +: string at 1:1-5'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('+ (if (1 == 0) {})'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid type for operator +: null at 1:1-17'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 1, 2, 2, 3, 3]] + 1'), emptyContext()),
        { type: numMatrixType, value: [[2, 2, 3, 3, 4, 4]] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 1, 2, 2, 3, 3]] == 1'), emptyContext()),
        { type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'boolean' } } }, value: [[true, true, false, false, false, false]] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[min, max, sum, mean, median]([1, 2, 3, 5, 6, 70])'), emptyContext()),
        { type: { type: 'vector', elementType: numType }, value: [1, 70, 87, 14.5, 4] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('min([[1], []])'), emptyContext()),
        { type: { type: 'vector', elementType: numType }, value: [1, Infinity] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('max([[1], []])'), emptyContext()),
        { type: { type: 'vector', elementType: numType }, value: [1, -Infinity] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('sum([[1], []])'), emptyContext()),
        { type: { type: 'vector', elementType: numType }, value: [1, 0] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('mean([[1], []])'), emptyContext()),
        { type: { type: 'vector', elementType: numType }, value: [1, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('median([[1], []])'), emptyContext()),
        { type: { type: 'vector', elementType: numType }, value: [1, NaN] },
    )
})

void test('evaluate basic variable expressions', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('x', { type: numVectorType, value: [1, 2, 3] })
    assert.deepStrictEqual(
        evaluate(parseExpr('x + 1'), ctx),
        { type: numVectorType, value: [2, 3, 4] },
    )
    ctx.assignVariable('y', { type: numMatrixType, value: [[10, 20, 30], [40, 50, 60]] })
    assert.deepStrictEqual(
        evaluate(parseExpr('y + x'), ctx),
        { type: numMatrixType, value: [[11, 22, 33], [41, 52, 63]] },
    )
    ctx.assignVariable('z', { type: numVectorType, value: [10, 20, 30, 40] })
    assert.throws(
        () => evaluate(parseExpr('y + z'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Incompatibility between the shape of positional argument 2 (4) and the shape of positional argument 1 (2, 3) at 1:1-5'
        },
    )
    ctx.assignVariable('s', { type: { type: 'vector', elementType: stringType }, value: ['hello'] })
    assert.throws(
        () => evaluate(parseExpr('+ s'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid type for operator +: string at 1:1-3'
        },
    )
    ctx.assignVariable('obj', {
        type: testObjType,
        value: new Map<string, USSRawValue>([['u', 401], ['v', 502]]),
    })
    assert.throws(
        () => evaluate(parseExpr('obj + 1'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected positional argument 1 to be a any (or vector thereof) but got {u: number, v: number} at 1:1-7'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('+ obj'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected positional argument 1 to be a any (or vector thereof) but got {u: number, v: number} at 1:1-5'
        },
    )
})

void test('evaluate attr accesses', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('obj', {
        type: testObjType,
        value: new Map<string, USSRawValue>([['u', 401], ['v', 502]]),
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('obj.u'), ctx),
        { type: numType, value: 401 },
    )

    assert.throws(
        () => evaluate(parseExpr('obj.x'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Attribute x not found in object of type {u: number, v: number} at 1:1-5'
        },
    )
    ctx.assignVariable('objs', {
        type: { type: 'vector', elementType: testObjType },
        value: [
            new Map<string, USSRawValue>([['u', 101], ['v', 202]]),
            new Map<string, USSRawValue>([['u', 301], ['v', 402]]),
        ],
    })
    assert.deepStrictEqual(
        evaluate(parseExpr('objs.u'), ctx),
        { type: numVectorType, value: [101, 301] },
    )
    ctx.assignVariable('objs2', {
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
        evaluate(parseExpr('objs2.u'), ctx),
        { type: { type: 'vector', elementType: numVectorType }, value: [[101, 301], [501, 701]] },
    )
    assert.throws(
        () => evaluate(parseExpr('objs2.a'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Attribute a not found in object of type {u: number, v: number} at 1:1-7'
        },
    )
})

void test('evaluate function calls', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('x', { type: numVectorType, value: [1, 2, 3] })
    ctx.assignVariable('testFn1', { type: testFnType, value: testFn1 })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFn1(2, a=3)'), ctx),
        { type: numType, value: 2 * 2 + 3 },
    )
    ctx.assignVariable('testFns', { type: { type: 'vector', elementType: testFnType }, value: [testFn1, testFn2] })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFns(2, a=3)'), ctx),
        { type: numVectorType, value: [2 * 2 + 3, 2 * 2 * 2 + 3] },
    )
    ctx.assignVariable('testFns', { type: { type: 'vector', elementType: testFnType }, value: [testFn1, testFn2, testFn1] })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFns(2, a=x)'), ctx),
        { type: numVectorType, value: [2 * 2 + 1, 2 * 2 * 2 + 2, 2 * 2 + 3] }, // x is [1, 2, 3], so the last one is 2 * 2 + 3
    )
    ctx.assignVariable('testFnMultiArg', { type: multiArgFnType, value: testFnMultiArg })
    ctx.assignVariable('obj', {
        type: testObjType,
        value: new Map<string, USSRawValue>([['u', 401], ['v', 502]]),
    })
    ctx.assignVariable('y', { type: numVectorType, value: [1, 2, 3] })
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=obj)'), ctx),
        {
            type: numVectorType,
            value: [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 401, 502],
        },
    )
    assert.deepStrictEqual(
        // backwards obj
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={v: 502, u: 401})'), ctx),
        {
            type: numVectorType,
            value: [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 401, 502],
        },
    )
    ctx.assignVariable('objs', {
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
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objs)'), ctx),
        {
            type: numMatrixType,
            value: [
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 300],
            ],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={u: 100, v: [200, 300]})'), ctx),
        {
            type: numMatrixType,
            value: [
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 300],
            ],
        },
    )
    assert.throws(
        () => evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={u: 100, v: []})'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Cannot broadcast object property v because its type is an empty vector with no inferred type at 1:1-44'
        },
    )
    ctx.assignVariable('objsBoth', {
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
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objsBoth)'), ctx),
        {
            type: numMatrixType,
            value: [
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
                [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 101, 300],
            ],
        },
    )
    ctx.assignVariable('objsBothRagged', {
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
        () => evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objsBothRagged)'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Object properties u, v have different lengths (2, 1), cannot be broadcasted at 1:1-43'
        },
    )
})

void test('evaluate function calls with defaults', (): void => {
    const newCtx: () => Context = (): Context => {
        const ctx: Context = emptyContext()
        ctx.assignVariable('testFnWithDefault', { type: testFnTypeWithDefault, value: testFnWithDefault })
        return ctx
    }
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnWithDefault(100, a=3, b=2)'), newCtx()),
        { type: numType, value: 100 * 100 * 100 + 3 + 10 * 2 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnWithDefault(100, a=3)'), newCtx()),
        { type: numType, value: 100 * 100 * 100 + 3 + 10 * 1 }, // b defaults to 1
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnWithDefault([100, 200, 300], a=3)'), newCtx()),
        { type: numVectorType, value: [100 * 100 * 100 + 3 + 10 * 1, 200 * 200 * 200 + 3 + 10 * 1, 300 * 300 * 300 + 3 + 10 * 1] },
    )
    assert.throws(
        () => evaluate(parseExpr('testFnWithDefault(100, a=3, b=2, c=4)'), newCtx()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Function does not expect named argument c, but it was provided at 1:1-37'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('testFnWithDefault(100, b=2)'), newCtx()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Function expects named argument a, but it was not provided at 1:1-27'
        },
    )
})

void test('evaluate if expressions', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('x', { type: numType, value: 3 })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (x > 2) { 1 } else { 2 }'), ctx),
        { type: numType, value: 1 },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (x < 2) { 1 } else { 2 }'), ctx),
        { type: numType, value: 2 },
    )
    ctx.assignVariable('xs', { type: numVectorType, value: [1, 2, 3, 4, 5, 6] })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { xs + 1 } else { xs - 2 }'), ctx),
        { type: numVectorType, value: [2, 3, 1, 2, 3, 4] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { xs + 1 }'), ctx),
        { type: numVectorType, value: [2, 3, NaN, NaN, NaN, NaN] },
    )
    assert.throws(
        () => evaluate(parseExpr('if (xs) { ys = xs + 1 } else { ys = xs - 2 }'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Condition in if statement must be a boolean, but got number at 1:5-6'
        },
    )
    // test conditioning on []
    assert.throws(
        () => evaluate(parseExpr('if ([]) { 1 } else { 2 }'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Conditional mask must have at least one unique value, but got none at 1:5-6'
        },
    )
    // basic indexing
    const codeWLiteral = `
        x = [1, 2, 3, 4, 5, 6]
        if ([1, 1, 2, 2, 3, 3] == 1) {
            y = x + 1
        }
        y
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWLiteral), ctx),
        { type: numVectorType, value: [2, 3, NaN, NaN, NaN, NaN] },
    )
    // incompatbile sizes
    const codeWIncompatible = `
        x = [1, 2, 3, 4, 5, 6]
        if ([1, 1, 2, 2, 3] == 1) {
            y = x + 1
        }
        y
        `
    assert.throws(
        () => execute(parseProgram(codeWIncompatible), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Conditional error: Error indexing variable x: Mask length 5 does not match value length 6 at 3:13-32'
        },
    )
})

void test('more if expressions', (): void => {
    // same as above but everything is nested
    const codeWNested = `
        x = [[1, 2, 3, 4, 5, 6]]
        if ([[1, 1, 2, 2, 3, 3]] == 1) {
            y = x + 1
        }
        y
        `
    assert.throws(
        () => execute(parseProgram(codeWNested), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Error merging values for variable x: Cannot condition on a mask of type [[boolean]] at 3:9 - 5:10'
        },
    )
    // same as above but the mask's second dimensions don't line up
    const codeWIncompatibleNested = `
        x = [[1, 2, 3, 4, 5, 6]]
        if ([[1, 1, 2, 2, 3]] == 1) {
            y = x + 1
        }
        y
        `
    assert.throws(
        () => execute(parseProgram(codeWIncompatibleNested), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Conditional error: Error indexing variable x: Mask length 5 does not match value length 6 at 3:13-34'
        },
    )
    // does not define y
    const codeWithNull = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = if (1 == 0) { }
        }
        y
        `
    assert.throws(
        () => execute(parseProgram(codeWithNull), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Undefined variable: y at 5:9'
        },
    )
    // does define y as a vector of null
    const codeWithDefinedNull = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = [if (1 == 0) { }, if (1 == 0) { }]
        }
        y
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedNull), emptyContext()),
        { type: { type: 'vector', elementType: { type: 'null' } }, value: [null, null, null, null, null] },
    )
    // define y as a vector of booleans
    const codeWithDefinedBool = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = 1 == 1
        }
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedBool), emptyContext()),
        { type: { type: 'vector', elementType: boolType }, value: [true, true, false, false, false] },
    )
    // define y as a vector of vectors of numbers
    const codeWithDefinedNumVector = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = [[1, 2], [3, 4]]
        }
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedNumVector), emptyContext()),
        { type: numMatrixType, value: [[1, 2], [3, 4], [], [], []] },
    )
    // define y as an object
    const codeWithDefinedObject = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = { a: 1, b: 2 }
        }
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedObject), emptyContext()),
        {
            type: {
                type: 'vector',
                elementType: {
                    type: 'object',
                    properties: new Map<string, USSType>([['a', numType], ['b', numType]]),
                },
            },
            value: [
                new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
                new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
                new Map<string, USSRawValue>([['a', NaN], ['b', NaN]]),
                new Map<string, USSRawValue>([['a', NaN], ['b', NaN]]),
                new Map<string, USSRawValue>([['a', NaN], ['b', NaN]]),
            ],
        },
    )
    {
        // define y as a function
        const codeWithDefinedFunction = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = f
        }
        `
        const result = execute(parseProgram(codeWithDefinedFunction), testingContext([], [], new Map<string, USSValue>([
            ['f', { type: testFnType, value: testFn1 }],
        ])))
        assert.deepStrictEqual(result.type, { type: 'vector', elementType: testFnType })
        const v = result.value as USSRawValue[]
        assert.deepStrictEqual(v[0], testFn1)
        assert.deepStrictEqual(v[1], testFn1)
        assert.throws(
            () => {
                (getFunction((v[2] as { identifier: string }).identifier))(
                    emptyContext(),
                    [],
                    {},
                )
            },
            (err: Error): boolean => {
                return err.message === 'no default value for function type (number; a: number) -> number'
            },
        )
        const codeWithDefinedFunction2 = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = f
        }
        y(2, a=3)
        `
        assert.throws(
            () => execute(parseProgram(codeWithDefinedFunction2), testingContext([], [], new Map<string, USSValue>([
                ['f', { type: testFnType, value: testFn1 }],
            ]))),
            (err: Error): boolean => {
                return err instanceof InterpretationError && err.message === 'Error while executing function: Error: no default value for function type (number; a: number) -> number at 5:9-17'
            },
        )
    }
    assert.deepStrictEqual(
        execute(parseProgram('if ([2, 1] == 1) { 2 } else { "2" }'), emptyContext()),
        { type: { type: 'null' }, value: null },
    )
})

void test('evaluate if expressions mutations', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('xs', { type: numVectorType, value: [1, 2, 3, 4, 5, 6] })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { ys = xs + 1 } else { ys = xs - 2 }'), ctx),
        { type: numVectorType, value: [2, 3, 1, 2, 3, 4] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('ys'), ctx),
        { type: numVectorType, value: [2, 3, 1, 2, 3, 4] },
    )
    ctx.assignVariable('ys', { type: numVectorType, value: [100, 200, 300, 400, 500, 600] })
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { ys = xs + 1 }'), ctx),
        { type: numVectorType, value: [2, 3, NaN, NaN, NaN, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('ys'), ctx),
        { type: numVectorType, value: [2, 3, 300, 400, 500, 600] }, // ys is mutated only for the first two elements
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { zs = xs + 1 }'), ctx),
        { type: numVectorType, value: [2, 3, NaN, NaN, NaN, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('zs'), ctx),
        { type: numVectorType, value: [2, 3, NaN, NaN, NaN, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { as = xs + 1; bs = as ** 2 }'), ctx),
        { type: numVectorType, value: [4, 9, NaN, NaN, NaN, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('as'), ctx),
        { type: numVectorType, value: [2, 3, NaN, NaN, NaN, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('bs'), ctx),
        { type: numVectorType, value: [4, 9, NaN, NaN, NaN, NaN] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (0 == 1) { 2 }'), ctx),
        { type: { type: 'null' }, value: null },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (1 == 1) { }'), ctx),
        { type: { type: 'null' }, value: null },
    )
    assert.throws(
        () => evaluate(parseExpr('2 + (if (1 == 1) { })() + 3'), ctx),
        function (err: Error): boolean {
            return err instanceof InterpretationError && err.message === 'Expected function to be a function (or vector thereof) but got null at 1:6-23'
        },
    )
})

void test('evaluate objects', (): void => {
    const ctx: Context = emptyContext()
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2 }'), ctx),
        {
            type: { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType]]) },
            value: new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2, c: "hello" }'), ctx),
        {
            type: { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType], ['c', stringType]]) },
            value: new Map<string, USSRawValue>([['a', 1], ['b', 2], ['c', 'hello']]),
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{}'), ctx),
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
        evaluate(parseExpr('{ a: 1, b: 2, c: "hello", d: { e: 3 } }'), ctx),
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
        evaluate(parseExpr('{a: 1, b: 2}.a'), ctx),
        { type: numType, value: 1 },
    )
    assert.throws(
        () => evaluate(parseExpr('if ({a: 1, b: 2}) {}'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Conditional mask must be a vector of numbers, strings, or booleans, but got {a: number, b: number} at 1:5-16'
        },
    )
    // duplicate keys
    assert.throws(() => evaluate(parseExpr('{ a: 1, a: 2 }'), ctx), (err: Error): boolean => {
        return err instanceof InterpretationError && err.message === 'Duplicate key a in object literal at 1:12'
    })
})

void test('evaluate vectors', (): void => {
    const ctx: Context = emptyContext()
    // assert.deepStrictEqual(
    //     evaluate(parseExpr('[1, 2]'), ctx),
    //     { type: numVectorType, value: [1, 2] },
    // )
    assert.deepStrictEqual(
        evaluate(parseExpr('[]'), ctx),
        { type: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }, value: [] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[]]'), ctx),
        { type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } }, value: [[]] },
    )
    assert.throws(
        () => evaluate(parseExpr('[1, [2, 3]]'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'vector literal contains heterogenous types number and [number] at 1:1-11'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 2, 3], [4]]'), ctx),
        { type: numMatrixType, value: [[1, 2, 3], [4]] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 2, 3], []]'), ctx),
        { type: numMatrixType, value: [[1, 2, 3], []] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[[1, 2, 3]], []]'), ctx),
        { type: { type: 'vector', elementType: numMatrixType }, value: [[[1, 2, 3]], []] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[], []]'), ctx),
        { type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } }, value: [[], []] },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[], [[]]]'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } } },
            value: [[], [[]]],
        },
    )
    assert.throws(
        () => evaluate(parseExpr('[] + [1]'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'positional argument 1 is an empty vector whose type cannot be inferred at 1:1-8'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{a: []}.a'), ctx),
        { type: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }, value: [] },
    )
    assert.throws(
        () => evaluate(parseExpr('[{a: []}, {b: [1]}]'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'vector literal contains heterogenous types {a: []} and {b: [number]} at 1:1-19'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[{a: []}, {a: [1]}]'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['a', { type: 'vector', elementType: { type: 'number' } }]]) } },
            value: [
                new Map<string, USSRawValue>([['a', []]]),
                new Map<string, USSRawValue>([['a', [1]]]),
            ],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[{a: []}, {a: []}]'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['a', { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }]]) } },
            value: [
                new Map<string, USSRawValue>([['a', []]]),
                new Map<string, USSRawValue>([['a', []]]),
            ],
        },
    )
})

void test('mutate objects', (): void => {
    const ctx: Context = emptyContext()
    assert.deepStrictEqual(
        execute(parseProgram('a = {x: 1}; a.x = 2; a'), ctx),
        {
            type: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) },
            value: new Map<string, USSRawValue>([['x', 2]]),
        },
    )
    assert.throws(
        () => execute(parseProgram('a = {x: 1}; a.y = 2; a'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Attribute y not found in object of type {x: number} at 1:13-15'
        },
    )
    assert.throws(
        () => execute(parseProgram('a = {x: 1}; a.x = "2"; a'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Type mismatch: expected number but got string for attribute x in object of type {x: number} at 1:13-15'
        },
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}]; a.x = [2]; a'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } },
            value: [new Map<string, USSRawValue>([['x', 2]])],
        },
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}]; a.x = 2; a'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } },
            value: [new Map<string, USSRawValue>([['x', 2]])],
        },
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}]; [a].x = 2; a'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } },
            value: [new Map<string, USSRawValue>([['x', 2]])],
        },
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}, {x: 2}, {x: 3}]; a.x = [2, 3, 4]; a'), ctx),
        {
            type: { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } },
            value: [new Map<string, USSRawValue>([['x', 2]]), new Map<string, USSRawValue>([['x', 3]]), new Map<string, USSRawValue>([['x', 4]])],
        },
    )
    // size mismatch
    assert.throws(
        () => execute(parseProgram('a = [{x: 1}, {x: 2}, {x: 3}]; a.x = [2, 3]; a'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Expected vector of length 3 but got 2 for attribute x in object of type [{x: number}] at 1:31-33'
        },
    )
})

void test('constants', (): void => {
    assert.deepStrictEqual(
        evaluate(parseExpr('pi'), emptyContext()),
        { type: numType, value: Math.PI },
    )
    assert.throws(
        () => execute(parseProgram('pi = 3.14'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Cannot assign to constant "pi" at 1:1-2'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('sqrt([4, 9, 16, -1])'), emptyContext()),
        {
            type: numVectorType,
            value: [2, 3, 4, NaN],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toNumber([1, 2, 3] == 2)'), emptyContext()),
        {
            type: numVectorType,
            value: [0, 1, 0],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toString([1, 2, 3] == 2)'), emptyContext()),
        {
            type: { type: 'vector', elementType: stringType },
            value: ['false', 'true', 'false'],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toNumber([1, 2, 3])'), emptyContext()),
        {
            type: numVectorType,
            value: [1, 2, 3],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toString([1, 2, 3])'), emptyContext()),
        {
            type: { type: 'vector', elementType: stringType },
            value: ['1', '2', '3'],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toNumber(["1", "0.75", "3.14", "3m"])'), emptyContext()),
        {
            type: numVectorType,
            value: [1, 0.75, 3.14, 3e6],
        },
    )
})

function close(a: USSRawValue, b: USSRawValue): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
        if (isNaN(a) && isNaN(b)) return true
        return Math.abs(a - b) < 1e-3
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++) {
            if (!close(a[i], b[i])) return false
        }
        return true
    }
    return a === b
}

void test('regression', (): void => {
    // to help generate these, see ./regression.py
    assert.deepStrictEqual(
        renderType(regressionResultType(3)),
        '{b: number, m1: number, m2: number, m3: number, r2: number, residuals: [number]}',
    )
    assert.deepStrictEqual(
        renderType(regressionType(3)),
        '(; y: [number], x1: [number], x2: [number] = null, x3: [number] = null, weight: [number] = null, noIntercept: boolean = false) -> {b: number, m1: number, m2: number, m3: number, r2: number, residuals: [number]}',
    )

    function assertEquivalentRegressionOutput(
        actual: USSRawValue,
        expected: Map<string, USSRawValue>,
    ): void {
        if (!(actual instanceof Map)) {
            throw new Error(`Expected a Map for regression output, but got ${actual}`)
        }
        for (const [key, value] of actual.entries()) {
            const expectedValue = expected.get(key)
            if (expectedValue !== undefined) {
                assert.strict(close(value, expectedValue), `Key ${key} has value ${value}, expected ${expectedValue}`)
            }
            else {
                assert.deepStrictEqual(value, NaN, `Key ${key} not found in expected output; had value: ${value}`)
            }
        }
    }

    assert.deepStrictEqual(
        evaluate(parseExpr('regression(x1=[1, 2, 3], y=[4, 5, 6])'), emptyContext()),
        {
            type: regressionResultType(10),
            value: new Map<string, USSRawValue>(
                [
                    ['residuals', [0, 0, 0]],
                    ['m1', 1],
                    ['m2', NaN],
                    ['m3', NaN],
                    ['m4', NaN],
                    ['m5', NaN],
                    ['m6', NaN],
                    ['m7', NaN],
                    ['m8', NaN],
                    ['m9', NaN],
                    ['m10', NaN],
                    ['r2', 1],
                    ['b', 3],
                ],
            ),
        },
    )
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(y=[2, 5, 6], x1=[1, 2, 3], x2=[1, 0, 0])'), emptyContext()).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [0, 0, 0]],
                ['m1', 1],
                ['m2', -2],
                ['m3', NaN],
                ['m4', NaN],
                ['m5', NaN],
                ['m6', NaN],
                ['m7', NaN],
                ['m8', NaN],
                ['m9', NaN],
                ['m10', NaN],
                ['r2', 1],
                ['b', 3],
            ],
        ),
    )
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(y=[2, 5, 6], x1=[1, 2, 3], x3=[1, 0, 0])'), emptyContext()).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [0, 0, 0]],
                ['m1', 1],
                ['m3', -2],
                ['r2', 1],
                ['b', 3],
            ],
        ),
    )
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(y=[4, 5, 6], x1=[1, 2, 3], noIntercept=true)'), emptyContext()).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [1.7142857142857144, 0.4285714285714288, -0.8571428571428568]],
                ['m1', 2.28571429],
                ['r2', -0.9285714285714286],
                ['b', 0],
            ],
        ),
    )
    const ctx: Context = emptyContext()
    ctx.assignVariable('x1', { type: numVectorType, value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })
    ctx.assignVariable('x2', { type: numVectorType, value: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2] })
    ctx.assignVariable('y', { type: numVectorType, value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 100] })
    ctx.assignVariable('w1', { type: numVectorType, value: [1, 1, 1, 1, 1, 1, 1, 1, 1, 2] })
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(x1=x1, y=y)'), ctx).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [13.090909090909097, 8.181818181818187, 3.272727272727277, -1.6363636363636331, -6.545454545454543, -11.454545454545453, -16.363636363636367, -21.272727272727273, -26.18181818181818, 58.90909090909091]],
                ['m1', 5.90909090909091],
                ['r2', 0.3521],
                ['b', -18],
            ],
        ),
    )
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(x1=x1+0, y=y)'), ctx).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [13.090909090909097, 8.181818181818187, 3.272727272727277, -1.6363636363636331, -6.545454545454543, -11.454545454545453, -16.363636363636367, -21.272727272727273, -26.18181818181818, 58.90909090909091]],
                ['m1', 5.90909090909091],
                ['r2', 0.3521],
                ['b', -18],
            ],
        ),
    )
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(x1=x1, y=y, weight=w1)'), ctx).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [19.459459459459467, 12.162162162162168, 4.86486486486487, -2.432432432432428, -9.729729729729726, -17.027027027027025, -24.324324324324323, -31.62162162162162, -38.91891891891891, 43.78378378378378]],
                ['m1', 8.2972973],
                ['r2', 0.4685065790454792],
                ['b', -26.756756756756765],
            ],
        ),
    )
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(x1=x1, y=y, x2=x2, weight=w1)'), ctx).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [4.921874999999993, 3.515624999999993, 2.109374999999993, 0.7031249999999929, -0.7031250000000071, -2.109375000000007, -3.515625000000007, -4.921875000000007, -59.0625, 29.53125]],
                ['m1', 2.40625],
                ['m2', 52.734375],
                ['r2', 0.6415187603457788],
                ['b', -59.06249999999999],
            ],
        ),
    )
})

void test('value rendering', () => {
    // Numbers
    assert.strictEqual(renderValue({ type: numType, value: 42 }), '42')
    assert.strictEqual(renderValue({ type: numType, value: 3.14 }), '3.14')
    assert.strictEqual(renderValue({ type: numType, value: NaN }), 'NaN')
    assert.strictEqual(renderValue({ type: numType, value: Infinity }), 'Infinity')
    assert.strictEqual(renderValue({ type: numType, value: -Infinity }), '-Infinity')

    // Booleans
    assert.strictEqual(renderValue({ type: boolType, value: true }), 'true')
    assert.strictEqual(renderValue({ type: boolType, value: false }), 'false')

    // Strings
    assert.strictEqual(renderValue({ type: stringType, value: 'hello' }), '"hello"')
    assert.strictEqual(renderValue({ type: stringType, value: '' }), '""')

    // Null
    assert.strictEqual(renderValue({ type: { type: 'null' }, value: null }), 'null')

    // Vectors
    assert.strictEqual(
        renderValue({ type: numVectorType, value: [1, 2, 3] }),
        `[
    1,
    2,
    3
]`,
    )
    assert.strictEqual(
        renderValue({ type: { type: 'vector', elementType: stringType }, value: ['a', 'b'] }),
        `[
    "a",
    "b"
]`,
    )
    assert.strictEqual(
        renderValue({ type: { type: 'vector', elementType: { type: 'null' } }, value: [null, null] }),
        `[
    null,
    null
]`,
    )
    assert.strictEqual(
        renderValue({ type: { type: 'vector', elementType: numVectorType }, value: [[1, 2], [3, 4]] }),
        `[
    [
        1,
        2
    ],
    [
        3,
        4
    ]
]`,
    )
    assert.strictEqual(
        renderValue({ type: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }, value: [] }),
        `[]`,
    )

    // Objects
    assert.strictEqual(
        renderValue({
            type: { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', stringType]]) },
            value: new Map<string, USSRawValue>([['a', 1], ['b', 'x']]),
        }),
        `{
    a: 1,
    b: "x"
}`,
    )
    assert.strictEqual(
        renderValue({
            type: { type: 'object', properties: new Map([['a', numVectorType]]) },
            value: new Map([['a', [1, 2]]]),
        }),
        `{
    a: [
        1,
        2
    ]
}`,
    )
    assert.strictEqual(
        renderValue({
            type: { type: 'object', properties: new Map() },
            value: new Map(),
        }),
        `{}`,
    )

    // Nested objects and vectors
    assert.strictEqual(
        renderValue({
            type: { type: 'vector', elementType: { type: 'object', properties: new Map([['x', numType]]) } },
            value: [new Map([['x', 1]]), new Map([['x', 2]])],
        }),
        `[
    {
        x: 1
    },
    {
        x: 2
    }
]`,
    )
    assert.strictEqual(
        renderValue({
            type: { type: 'object', properties: new Map([['v', numVectorType]]) },
            value: new Map([['v', [1, 2, 3]]]),
        }),
        `{
    v: [
        1,
        2,
        3
    ]
}`,
    )

    // Functions (should render as type string)
    assert.strictEqual(
        renderValue({ type: testFnType, value: testFn1 }),
        '(number; a: number) -> number',
    )
    assert.strictEqual(
        renderValue({ type: { type: 'vector', elementType: testFnType }, value: [testFn1, testFn2] }),
        `[
    (number; a: number) -> number,
    (number; a: number) -> number
]`,
    )
})

void test('evaluate conditions', (): void => {
    // 'if (x) { condition(y); abcdefg = 3  }; x = 4'
    assert.deepStrictEqual(
        execute(parseProgram('x = [1, 2, 3]; condition(x > 1); y = 3; y'), emptyContext()),
        { type: numVectorType, value: [NaN, 3, 3] },
    )
})

void test('colors', (): void => {
    assert.deepStrictEqual(
        evaluate(parseExpr('rgb(1, 0, 0)'), emptyContext()),
        { type: colorType, value: { type: 'opaque', value: { r: 255, g: 0, b: 0 } } },
    )
    assert.deepStrictEqual(
        renderValue(evaluate(parseExpr('rgb(1, 0, 0)'), emptyContext())),
        '{"r":255,"g":0,"b":0}',
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('rgb([1, 0.5, 0.75], 0, 0)'), emptyContext()),
        {
            type: { type: 'vector', elementType: colorType },
            value: [{ type: 'opaque', value: { r: 255, g: 0, b: 0 } }, { type: 'opaque', value: { r: 128, g: 0, b: 0 } }, { type: 'opaque', value: { r: 191, g: 0, b: 0 } }],
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('renderColor(rgb([1, 0.5, 0.75], 0, [0.9, 1.0, 0.2]))'), emptyContext()),
        { type: {
            type: 'vector',
            elementType: { type: 'string' },
        }, value: ['#ff00e6', '#8000ff', '#bf0033'] },
    )
    assert.throws(
        () => evaluate(parseExpr('rgb(2, 0, 0)'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'Error while executing function: Error: RGB values must be between 0 and 1, got (2, 0, 0) at 1:1-12'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('hsv([0, 60, 120], 1, 0.5)'), emptyContext()),
        {
            type: { type: 'vector', elementType: colorType },
            value: [
                { type: 'opaque', value: { r: 128, g: 0, b: 0 } }, // Red
                { type: 'opaque', value: { r: 128, g: 128, b: 0 } }, // Yellow
                { type: 'opaque', value: { r: 0, g: 128, b: 0 } }, // Green
            ],
        },
    )
    assert.throws(
        () => evaluate(parseExpr('hsv(400, 1, 0.5)'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'Error while executing function: Error: HSL values must be (hue: 0-360, saturation: 0-1, lightness: 0-1), got (400, 1, 0.5) at 1:1-16'
        },
    )
    assert.throws(
        () => evaluate(parseExpr('if ([true, false]) {x = hsv(0, 1, 0.5)}'), emptyContext()),
        (err: Error): boolean => {
            return err.message === 'no default value for opaque type color'
        },
    )
})

void test('ramps', (): void => {
    // Basic ramp construction
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 1, color: rgb(1, 1, 1)}])'), emptyContext()),
        {
            type: { type: 'opaque', name: 'ramp' },
            value: { type: 'opaque', value: [[0, '#000000'], [1, '#ffffff']] },
        },
    )

    // Ramp with multiple stops
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 0.5, color: rgb(0.5, 0.5, 0.5)}, {value: 1, color: rgb(1, 1, 1)}])'), emptyContext()),
        {
            type: { type: 'opaque', name: 'ramp' },
            value: { type: 'opaque', value: [[0, '#000000'], [0.5, '#808080'], [1, '#ffffff']] },
        },
    )

    // Ramp with HSV colors
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: hsv(0, 1, 0.5)}, {value: 1, color: hsv(120, 1, 0.5)}])'), emptyContext()),
        {
            type: { type: 'opaque', name: 'ramp' },
            value: { type: 'opaque', value: [[0, '#800000'], [1, '#008000']] },
        },
    )

    // Ramp with mixed color types
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: rgb(1, 0, 0)}, {value: 0.5, color: hsv(120, 1, 0.5)}, {value: 1, color: rgb(0, 0, 1)}])'), emptyContext()),
        {
            type: { type: 'opaque', name: 'ramp' },
            value: { type: 'opaque', value: [[0, '#ff0000'], [0.5, '#008000'], [1, '#0000ff']] },
        },
    )

    // Error: ramp doesn't start at 0
    assert.throws(
        () => evaluate(parseExpr('constructRamp([{value: 0.1, color: rgb(0, 0, 0)}, {value: 1, color: rgb(1, 1, 1)}])'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Error while executing function: Error: Ramp must start at 0 and end at 1 at 1:1-83'
        },
    )

    // Error: ramp doesn't end at 1
    assert.throws(
        () => evaluate(parseExpr('constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 0.9, color: rgb(1, 1, 1)}])'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'Error while executing function: Error: Ramp must start at 0 and end at 1 at 1:1-83'
        },
    )

    // Error: ramp values decreasing
    assert.throws(
        () => evaluate(parseExpr('constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 0.8, color: rgb(0.5, 0.5, 0.5)}, {value: 0.6, color: rgb(1, 1, 1)}, {value: 1.0, color: rgb(1, 1, 1)}])'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'Error while executing function: Error: Ramp values must be strictly increasing, found 0.8 >= 0.6 at index 1 at 1:1-159'
        },
    )

    // Test ramp rendering
    const rampResult = evaluate(parseExpr('constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 1, color: rgb(1, 1, 1)}])'), emptyContext())
    assert.deepStrictEqual(
        renderValue(rampResult),
        '[[0,"#000000"],[1,"#ffffff"]]',
    )

    // Test ramp with conditional assignment
    assert.throws(
        () => evaluate(parseExpr('if ([true, false]) {x = constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 1, color: rgb(1, 1, 1)}])}'), emptyContext()),
        (err: Error): boolean => {
            return err.message === 'no default value for opaque type ramp'
        },
    )

    // Test ramp with variables
    const ctx: Context = emptyContext()
    ctx.assignVariable('red', { type: { type: 'opaque', name: 'color' }, value: { type: 'opaque', value: { r: 255, g: 0, b: 0 } } })
    ctx.assignVariable('blue', { type: { type: 'opaque', name: 'color' }, value: { type: 'opaque', value: { r: 0, g: 0, b: 255 } } })

    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: red}, {value: 1, color: blue}])'), ctx),
        {
            type: { type: 'opaque', name: 'ramp' },
            value: { type: 'opaque', value: [[0, '#ff0000'], [1, '#0000ff']] },
        },
    )
})

function assertScale(scale: ScaleInstance, values: number[], proportions: number[]): void {
    assert.strict(close(proportions, values.map(scale.forward)), `Scale forward mapping failed: ${JSON.stringify(proportions)} != ${JSON.stringify(values.map(scale.forward))}`)
    assert.strict(close(values, proportions.map(scale.inverse)), `Scale inverse mapping failed: ${JSON.stringify(values)} != ${JSON.stringify(proportions.map(scale.inverse))}`)
}

void test('test basic map', () => {
    const resultMap = evaluate(parseExpr('cMap(geo=["A", "B", "C"], data=[1, 2, 3], scale=linearScale, ramp=rampBone)'), emptyContext())
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    // assertScale(resultMapRaw.scale, [1, 1.5, 2, 2.5, 3], [0, 0.25, 0.5, 0.75, 1])
})

void test('test basic map with geometric', () => {
    const resultMap = evaluate(parseExpr('cMap(geo=["A", "B", "C"], data=[1, 2, 4], scale=logScale, ramp=rampBone)'), emptyContext())
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 4])
    // assertScale(resultMapRaw.scale, [1, Math.sqrt(2), 2, 2 * Math.sqrt(2), 4], [0, 0.25, 0.5, 0.75, 1])
})

void test('map with only one value', () => {
    const resultMap = evaluate(parseExpr('cMap(geo=["A"], data=[11.2], scale=linearScale, ramp=rampBone)'), emptyContext())
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A'])
    assert.deepStrictEqual(resultMapRaw.data, [11.2])
    // assertScale(resultMapRaw.scale, [10, 11, 12], [-0.7, 0.3, 1.3])
})

void test('conditional map', () => {
    const program = `
    geo = ["A", "B", "C", "D"];
    data = [1, 2, 3, 4];
    mask = [true, true, false, false]
    if (mask) {
        cMap(geo=geo, data=data, scale=linearScale, ramp=rampBone)
    }
    `
    const resultMap = execute(parseProgram(program), emptyContext())
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2])
})

void test('error map with different geo and data lengths', () => {
    assert.throws(
        () => evaluate(parseExpr('cMap(geo=["A", "B"], data=[1], scale=linearScale, ramp=rampBone)'), emptyContext()),
        (err: Error): boolean => {
            return err.message === 'Error while executing function: Error: geo and data must have the same length at 1:1-64'
        },
    )
})
