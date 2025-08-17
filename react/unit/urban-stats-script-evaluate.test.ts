import assert from 'assert/strict'
import { test } from 'node:test'

import { getRamps } from '../src/mapper/ramps'
import { colorType } from '../src/urban-stats-script/constants/color'
import { CMap, Outline } from '../src/urban-stats-script/constants/map'
import { regressionType, regressionResultType } from '../src/urban-stats-script/constants/regr'
import { instantiate, ScaleDescriptor, Scale } from '../src/urban-stats-script/constants/scale'
import { Context } from '../src/urban-stats-script/context'
import { Effect, evaluate, execute, InterpretationError } from '../src/urban-stats-script/interpreter'
import { parseNoErrorAsCustomNode } from '../src/urban-stats-script/parser'
import { renderType, USSRawValue, USSType, USSValue, renderValue, undocValue, OriginalFunctionArgs, canUnifyTo } from '../src/urban-stats-script/types-values'

import { boolType, emptyContext, emptyContextWithInsets, multiArgFnType, numMatrixType, numType, numVectorType, parseExpr, parseProgram, stringType, testFn1, testFn2, testFnMultiArg, testFnType, testFnTypeWithDefault, testFnWithDefault, testingContext, testObjType } from './urban-stats-script-utils'

const stringVectorType = { type: 'vector', elementType: { type: 'string' } } satisfies USSType

void test('evaluate basic expressions', (): void => {
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 2'), emptyContext()),
        undocValue(4, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4'), emptyContext()),
        undocValue(10, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5'), emptyContext()),
        undocValue(26, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * (3 + 4 * 5)'), emptyContext()),
        undocValue(46, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('(3 + 4 * 5) * 2'), emptyContext()),
        undocValue(46, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('- -2'), emptyContext()),
        undocValue(2, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5 + 6 ** 2'), emptyContext()),
        undocValue(62, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 * 3 + 4 * 5 + 6 ** 2 - 7'), emptyContext()),
        undocValue(55, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 ** -10'), emptyContext()),
        undocValue(1 / 1024, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('-2 ** 10'), emptyContext()),
        undocValue(-1024, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 > 3'), emptyContext()),
        undocValue(false, boolType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('12 > 3'), emptyContext()),
        undocValue(true, boolType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"12" > "3"'), emptyContext()),
        undocValue(false, boolType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"abc" + "def"'), emptyContext()),
        undocValue('abcdef', stringType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('"abc" + "def" + "ghi"'), emptyContext()),
        undocValue('abcdefghi', stringType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 3 > 4'), emptyContext()),
        undocValue(true, boolType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + 3 > 4 & 5 < 6'), emptyContext()),
        undocValue(true, boolType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('minimum(2, 3)'), emptyContext()),
        undocValue(2, numType),
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
        undocValue([[2, 2, 3, 3, 4, 4]], numMatrixType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 1, 2, 2, 3, 3]] == 1'), emptyContext()),
        undocValue([[true, true, false, false, false, false]], { type: 'vector', elementType: { type: 'vector', elementType: { type: 'boolean' } } }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[min, max, sum, mean, median]([1, 2, 3, 5, 6, 70])'), emptyContext()),
        undocValue([1, 70, 87, 14.5, 4], { type: 'vector', elementType: numType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('min([[1], []])'), emptyContext()),
        undocValue([1, Infinity], { type: 'vector', elementType: numType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('max([[1], []])'), emptyContext()),
        undocValue([1, -Infinity], { type: 'vector', elementType: numType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('sum([[1], []])'), emptyContext()),
        undocValue([1, 0], { type: 'vector', elementType: numType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('mean([[1], []])'), emptyContext()),
        undocValue([1, NaN], { type: 'vector', elementType: numType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('median([[1], []])'), emptyContext()),
        undocValue([1, NaN], { type: 'vector', elementType: numType }),
    )
})

void test('evaluate basic variable expressions', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('x', undocValue([1, 2, 3], numVectorType))
    assert.deepStrictEqual(
        evaluate(parseExpr('x + 1'), ctx),
        undocValue([2, 3, 4], numVectorType),
    )
    ctx.assignVariable('y', undocValue([[10, 20, 30], [40, 50, 60]], numMatrixType))
    assert.deepStrictEqual(
        evaluate(parseExpr('y + x'), ctx),
        undocValue([[11, 22, 33], [41, 52, 63]], numMatrixType),
    )
    ctx.assignVariable('z', undocValue([10, 20, 30, 40], numVectorType))
    assert.throws(
        () => evaluate(parseExpr('y + z'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Incompatibility between the shape of positional argument 2 (4) and the shape of positional argument 1 (2, 3) at 1:1-5'
        },
    )
    ctx.assignVariable('s', undocValue(['hello'], { type: 'vector', elementType: stringType }))
    assert.throws(
        () => evaluate(parseExpr('+ s'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid type for operator +: string at 1:1-3'
        },
    )
    ctx.assignVariable('obj', undocValue(new Map<string, USSRawValue>([['u', 401], ['v', 502]]), testObjType))
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
    ctx.assignVariable('obj', undocValue(new Map<string, USSRawValue>([['u', 401], ['v', 502]]), testObjType))
    assert.deepStrictEqual(
        evaluate(parseExpr('obj.u'), ctx),
        undocValue(401, numType),
    )

    assert.throws(
        () => evaluate(parseExpr('obj.x'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Attribute x not found in object of type {u: number, v: number} at 1:1-5'
        },
    )
    ctx.assignVariable('objs', undocValue([
        new Map<string, USSRawValue>([['u', 101], ['v', 202]]),
        new Map<string, USSRawValue>([['u', 301], ['v', 402]]),
    ], { type: 'vector', elementType: testObjType }))
    assert.deepStrictEqual(
        evaluate(parseExpr('objs.u'), ctx),
        undocValue([101, 301], numVectorType),
    )
    ctx.assignVariable('objs2', undocValue([
        [
            new Map<string, USSRawValue>([['u', 101], ['v', 202]]),
            new Map<string, USSRawValue>([['u', 301], ['v', 402]]),
        ],
        [
            new Map<string, USSRawValue>([['u', 501], ['v', 602]]),
            new Map<string, USSRawValue>([['u', 701], ['v', 802]]),
        ],
    ], { type: 'vector', elementType: { type: 'vector', elementType: testObjType } }))
    assert.deepStrictEqual(
        evaluate(parseExpr('objs2.u'), ctx),
        undocValue([[101, 301], [501, 701]], { type: 'vector', elementType: numVectorType }),
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
    ctx.assignVariable('x', undocValue([1, 2, 3], numVectorType))
    ctx.assignVariable('testFn1', undocValue(testFn1, testFnType))
    assert.deepStrictEqual(
        evaluate(parseExpr('testFn1(2, a=3)'), ctx),
        undocValue(2 * 2 + 3, numType),
    )
    ctx.assignVariable('testFns', undocValue([testFn1, testFn2], { type: 'vector', elementType: testFnType }))
    assert.deepStrictEqual(
        evaluate(parseExpr('testFns(2, a=3)'), ctx),
        undocValue([2 * 2 + 3, 2 * 2 * 2 + 3], numVectorType),
    )
    ctx.assignVariable('testFns', undocValue([testFn1, testFn2, testFn1], { type: 'vector', elementType: testFnType }))
    assert.deepStrictEqual(
        evaluate(parseExpr('testFns(2, a=x)'), ctx),
        undocValue([2 * 2 + 1, 2 * 2 * 2 + 2, 2 * 2 + 3], numVectorType),
    )
    ctx.assignVariable('testFnMultiArg', undocValue(testFnMultiArg, multiArgFnType))
    ctx.assignVariable('obj', undocValue(new Map<string, USSRawValue>([['u', 401], ['v', 502]]), testObjType))
    ctx.assignVariable('y', undocValue([1, 2, 3], numVectorType))
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=obj)'), ctx),
        undocValue([2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 401, 502], numVectorType),
    )
    assert.deepStrictEqual(
        // backwards obj
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={v: 502, u: 401})'), ctx),
        undocValue([2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 401, 502], numVectorType),
    )
    ctx.assignVariable('objs', undocValue(new Map<string, USSRawValue>([
        ['u', 100],
        ['v', [200, 300]],
    ]), {
        type: 'object',
        properties: new Map<string, USSType>([
            ['u', numType],
            ['v', numVectorType],
        ]),
    } satisfies USSType))
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objs)'), ctx),
        undocValue([
            [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
            [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 300],
        ], numMatrixType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={u: 100, v: [200, 300]})'), ctx),
        undocValue([
            [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
            [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 300],
        ], numMatrixType),
    )
    assert.throws(
        () => evaluate(parseExpr('testFnMultiArg(2, y, a=4, b={u: 100, v: []})'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Cannot broadcast object property v because its type is an empty vector with no inferred type at 1:1-44'
        },
    )
    ctx.assignVariable('objsBoth', undocValue(new Map<string, USSRawValue>([
        ['u', [100, 101]],
        ['v', [200, 300]],
    ]), {
        type: 'object',
        properties: new Map<string, USSType>([
            ['u', numVectorType],
            ['v', numVectorType],
        ]),
    } satisfies USSType))
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnMultiArg(2, y, a=4, b=objsBoth)'), ctx),
        undocValue([
            [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 100, 200],
            [2, 1 + 2 + 3, 1 * 1 + 2 * 2 + 3 * 3, 4, 101, 300],
        ], numMatrixType),
    )
    ctx.assignVariable('objsBothRagged', undocValue(new Map<string, USSRawValue>([
        ['u', [100, 101]],
        ['v', [200]],
    ]), {
        type: 'object',
        properties: new Map<string, USSType>([
            ['u', numVectorType],
            ['v', numVectorType],
        ]),
    } satisfies USSType))
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
        ctx.assignVariable('testFnWithDefault', undocValue(testFnWithDefault, testFnTypeWithDefault))
        return ctx
    }
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnWithDefault(100, a=3, b=2)'), newCtx()),
        undocValue(100 * 100 * 100 + 3 + 10 * 2, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnWithDefault(100, a=3)'), newCtx()),
        undocValue(100 * 100 * 100 + 3 + 10 * 1, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('testFnWithDefault([100, 200, 300], a=3)'), newCtx()),
        undocValue([100 * 100 * 100 + 3 + 10 * 1, 200 * 200 * 200 + 3 + 10 * 1, 300 * 300 * 300 + 3 + 10 * 1], numVectorType),
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

void test('execute basic', (): void => {
    assert.deepStrictEqual(
        execute(parseProgram(''), emptyContext()),
        undocValue(null, { type: 'null' }),
    )
    assert.deepStrictEqual(
        execute(parseProgram('if (true) {}'), emptyContext()),
        undocValue(null, { type: 'null' }),
    )
})

void test('evaluate if expressions', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('x', undocValue(3, numType))
    assert.deepStrictEqual(
        evaluate(parseExpr('if (x > 2) { 1 } else { 2 }'), ctx),
        undocValue(1, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (x < 2) { 1 } else { 2 }'), ctx),
        undocValue(2, numType),
    )
    ctx.assignVariable('xs', undocValue([1, 2, 3, 4, 5, 6], numVectorType))
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { xs + 1 } else { xs - 2 }'), ctx),
        undocValue([2, 3, 1, 2, 3, 4], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { xs + 1 }'), ctx),
        undocValue([2, 3, NaN, NaN, NaN, NaN], numVectorType),
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
        undocValue([2, 3, NaN, NaN, NaN, NaN], numVectorType),
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

    {
        // index in object
        const codeWObjectIndex = `
            x = { a: [1, 2, 3], b: 2 }
            if ([true, true, false]) {
                y = x.a
            }
            y
            `
        assert.deepStrictEqual(
            execute(parseProgram(codeWObjectIndex), emptyContext()),
            undocValue([1, 2, NaN], numVectorType),
        )
    }
    {
        // index in object
        const codeWObjectIndex = `
            x = { a: [1, 2], b: 2 }
            if ([true, true, false]) {
                y = x.a
            }
            y
            `
        assert.throws(
            () => execute(parseProgram(codeWObjectIndex), emptyContext()),
            (err: Error): boolean => {
                return err instanceof InterpretationError && err.message === 'Conditional error: Error indexing variable x: Expected vector of length 3, but got 2 at 3:17-35'
            },
        )
    }
    {
        // assign to constant in if
        const codeWConstantAssign = `
            if (true) {
                true = 1
            }
            true
            `
        assert.throws(
            () => execute(parseProgram(codeWConstantAssign), emptyContext()),
            (err: Error): boolean => {
                return err instanceof InterpretationError && err.message === 'Cannot assign to constant "true" at 3:17-20'
            },
        )
    }
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
        undocValue([null, null, null, null, null], { type: 'vector', elementType: { type: 'null' } }),
    )
    // define y as a vector of booleans
    const codeWithDefinedBool = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = 1 == 1
        }
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedBool), emptyContext()),
        undocValue([true, true, false, false, false], { type: 'vector', elementType: boolType }),
    )
    // define y as a vector of vectors of numbers
    const codeWithDefinedNumVector = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = [[1, 2], [3, 4]]
        }
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedNumVector), emptyContext()),
        undocValue([[1, 2], [3, 4], [], [], []], numMatrixType),
    )
    // define y as an object
    const codeWithDefinedObject = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = { a: 1, b: 2 }
        }
        `
    assert.deepStrictEqual(
        execute(parseProgram(codeWithDefinedObject), emptyContext()),
        undocValue(
            [
                new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
                new Map<string, USSRawValue>([['a', 1], ['b', 2]]),
                new Map<string, USSRawValue>([['a', NaN], ['b', NaN]]),
                new Map<string, USSRawValue>([['a', NaN], ['b', NaN]]),
                new Map<string, USSRawValue>([['a', NaN], ['b', NaN]]),
            ],
            {
                type: 'vector',
                elementType: {
                    type: 'object',
                    properties: new Map<string, USSType>([['a', numType], ['b', numType]]),
                },
            },
        ),
    )
    {
        // define y as a function
        const codeWithDefinedFunction = `
        if ([1, 1, 2, 2, 3] == 1) {
            y = f
        }
        `
        const result = execute(parseProgram(codeWithDefinedFunction), testingContext([], [], new Map<string, USSValue>([
            ['f', undocValue(testFn1, testFnType)],
        ])))
        assert.deepStrictEqual(result.type, { type: 'vector', elementType: testFnType })
        const v = result.value as USSRawValue[]
        assert.deepStrictEqual(v[0], testFn1)
        assert.deepStrictEqual(v[1], testFn1)
        assert.throws(
            () => {
                (v[2] as ((ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, originalArgs: OriginalFunctionArgs) => void))(
                    emptyContext(),
                    [],
                    {},
                    { posArgs: [], namedArgs: {} },
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
                ['f', undocValue(testFn1, testFnType)],
            ]))),
            (err: Error): boolean => {
                return err instanceof InterpretationError && err.message === 'Error while executing function: Error: no default value for function type (number; a: number) -> number at 5:9-17'
            },
        )
    }
    assert.deepStrictEqual(
        execute(parseProgram('if ([2, 1] == 1) { 2 } else { "2" }'), emptyContext()),
        undocValue(null, { type: 'null' }),
    )
})

void test('evaluate if expressions mutations', (): void => {
    const ctx: Context = emptyContext()
    ctx.assignVariable('xs', undocValue([1, 2, 3, 4, 5, 6], numVectorType))
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { ys = xs + 1 } else { ys = xs - 2 }'), ctx),
        undocValue([2, 3, 1, 2, 3, 4], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('ys'), ctx),
        undocValue([2, 3, 1, 2, 3, 4], numVectorType),
    )
    ctx.assignVariable('ys', undocValue([100, 200, 300, 400, 500, 600], numVectorType))
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { ys = xs + 1 }'), ctx),
        undocValue([2, 3, NaN, NaN, NaN, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('ys'), ctx),
        undocValue([2, 3, 300, 400, 500, 600], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { zs = xs + 1 }'), ctx),
        undocValue([2, 3, NaN, NaN, NaN, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('zs'), ctx),
        undocValue([2, 3, NaN, NaN, NaN, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (xs <= 2) { as = xs + 1; bs = as ** 2 }'), ctx),
        undocValue([4, 9, NaN, NaN, NaN, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('as'), ctx),
        undocValue([2, 3, NaN, NaN, NaN, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('bs'), ctx),
        undocValue([4, 9, NaN, NaN, NaN, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (0 == 1) { 2 }'), ctx),
        undocValue(null, { type: 'null' }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('if (1 == 1) { }'), ctx),
        undocValue(null, { type: 'null' }),
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
        undocValue(new Map<string, USSRawValue>([['a', 1], ['b', 2]]), { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType]]) }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2, c: "hello" }'), ctx),
        undocValue(new Map<string, USSRawValue>([['a', 1], ['b', 2], ['c', 'hello']]), { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType], ['c', stringType]]) }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{}'), ctx),
        undocValue(new Map<string, USSRawValue>(), { type: 'object', properties: new Map<string, USSType>([]) }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{ a: 1, b: 2, c: "hello", d: { e: 3 } }'), ctx),
        undocValue(new Map<string, USSRawValue>([
            ['a', 1],
            ['b', 2],
            ['c', 'hello'],
            ['d', new Map<string, USSRawValue>([['e', 3]])],
        ]), { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', numType], ['c', stringType], ['d', { type: 'object', properties: new Map<string, USSType>([['e', numType]]) }]]) }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{a: 1, b: 2}.a'), ctx),
        undocValue(1, numType),
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
        undocValue([], { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[]]'), ctx),
        undocValue([[]], { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } }),
    )
    assert.throws(
        () => evaluate(parseExpr('[1, [2, 3]]'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'vector literal contains heterogenous types number and [number] at 1:1-11'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 2, 3], [4]]'), ctx),
        undocValue([[1, 2, 3], [4]], numMatrixType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[1, 2, 3], []]'), ctx),
        undocValue([[1, 2, 3], []], numMatrixType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[[1, 2, 3]], []]'), ctx),
        undocValue([[[1, 2, 3]], []], { type: 'vector', elementType: numMatrixType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[], []]'), ctx),
        undocValue([[], []], { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[[], [[]]]'), ctx),
        undocValue([[], [[]]], { type: 'vector', elementType: { type: 'vector', elementType: { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } } }),
    )
    assert.throws(
        () => evaluate(parseExpr('[] + [1]'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'positional argument 1 is an empty vector whose type cannot be inferred at 1:1-8'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('{a: []}.a'), ctx),
        undocValue([], { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }),
    )
    assert.throws(
        () => evaluate(parseExpr('[{a: []}, {b: [1]}]'), ctx),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'vector literal contains heterogenous types {a: []} and {b: [number]} at 1:1-19'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[{a: []}, {a: [1]}]'), ctx),
        undocValue([
            new Map<string, USSRawValue>([['a', []]]),
            new Map<string, USSRawValue>([['a', [1]]]),
        ], { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['a', { type: 'vector', elementType: { type: 'number' } }]]) } }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('[{a: []}, {a: []}]'), ctx),
        undocValue([
            new Map<string, USSRawValue>([['a', []]]),
            new Map<string, USSRawValue>([['a', []]]),
        ], { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['a', { type: 'vector', elementType: { type: 'elementOfEmptyVector' } }]]) } }),
    )
})

void test('mutate objects', (): void => {
    const ctx: Context = emptyContext()
    assert.deepStrictEqual(
        execute(parseProgram('a = {x: 1}; a.x = 2; a'), ctx),
        undocValue(new Map<string, USSRawValue>([['x', 2]]), { type: 'object', properties: new Map<string, USSType>([['x', numType]]) }),
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
        undocValue([
            new Map<string, USSRawValue>([['x', 2]]),
        ], { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } }),
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}]; a.x = 2; a'), ctx),
        undocValue([
            new Map<string, USSRawValue>([['x', 2]]),
        ], { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } }),
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}]; [a].x = 2; a'), ctx),
        undocValue([
            new Map<string, USSRawValue>([['x', 2]]),
        ], { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } }),
    )
    assert.deepStrictEqual(
        execute(parseProgram('a = [{x: 1}, {x: 2}, {x: 3}]; a.x = [2, 3, 4]; a'), ctx),
        undocValue([
            new Map<string, USSRawValue>([['x', 2]]),
            new Map<string, USSRawValue>([['x', 3]]),
            new Map<string, USSRawValue>([['x', 4]]),
        ], { type: 'vector', elementType: { type: 'object', properties: new Map<string, USSType>([['x', numType]]) } }),
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
        { value: Math.PI, type: numType, documentation: { humanReadableName: 'π', category: 'math', longDescription: 'The mathematical constant π (pi), approximately 3.14159, representing the ratio of a circle\'s circumference to its diameter.' } },
    )
    assert.throws(
        () => execute(parseProgram('pi = 3.14'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Cannot assign to constant "pi" at 1:1-2'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('sqrt([4, 9, 16, -1])'), emptyContext()),
        undocValue([2, 3, 4, NaN], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toNumber([1, 2, 3] == 2)'), emptyContext()),
        undocValue([0, 1, 0], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toString([1, 2, 3] == 2)'), emptyContext()),
        undocValue(['false', 'true', 'false'], { type: 'vector', elementType: stringType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toNumber([1, 2, 3])'), emptyContext()),
        undocValue([1, 2, 3], numVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toString([1, 2, 3])'), emptyContext()),
        undocValue(['1', '2', '3'], stringVectorType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('toNumber(["1", "0.75", "3.14", "3m"])'), emptyContext()),
        undocValue([1, 0.75, 3.14, 3e6], numVectorType),
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

    assert.deepStrictEqual(
        evaluate(parseExpr('regression(x1=[1, 2, 3], y=[4, 5, 6])'), emptyContext()),
        undocValue(new Map<string, USSRawValue>(
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
        ), regressionResultType(10)),
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
    ctx.assignVariable('x1', undocValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], numVectorType))
    ctx.assignVariable('x2', undocValue([1, 1, 1, 1, 1, 1, 1, 1, 2, 2], numVectorType))
    ctx.assignVariable('y', undocValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], numVectorType))
    ctx.assignVariable('w1', undocValue([1, 1, 1, 1, 1, 1, 1, 1, 1, 2], numVectorType))
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

void test('regression-nan-handling', (): void => {
    const ctx: Context = emptyContext()
    assertEquivalentRegressionOutput(
        evaluate(parseExpr('regression(x1=[1, 2, 3], y=[4, 5, NaN])'), ctx).value,
        new Map<string, USSRawValue>(
            [
                ['residuals', [0, 0, NaN]],
                ['m1', 1],
                ['b', 3],
                ['r2', 1],
            ],
        ),
    )
})

void test('value rendering', () => {
    // Numbers
    assert.strictEqual(renderValue(undocValue(42, numType)), '42')
    assert.strictEqual(renderValue(undocValue(3.14, numType)), '3.14')
    assert.strictEqual(renderValue(undocValue(NaN, numType)), 'NaN')
    assert.strictEqual(renderValue(undocValue(Infinity, numType)), 'Infinity')
    assert.strictEqual(renderValue(undocValue(-Infinity, numType)), '-Infinity')

    // Booleans
    assert.strictEqual(renderValue(undocValue(true, boolType)), 'true')
    assert.strictEqual(renderValue(undocValue(false, boolType)), 'false')

    // Strings
    assert.strictEqual(renderValue(undocValue('hello', stringType)), '"hello"')
    assert.strictEqual(renderValue(undocValue('', stringType)), '""')

    // Null
    assert.strictEqual(renderValue(undocValue(null, { type: 'null' })), 'null')

    // Vectors
    assert.strictEqual(
        renderValue(undocValue([1, 2, 3], numVectorType)),
        `[
    1,
    2,
    3
]`,
    )
    assert.strictEqual(
        renderValue(undocValue(['a', 'b'], { type: 'vector', elementType: stringType })),
        `[
    "a",
    "b"
]`,
    )
    assert.strictEqual(
        renderValue(undocValue([null, null], { type: 'vector', elementType: { type: 'null' } })),
        `[
    null,
    null
]`,
    )
    assert.strictEqual(
        renderValue(undocValue([[1, 2], [3, 4]], { type: 'vector', elementType: numVectorType })),
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
        renderValue(undocValue([], { type: 'vector', elementType: { type: 'elementOfEmptyVector' } })),
        `[]`,
    )

    // Objects
    assert.strictEqual(
        renderValue(undocValue(new Map<string, USSRawValue>([['a', 1], ['b', 'x']]), { type: 'object', properties: new Map<string, USSType>([['a', numType], ['b', stringType]]) })),
        `{
    a: 1,
    b: "x"
}`,
    )
    assert.strictEqual(
        renderValue(undocValue(new Map([['a', [1, 2]]]), { type: 'object', properties: new Map([['a', numVectorType]]) })),
        `{
    a: [
        1,
        2
    ]
}`,
    )
    assert.strictEqual(
        renderValue(undocValue(new Map<string, USSRawValue>(), { type: 'object', properties: new Map<string, USSType>([]) })),
        `{}`,
    )

    // Nested objects and vectors
    assert.strictEqual(
        renderValue(undocValue([new Map([['x', 1]]), new Map([['x', 2]])], { type: 'vector', elementType: { type: 'object', properties: new Map([['x', numType]]) } })),
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
        renderValue(undocValue(new Map([['v', [1, 2, 3]]]), { type: 'object', properties: new Map([['v', numVectorType]]) })),
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
        renderValue(undocValue(testFn1, testFnType)),
        '(number; a: number) -> number',
    )
    assert.strictEqual(
        renderValue(undocValue([testFn1, testFn2], { type: 'vector', elementType: testFnType })),
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
        undocValue([NaN, 3, 3], numVectorType),
    )
    assert.throws(
        () => execute(parseProgram('x = [2,  3, 4, 5]; y = [1, 2, 3, 4]; condition(x > 3)'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'condition(..) must be followed by at least one statement at 1:38-53'
        },
    )
})

/* eslint-disable no-restricted-syntax -- Just for testing */
void test('colors', (): void => {
    assert.deepStrictEqual(
        evaluate(parseExpr('rgb(1, 0, 0)'), emptyContext()),
        undocValue({ type: 'opaque', opaqueType: 'color', value: { r: 255, g: 0, b: 0, a: 255 } }, colorType),
    )
    assert.deepStrictEqual(
        renderValue(evaluate(parseExpr('rgb(1, 0, 0)'), emptyContext())),
        'rgb(1, 0, 0)',
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('rgb([1, 0.5, 0.75], 0, 0)'), emptyContext()),
        undocValue([
            { type: 'opaque', opaqueType: 'color', value: { r: 255, g: 0, b: 0, a: 255 } },
            { type: 'opaque', opaqueType: 'color', value: { r: 128, g: 0, b: 0, a: 255 } },
            { type: 'opaque', opaqueType: 'color', value: { r: 191, g: 0, b: 0, a: 255 } },
        ], { type: 'vector', elementType: colorType }),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('renderColor(rgb([1, 0.5, 0.75], 0, [0.9, 1.0, 0.2]))'), emptyContext()),
        undocValue(['#ff00e6', '#8000ff', '#bf0033'], { type: 'vector', elementType: { type: 'string' } }),
    )
    assert.throws(
        () => evaluate(parseExpr('rgb(2, 0, 0)'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'Error while executing function: Error: RGB values must be between 0 and 1, got (2, 0, 0, 1) at 1:1-12'
        },
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('hsv([0, 60, 120], 1, 0.5)'), emptyContext()),
        undocValue([
            { type: 'opaque', opaqueType: 'color', value: { r: 128, g: 0, b: 0, a: 255 } }, // Red
            { type: 'opaque', opaqueType: 'color', value: { r: 128, g: 128, b: 0, a: 255 } }, // Yellow
            { type: 'opaque', opaqueType: 'color', value: { r: 0, g: 128, b: 0, a: 255 } }, // Green
        ], { type: 'vector', elementType: colorType }),
    )
    assert.throws(
        () => evaluate(parseExpr('hsv(400, 1, 0.5)'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof Error && err.message === 'Error while executing function: Error: HSV values must be (hue: 0-360, saturation: 0-1, value: 0-1, alpha: 0-1), got (400, 1, 0.5, 1) at 1:1-16'
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
        undocValue({ type: 'opaque', opaqueType: 'ramp', value: [[0, '#000000'], [1, '#ffffff']] }, { type: 'opaque', name: 'ramp' }),
    )

    // Ramp with multiple stops
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: rgb(0, 0, 0)}, {value: 0.5, color: rgb(0.5, 0.5, 0.5)}, {value: 1, color: rgb(1, 1, 1)}])'), emptyContext()),
        undocValue({ type: 'opaque', opaqueType: 'ramp', value: [[0, '#000000'], [0.5, '#808080'], [1, '#ffffff']] }, { type: 'opaque', name: 'ramp' }),
    )

    // Ramp with HSV colors
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: hsv(0, 1, 0.5)}, {value: 1, color: hsv(120, 1, 0.5)}])'), emptyContext()),
        undocValue({ type: 'opaque', opaqueType: 'ramp', value: [[0, '#800000'], [1, '#008000']] }, { type: 'opaque', name: 'ramp' }),
    )

    // Ramp with mixed color types
    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: rgb(1, 0, 0)}, {value: 0.5, color: hsv(120, 1, 0.5)}, {value: 1, color: rgb(0, 0, 1)}])'), emptyContext()),
        undocValue({ type: 'opaque', opaqueType: 'ramp', value: [[0, '#ff0000'], [0.5, '#008000'], [1, '#0000ff']] }, { type: 'opaque', name: 'ramp' }),
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
        '[ramp [\n    {\n        value: 0,\n        color: rgb(0, 0, 0)\n    },\n    {\n        value: 1,\n        color: rgb(1, 1, 1)\n    }\n]]',
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
    ctx.assignVariable('red', undocValue({ type: 'opaque', opaqueType: 'color', value: { r: 255, g: 0, b: 0, a: 255 } }, { type: 'opaque', name: 'color' }))
    ctx.assignVariable('blue', undocValue({ type: 'opaque', opaqueType: 'color', value: { r: 0, g: 0, b: 255, a: 255 } }, { type: 'opaque', name: 'color' }))

    assert.deepStrictEqual(
        evaluate(parseExpr('constructRamp([{value: 0, color: red}, {value: 1, color: blue}])'), ctx),
        undocValue({ type: 'opaque', opaqueType: 'ramp', value: [[0, '#ff0000'], [1, '#0000ff']] }, { type: 'opaque', name: 'ramp' }),
    )

    // Test reverseRamp function
    const ramp = evaluate(parseExpr('constructRamp([{value: 0, color: red}, {value: 0.3, color: rgb(0.5, 0.5, 0.5)}, {value: 1, color: blue}])'), ctx)
    ctx.assignVariable('testRamp', ramp)
    assert.deepStrictEqual(
        evaluate(parseExpr('reverseRamp(testRamp)'), ctx),
        undocValue({ type: 'opaque', opaqueType: 'ramp', value: [[0, '#0000ff'], [0.7, '#808080'], [1, '#ff0000']] }, { type: 'opaque', name: 'ramp' }),
    )
})
/* eslint-enable no-restricted-syntax */

function assertScale(descriptor: ScaleDescriptor, values: number[], proportions: number[]): void {
    const scale = instantiate(descriptor)
    assert.strict(close(proportions, values.map(scale.forward)), `Scale forward mapping failed: ${JSON.stringify(proportions)} != ${JSON.stringify(values.map(scale.forward))}`)
    assert.strict(close(values, proportions.map(scale.inverse)), `Scale inverse mapping failed: ${JSON.stringify(values)} != ${JSON.stringify(proportions.map(scale.inverse))}`)
}

void test('test basic map', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=rampBone)'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    assertScale(resultMapRaw.scale, [1, 1.5, 2, 2.5, 3], [0, 0.25, 0.5, 0.75, 1])
    assert.deepStrictEqual(effects, [{
        type: 'warning',
        message: 'Label could not be derived for map, please pass label="<your label here>" to cMap(...)',
        location: {
            start: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
            end: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
        },
    }])
})

void test('test basic map, default geo', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = execute(parseProgram('cMap(data=[1, 2, 3], scale=linearScale(), ramp=rampBone)'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    assertScale(resultMapRaw.scale, [1, 1.5, 2, 2.5, 3], [0, 0.25, 0.5, 0.75, 1])
    assert.deepStrictEqual(effects, [{
        type: 'warning',
        message: 'Label could not be derived for map, please pass label="<your label here>" to cMap(...)',
        location: {
            start: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
            end: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
        },
    }])
})

void test('test basic map with label passed', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=rampBone, label="Test Map")'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    assertScale(resultMapRaw.scale, [1, 1.5, 2, 2.5, 3], [0, 0.25, 0.5, 0.75, 1])
    assert.deepStrictEqual(resultMapRaw.label, 'Test Map')
    assert.deepStrictEqual(effects, [])
})

void test('test basic map with geometric', () => {
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 4], scale=logScale(), ramp=rampBone)'), emptyContextWithInsets())
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 4])
    assertScale(resultMapRaw.scale, [1, Math.sqrt(2), 2, 2 * Math.sqrt(2), 4], [0, 0.25, 0.5, 0.75, 1])
})

void test('map with only one value', () => {
    const ctx = emptyContextWithInsets()
    // Create a custom geo variable with only one value for this test
    ctx.assignVariable('geo', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } },
        value: [{ type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'A' }],
        documentation: { humanReadableName: 'Geography' },
    })
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[11.2], scale=linearScale(), ramp=rampBone)'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A'])
    assert.deepStrictEqual(resultMapRaw.data, [11.2])
    assert.deepStrictEqual(resultMapRaw.ramp, getRamps().Bone)
    assertScale(resultMapRaw.scale, [10, 11, 12], [-0.7, 0.3, 1.3])
})

void test('custom map', () => {
    const program = `
    ramp = constructRamp([
        {value: 0, color: rgb(0, 0, 0)},
        {value: 0.5, color: rgb(0.5, 0.5, 0.5)},
        {value: 1, color: rgb(1, 1, 1)}
    ]);
    cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=ramp)
    `
    const resultMap = execute(parseProgram(program), emptyContextWithInsets())
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    // eslint-disable-next-line no-restricted-syntax -- Just for testing
    assert.deepStrictEqual(resultMapRaw.ramp, [[0, '#000000'], [0.5, '#808080'], [1, '#ffffff']])
    assertScale(resultMapRaw.scale, [1, 1.5, 2, 2.5, 3], [0, 0.25, 0.5, 0.75, 1])
})

void test('conditional map', () => {
    const ctx = emptyContextWithInsets()
    // Create a custom geo variable with 4 values for this test
    ctx.assignVariable('geo', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } },
        value: [
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'A' },
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'B' },
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'C' },
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'D' },
        ],
        documentation: { humanReadableName: 'Geography' },
    })
    const program = `
    data = [1, 2, 3, 4];
    mask = [true, true, false, false]
    if (mask) {
        cMap(geo=geo, data=data, scale=linearScale(), ramp=rampBone)
    }
    `
    const resultMap = execute(parseProgram(program), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2])
})

void test('error map with different geo and data lengths', () => {
    const ctx = emptyContextWithInsets()
    // Create a custom geo variable with 2 values for this test
    ctx.assignVariable('geo', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } },
        value: [
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'A' },
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'B' },
        ],
        documentation: { humanReadableName: 'Geography' },
    })
    assert.throws(
        () => evaluate(parseExpr('cMap(geo=geo, data=[1], scale=linearScale(), ramp=rampBone)'), ctx),
        (err: Error): boolean => {
            return err.message === 'Error while executing function: Error: geo and data must have the same length: 2 and 1 at 1:1-59'
        },
    )
})

void test('map with documentation', () => {
    const ctx = emptyContextWithInsets()
    ctx.assignVariable('x', {
        type: numVectorType,
        value: [1, 2, 3],
        documentation: {
            humanReadableName: 'X value!',
        },
    })
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=x, scale=linearScale(), ramp=rampBone)'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.label, 'X value!')
})

void test('conditioned map with documentation', () => {
    const ctx = emptyContextWithInsets()
    ctx.assignVariable('x', {
        type: numVectorType,
        value: [1, 2, 3],
        documentation: {
            humanReadableName: 'X value!',
        },
    })
    const resultMap = evaluate(parseExpr('if ([true, true, false]) { cMap(geo=geo, data=x, scale=linearScale(), ramp=rampBone) }'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.label, 'X value!')
})

void test('test scale functions with parameters', () => {
    // Test linearScale with no parameters
    const linearResult = evaluate(parseExpr('linearScale()'), emptyContext())
    const linearScaleFn = linearResult.value as { type: 'opaque', value: Scale }
    const linearDescriptor = linearScaleFn.value([1, 2, 3, 4, 5])
    assert.deepStrictEqual(linearDescriptor, {
        kind: 'linear',
        min: 1,
        max: 5,
    })

    // Test linearScale with min and max
    const linearWithMinMax = evaluate(parseExpr('linearScale(min=0, max=10)'), emptyContext())
    const linearWithMinMaxFn = linearWithMinMax.value as { type: 'opaque', value: Scale }
    const linearWithMinMaxDescriptor = linearWithMinMaxFn.value([1, 2, 3, 4, 5])
    assert.deepStrictEqual(linearWithMinMaxDescriptor, {
        kind: 'linear',
        min: 0,
        max: 10,
    })

    // Test linearScale with consistent center
    const linearWithCenter = evaluate(parseExpr('linearScale(min=0, max=10, center=5)'), emptyContext())
    const linearWithCenterFn = linearWithCenter.value as { type: 'opaque', value: Scale }
    const linearWithCenterDescriptor = linearWithCenterFn.value([1, 2, 3, 4, 5])
    assert.deepStrictEqual(linearWithCenterDescriptor, {
        kind: 'linear',
        min: 0,
        max: 10,
    })

    // Test linearScale with inconsistent center (should throw when called with data)
    const linearWithInconsistentCenter = evaluate(parseExpr('linearScale(min=0, max=10, center=3)'), emptyContext())
    const inconsistentScaleFn = linearWithInconsistentCenter.value as { type: 'opaque', value: Scale }
    assert.throws(
        () => inconsistentScaleFn.value([1, 2, 3]),
        (err: Error): boolean => {
            return err.message.includes('Inconsistent parameters: center 3 does not equal (min + max) / 2 = 10 / 2')
        },
    )

    // Test scale instantiation and forward/inverse mapping
    const scaleInstance = instantiate(linearWithMinMaxDescriptor)
    assert.strictEqual(scaleInstance.forward(0), 0) // min maps to 0
    assert.strictEqual(scaleInstance.forward(10), 1) // max maps to 1
    assert.strictEqual(scaleInstance.forward(5), 0.5) // center maps to 0.5
    assert.strictEqual(scaleInstance.inverse(0), 0) // 0 maps back to min
    assert.strictEqual(scaleInstance.inverse(1), 10) // 1 maps back to max
    assert.strictEqual(scaleInstance.inverse(0.5), 5) // 0.5 maps back to center

    // Test edge cases: single value
    const singleValueScale = evaluate(parseExpr('linearScale()'), emptyContext())
    const singleValueScaleFn = singleValueScale.value as { type: 'opaque', value: Scale }
    const singleValueDescriptor = singleValueScaleFn.value([42])
    assert.deepStrictEqual(singleValueDescriptor, {
        kind: 'linear',
        min: 42,
        max: 42,
    })

    // Test edge cases: empty array (should handle gracefully)
    const emptyArrayScale = evaluate(parseExpr('linearScale()'), emptyContext())
    const emptyArrayScaleFn = emptyArrayScale.value as { type: 'opaque', value: Scale }
    const emptyArrayDescriptor = emptyArrayScaleFn.value([])
    assert.deepStrictEqual(emptyArrayDescriptor, {
        kind: 'linear',
        min: Infinity,
        max: -Infinity,
    })

    // Test edge cases: NaN values are filtered out
    const nanScale = evaluate(parseExpr('linearScale()'), emptyContext())
    const nanScaleFn = nanScale.value as { type: 'opaque', value: Scale }
    const nanDescriptor = nanScaleFn.value([1, NaN, 3, NaN, 5])
    assert.deepStrictEqual(nanDescriptor, {
        kind: 'linear',
        min: 1,
        max: 5,
    })

    // --- Additional tests for partial parameter specification ---
    // Only min provided
    const linearOnlyMin = evaluate(parseExpr('linearScale(min=2)'), emptyContext())
    const linearOnlyMinFn = linearOnlyMin.value as { type: 'opaque', value: Scale }
    assert.deepStrictEqual(linearOnlyMinFn.value([2, 4, 6]), {
        kind: 'linear',
        min: 2,
        max: 6,
    })
    // Only max provided
    const linearOnlyMax = evaluate(parseExpr('linearScale(max=7)'), emptyContext())
    const linearOnlyMaxFn = linearOnlyMax.value as { type: 'opaque', value: Scale }
    assert.deepStrictEqual(linearOnlyMaxFn.value([2, 4, 6]), {
        kind: 'linear',
        min: 2,
        max: 7,
    })
    // Only center provided
    const linearOnlyCenter = evaluate(parseExpr('linearScale(center=5)'), emptyContext())
    const linearOnlyCenterFn = linearOnlyCenter.value as { type: 'opaque', value: Scale }
    assert.deepStrictEqual(linearOnlyCenterFn.value([2, 4, 6]), {
        kind: 'linear',
        min: 2,
        max: 8,
    })
    // min and max provided
    const linearMinMax = evaluate(parseExpr('linearScale(min=1, max=9)'), emptyContext())
    const linearMinMaxFn = linearMinMax.value as { type: 'opaque', value: Scale }
    assert.deepStrictEqual(linearMinMaxFn.value([2, 4, 6]), {
        kind: 'linear',
        min: 1,
        max: 9,
    })
    // min and center provided
    const linearMinCenter = evaluate(parseExpr('linearScale(min=1, center=5)'), emptyContext())
    const linearMinCenterFn = linearMinCenter.value as { type: 'opaque', value: Scale }
    assert.deepStrictEqual(linearMinCenterFn.value([2, 4, 6]), {
        kind: 'linear',
        min: 1,
        max: 9,
    })
    // max and center provided
    const linearMaxCenter = evaluate(parseExpr('linearScale(max=9, center=5)'), emptyContext())
    const linearMaxCenterFn = linearMaxCenter.value as { type: 'opaque', value: Scale }
    assert.deepStrictEqual(linearMaxCenterFn.value([2, 4, 6]), {
        kind: 'linear',
        min: 1,
        max: 9,
    })
})

function closeLogScale(
    actual: { kind: 'log', linearScale: { kind: 'linear', min: number, max: number } },
    expected: { kind: 'log', linearScale: { kind: 'linear', min: number, max: number } },
    tol = 1e-10,
): void {
    assert.strictEqual(actual.kind, expected.kind)
    assert.strictEqual(actual.linearScale.kind, expected.linearScale.kind)
    assert(Math.abs(actual.linearScale.min - expected.linearScale.min) < tol, `min: ${actual.linearScale.min} vs ${expected.linearScale.min}`)
    assert(Math.abs(actual.linearScale.max - expected.linearScale.max) < tol, `max: ${actual.linearScale.max} vs ${expected.linearScale.max}`)
}

void test('test log scale functions with parameters', () => {
    // Test logScale with no parameters
    const logResult = evaluate(parseExpr('logScale()'), emptyContext())
    const logScaleFn = logResult.value as { type: 'opaque', value: Scale }
    const logDescriptor = logScaleFn.value([1, 10, 100])
    if (logDescriptor.kind === 'log') {
        closeLogScale(logDescriptor, {
            kind: 'log',
            linearScale: {
                kind: 'linear',
                min: 0, // log(1) = 0
                max: Math.log(100), // log(100) = 4.605...
            },
        })
    }
    else {
        assert.fail('Expected log scale descriptor')
    }

    // Test logScale with min and max
    const logWithMinMax = evaluate(parseExpr('logScale(min=1, max=1000)'), emptyContext())
    const logWithMinMaxFn = logWithMinMax.value as { type: 'opaque', value: Scale }
    const logWithMinMaxDescriptor = logWithMinMaxFn.value([10, 100, 1000])
    if (logWithMinMaxDescriptor.kind === 'log') {
        closeLogScale(logWithMinMaxDescriptor, {
            kind: 'log',
            linearScale: {
                kind: 'linear',
                min: Math.log(1), // log(1) = 0
                max: Math.log(1000), // log(1000) = 6.908...
            },
        })
    }
    else {
        assert.fail('Expected log scale descriptor')
    }

    // Test logScale with min and center
    const logWithMinCenter = evaluate(parseExpr('logScale(min=1, center=10)'), emptyContext())
    const logWithMinCenterFn = logWithMinCenter.value as { type: 'opaque', value: Scale }
    const logWithMinCenterDescriptor = logWithMinCenterFn.value([2, 5, 20])
    if (logWithMinCenterDescriptor.kind === 'log') {
        closeLogScale(logWithMinCenterDescriptor, {
            kind: 'log',
            linearScale: {
                kind: 'linear',
                min: Math.log(1), // log(1) = 0
                max: 2 * Math.log(10) - Math.log(1), // 2 * log(10) - log(1) = 2 * 2.303 - 0 = 4.606
            },
        })
    }
    else {
        assert.fail('Expected log scale descriptor')
    }

    // Test logScale with max and center
    const logWithMaxCenter = evaluate(parseExpr('logScale(max=100, center=10)'), emptyContext())
    const logWithMaxCenterFn = logWithMaxCenter.value as { type: 'opaque', value: Scale }
    const logWithMaxCenterDescriptor = logWithMaxCenterFn.value([2, 5, 20])
    if (logWithMaxCenterDescriptor.kind === 'log') {
        closeLogScale(logWithMaxCenterDescriptor, {
            kind: 'log',
            linearScale: {
                kind: 'linear',
                min: 2 * Math.log(10) - Math.log(100), // 2 * log(10) - log(100) = 2 * 2.303 - 4.605 = 0
                max: Math.log(100), // log(100) = 4.605
            },
        })
    }
    else {
        assert.fail('Expected log scale descriptor')
    }

    // Test logScale with only center (should use data bounds)
    const logWithCenter = evaluate(parseExpr('logScale(center=10)'), emptyContext())
    const logWithCenterFn = logWithCenter.value as { type: 'opaque', value: Scale }
    const logWithCenterDescriptor = logWithCenterFn.value([2, 5, 50])
    if (logWithCenterDescriptor.kind === 'log') {
        closeLogScale(logWithCenterDescriptor, {
            kind: 'log',
            linearScale: {
                kind: 'linear',
                min: Math.log(2),
                max: Math.log(50),
            },
        })
    }
    else {
        assert.fail('Expected log scale descriptor')
    }
})

void test('custom node type checking', (): void => {
    // Test that custom node with correct type passes
    const correctTypeCustomNode = parseNoErrorAsCustomNode('2 + 3', 'test', [numType])
    const result = evaluate(correctTypeCustomNode, emptyContext())
    assert.strictEqual(result.value, 5)
    assert.deepStrictEqual(result.type, numType)

    // Test that custom node with incorrect type throws error
    const incorrectTypeCustomNode = parseNoErrorAsCustomNode('2 + 3', 'test', [stringType])
    assert.throws(
        () => evaluate(incorrectTypeCustomNode, emptyContext()),
        (err: Error): boolean => {
            return err.message.includes('Custom expression expected to return type string, but got number')
        },
    )

    // Test that custom node with boolean type works correctly
    const booleanCustomNode = parseNoErrorAsCustomNode('true', 'test', [boolType])
    const boolResult = evaluate(booleanCustomNode, emptyContext())
    assert.strictEqual(boolResult.value, true)
    assert.deepStrictEqual(boolResult.type, boolType)

    // Test that custom node with boolean type but wrong expression throws error
    const wrongBooleanCustomNode = parseNoErrorAsCustomNode('2 + 3', 'test', [boolType])
    assert.throws(
        () => evaluate(wrongBooleanCustomNode, emptyContext()),
        (err: Error): boolean => {
            return err.message.includes('Custom expression expected to return type boolean, but got number')
        },
    )

    // Test that custom node without expectedType works (no type checking)
    const noTypeCustomNode = parseNoErrorAsCustomNode('2 + 3', 'test')
    const noTypeResult = evaluate(noTypeCustomNode, emptyContext())
    assert.strictEqual(noTypeResult.value, 5)
    assert.deepStrictEqual(noTypeResult.type, numType)
})

void test('test basic map with outline', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=rampBone, outline=constructOutline(color=rgb(1, 0, 0), weight=2))'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    assert.deepStrictEqual(resultMapRaw.outline, { color: { r: 255, g: 0, b: 0, a: 255 }, weight: 2 })
})

void test('test basic map with default outline', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=rampBone)'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    assert.deepStrictEqual(resultMapRaw.outline, { color: { r: 0, g: 0, b: 0, a: 255 }, weight: 0 })
})

void test('test constructOutline function', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const result = evaluate(parseExpr('constructOutline(color=rgb(0, 1, 0), weight=3)'), ctx)
    assert.deepStrictEqual(result.type, { type: 'opaque', name: 'outline' })
    const outline = (result.value as { type: 'opaque', value: Outline }).value
    assert.deepStrictEqual(outline, { color: { r: 0, g: 255, b: 0, a: 255 }, weight: 3 })
})

void test('test basic map with outline', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=rampBone, outline=constructOutline(color=rgb(1, 0, 0), weight=2))'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    assert.deepStrictEqual(resultMapRaw.outline, { color: { r: 255, g: 0, b: 0, a: 255 }, weight: 2 })
})

void test('test canUnifyTo', () => {
    assert(canUnifyTo(numType, numType))
    assert(canUnifyTo(numType, { type: 'vector', elementType: numType }))
    assert(!canUnifyTo({ type: 'vector', elementType: numType }, numType))
})

void test('evaluate do nodes', (): void => {
    // Basic do node
    assert.deepStrictEqual(
        evaluate(parseExpr('do { 1; 2; 3 }'), emptyContext()),
        undocValue(3, numType),
    )

    // Do node with variable assignment
    assert.deepStrictEqual(
        evaluate(parseExpr('do { x = 1; y = x + 2; y }'), emptyContext()),
        undocValue(3, numType),
    )

    // Do node with conditional
    const ctxWithX = emptyContext()
    ctxWithX.assignVariable('x', undocValue(3, numType))
    assert.deepStrictEqual(
        evaluate(parseExpr('do { if (x > 2) { y = 1 } else { y = 2 }; y }'), ctxWithX),
        undocValue(1, numType),
    )

    // Do node with multiple statements
    assert.deepStrictEqual(
        evaluate(parseExpr('do { x = 1; y = 2; z = x + y; z }'), emptyContext()),
        undocValue(3, numType),
    )

    // Do node with error
    assert.throws(
        () => evaluate(parseExpr('do { x = 1; y = x + "hello"; y }'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Invalid types for operator +: number and string at 1:17-27'
        },
    )

    // Nested do nodes
    assert.deepStrictEqual(
        evaluate(parseExpr('do { x = 1; do { y = x + 2 }; y }'), emptyContext()),
        undocValue(3, numType),
    )

    // Do node with undefined variable
    assert.throws(
        () => evaluate(parseExpr('do { x = 1; y = z + 2; y }'), emptyContext()),
        (err: Error): boolean => {
            return err instanceof InterpretationError && err.message === 'Undefined variable: z at 1:17'
        },
    )

    // Do node as part of an operator expression
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + (do { x = 3 + 4; x })'), emptyContext()),
        undocValue(9, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('(do { x = 3 + 4; x }) + 2'), emptyContext()),
        undocValue(9, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('2 + (do { x = 3 + 4; x }) + (do { y = 10; y })'), emptyContext()),
        undocValue(19, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('(do { x = 3 + 4; x }) + x'), emptyContext()),
        undocValue(14, numType),
    )
    assert.deepStrictEqual(
        evaluate(parseExpr('(do { x = 1; do { y = x + 2 }; y }) + 1'), emptyContext()),
        undocValue(4, numType),
    )
})

void test('test basic map with custom insets', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)
    const resultMap = evaluate(parseExpr('cMap(geo=geo, data=[1, 2, 3], scale=linearScale(), ramp=rampBone, insets=constructInsets([insetworld]))'), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B', 'C'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2, 3])
    // Check that insets are properly set
    assert.strictEqual(Array.isArray(resultMapRaw.insets), true)
    assert.strictEqual(resultMapRaw.insets.length > 0, true)
    // Verify it's the world insets (should have main map)
    const hasMainMap = resultMapRaw.insets.some(inset => inset.mainMap)
    assert.strictEqual(hasMainMap, true)
    assert.deepStrictEqual(effects, [{
        type: 'warning',
        message: 'Label could not be derived for map, please pass label="<your label here>" to cMap(...)',
        location: {
            start: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
            end: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
        },
    }])
})

void test('test basic map with constructed insets', () => {
    const effects: Effect[] = []
    const ctx = emptyContextWithInsets(effects)

    // Create a custom geo variable with 2 values for this test
    ctx.assignVariable('geo', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } },
        value: [
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'A' },
            { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'B' },
        ],
        documentation: { humanReadableName: 'Geography' },
    })

    // Create custom insets using constructInset
    const program = `
    mainInset = constructInset(
        screenBounds={west: 0, south: 0, east: 1, north: 1},
        mapBounds={west: -180, south: -90, east: 180, north: 90},
        mainMap=true,
        name="World"
    );
    smallInset = constructInset(
        screenBounds={west: 0.7, south: 0.7, east: 1, north: 1},
        mapBounds={west: -170, south: 50, east: -130, north: 70},
        mainMap=false,
        name="Alaska"
    );
    customInsets = constructInsets([mainInset, smallInset]);
    cMap(geo=geo, data=[1, 2], scale=linearScale(), ramp=rampBone, insets=customInsets)
    `

    const resultMap = execute(parseProgram(program), ctx)
    assert.deepStrictEqual(resultMap.type, { type: 'opaque', name: 'cMap' })
    const resultMapRaw = (resultMap.value as { type: 'opaque', value: CMap }).value
    assert.deepStrictEqual(resultMapRaw.geo, ['A', 'B'])
    assert.deepStrictEqual(resultMapRaw.data, [1, 2])

    // Check that custom insets are properly set
    assert.strictEqual(Array.isArray(resultMapRaw.insets), true)
    assert.strictEqual(resultMapRaw.insets.length, 2)

    // Verify the main inset
    const mainInset = resultMapRaw.insets.find(inset => inset.mainMap)
    assert.strictEqual(mainInset !== undefined, true)
    assert.deepStrictEqual(mainInset!.bottomLeft, [0, 0])
    assert.deepStrictEqual(mainInset!.topRight, [1, 1])

    // Verify the Alaska inset
    const alaskaInset = resultMapRaw.insets.find(inset => !inset.mainMap)
    assert.strictEqual(alaskaInset !== undefined, true)
    assert.deepStrictEqual(alaskaInset!.bottomLeft, [0.7, 0.7])
    assert.deepStrictEqual(alaskaInset!.topRight, [1, 1])

    // Verify coordBox is properly converted to array
    assert.ok(Array.isArray(alaskaInset!.coordBox))
    assert.deepStrictEqual(alaskaInset!.coordBox, [-170, 50, -130, 70])

    assert.deepStrictEqual(effects, [{
        type: 'warning',
        message: 'Label could not be derived for map, please pass label="<your label here>" to cMap(...)',
        location: {
            start: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
            end: { charIdx: 0, lineIdx: 0, colIdx: 0, block: { type: 'multi' } },
        },
    }])
})
