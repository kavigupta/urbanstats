import assert from 'assert/strict'
import { test } from 'node:test'

import { Context } from '../src/urban-stats-script/context'
import { Effect, evaluate, execute } from '../src/urban-stats-script/interpreter'
import { LocInfo } from '../src/urban-stats-script/location'
import { USSValue, undocValue } from '../src/urban-stats-script/types-values'

import { numType, parseExpr, parseProgram, testingContext } from './urban-stats-script-utils'

void test('deprecation warnings for variables', (): void => {
    const effects: Effect[] = []
    const errors: { msg: string, location: LocInfo }[] = []
    const env = new Map<string, USSValue>([
        [
            'oldVariable',
            {
                value: 42,
                type: numType,
                documentation: {
                    humanReadableName: 'Old Variable',
                    deprecated: 'Use newVariable instead, which has better performance',
                },
            },
        ],
        ['newVariable', undocValue(100, numType)],
    ])

    const ctx = testingContext(effects, errors, env)

    const result = evaluate(parseExpr('oldVariable'), ctx)

    assert.deepStrictEqual(result, {
        value: 42,
        type: numType,
        documentation: {
            humanReadableName: 'Old Variable',
            deprecated: 'Use newVariable instead, which has better performance',
        },
    })

    assert.strictEqual(effects.length, 1)
    assert.strictEqual(effects[0].type, 'warning')
    assert.strictEqual(
        effects[0].message,
        'Deprecated: Use newVariable instead, which has better performance',
    )
})

void test('deprecation warnings for functions', (): void => {
    const effects: Effect[] = []
    const errors: { msg: string, location: LocInfo }[] = []
    const env = new Map<string, USSValue>([
        [
            'oldFunc',
            {
                value: (ctx: Context, posArgs: unknown[]) => {
                    return (posArgs[0] as number) * 2
                },
                type: {
                    type: 'function',
                    posArgs: [{ type: 'concrete', value: numType }],
                    namedArgs: {},
                    returnType: { type: 'concrete', value: numType },
                },
                documentation: {
                    humanReadableName: 'Old Function',
                    deprecated: 'This function is outdated. Use newFunc() instead.',
                },
            },
        ],
    ])

    const ctx = testingContext(effects, errors, env)

    const result = evaluate(parseExpr('oldFunc(5)'), ctx)

    assert.strictEqual(effects.length, 1)
    assert.strictEqual(effects[0].type, 'warning')
    assert.strictEqual(effects[0].message, 'Deprecated: This function is outdated. Use newFunc() instead.')

    assert.deepStrictEqual(result.value, 10)
})

void test('no warning for non-deprecated variables', (): void => {
    const effects: Effect[] = []
    const errors: { msg: string, location: LocInfo }[] = []
    const env = new Map<string, USSValue>([
        ['normalVariable', undocValue(42, numType)],
    ])

    const ctx = testingContext(effects, errors, env)

    evaluate(parseExpr('normalVariable'), ctx)

    assert.strictEqual(effects.length, 0)
})

void test('deprecation warning in complex expression', (): void => {
    const effects: Effect[] = []
    const errors: { msg: string, location: LocInfo }[] = []
    const env = new Map<string, USSValue>([
        [
            'deprecated_x',
            {
                value: 10,
                type: numType,
                documentation: {
                    humanReadableName: 'Deprecated X',
                    deprecated: 'Use x instead',
                },
            },
        ],
        ['y', undocValue(20, numType)],
    ])

    const ctx = testingContext(effects, errors, env)

    const result = evaluate(parseExpr('deprecated_x + y'), ctx)

    assert.strictEqual(effects.length, 1)
    assert.strictEqual(effects[0].type, 'warning')
    assert.strictEqual(effects[0].message, 'Deprecated: Use x instead')

    assert.deepStrictEqual(result.value, 30)
})

void test('deprecation warning is emitted only on direct use in selector context', (): void => {
    const effects: Effect[] = []
    const errors: { msg: string, location: LocInfo }[] = []
    const env = new Map<string, USSValue>([
        [
            'oldStat',
            {
                value: [1, 2, 3],
                type: { type: 'vector', elementType: numType },
                documentation: {
                    humanReadableName: 'Old Statistic',
                    deprecated: 'This statistic was replaced by newStat with better methodology',
                    fromStatisticColumn: true,
                },
            },
        ],
    ])

    const ctx = testingContext(effects, errors, env)

    evaluate(parseExpr('oldStat'), ctx)

    assert.strictEqual(effects.length, 1)
    assert.strictEqual(effects[0].type, 'warning')
    assert.strictEqual(
        effects[0].message,
        'Deprecated: This statistic was replaced by newStat with better methodology',
    )
})

void test('deprecation warning in custom node context', (): void => {
    const effects: Effect[] = []
    const errors: { msg: string, location: LocInfo }[] = []
    const program = parseProgram(`
do {
    result = deprecatedValue + 10;
    result
}
`)

    const env = new Map<string, USSValue>([
        [
            'deprecatedValue',
            {
                value: 5,
                type: numType,
                documentation: {
                    humanReadableName: 'Deprecated Value',
                    deprecated: 'Use newValue instead for better precision',
                },
            },
        ],
    ])

    const ctx = testingContext(effects, errors, env)

    execute(program, ctx)

    assert(effects.length > 0, 'Expected at least one deprecation warning')
    assert(
        effects.some((w) => {
            const message = w.message
            return message.includes('Use newValue instead')
        }),
        'Expected warning about deprecatedValue',
    )
})
