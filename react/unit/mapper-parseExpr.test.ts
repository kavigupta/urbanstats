import assert from 'assert/strict'
import { test } from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { parseExpr } from '../src/mapper/settings/parseExpr'
import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { parse, unparse } from '../src/urban-stats-script/parser'
import type { TypeEnvironment, USSType } from '../src/urban-stats-script/types-values'

import { numVectorType } from './urban-stats-script-utils'

const testBlock = { type: 'single' as const, ident: 'test' }

const numVectorVectorType = { type: 'vector', elementType: numVectorType } as const

function createTypeEnvironment(): TypeEnvironment {
    return defaultTypeEnvironment('world')
}

function getExpr(code: string): UrbanStatsASTExpression {
    const parsed = parse(code, testBlock)
    if (parsed.type !== 'expression') {
        throw new Error(`Expected expression, received ${parsed.type}`)
    }
    return parsed.value
}

function customNode(code: string): string {
    return `customNode(${JSON.stringify(code)})`
}

void test('simple expression parses correctly', (): void => {
    const parsed = getExpr(`[${customNode('population')}, density_pw_1km]`)
    const typeEnv = createTypeEnvironment()
    const result = parseExpr(
        parsed,
        'test',
        [numVectorVectorType],
        typeEnv,
        () => {
            throw new Error('Fallback should not be called for valid expression')
        },
        false,
    )
    assert.strictEqual(unparse(result), '[population, density_pw_1km]')
})

void test('simple expression nested customNode parses correctly', (): void => {
    const parsed = getExpr(`[${customNode('population')}, ${customNode('density_pw_1km')}]`)
    const typeEnv = createTypeEnvironment()
    const result = parseExpr(
        parsed,
        'test',
        [numVectorVectorType],
        typeEnv,
        () => {
            throw new Error('Fallback should not be called for valid expression')
        },
        false,
    )
    assert.strictEqual(unparse(result), '[population, density_pw_1km]')
})

void test('nested object with customNode parses correctly', (): void => {
    const parsed = getExpr(`{ a: 5, b: { c: ${customNode('population')}, d: 10 } }`)
    const typeEnv = createTypeEnvironment()
    const result = parseExpr(
        parsed,
        'test',
        [{
            type: 'object',
            properties: new Map<string, USSType>(
                [['a', numVectorType], ['b', { type: 'object', properties: new Map([['c', numVectorType], ['d', numVectorType]]) }]] satisfies [string, USSType][],
            ),
        }],
        typeEnv,
        () => {
            throw new Error('Fallback should not be called for valid expression')
        },
        false,
    )
    assert.strictEqual(unparse(result), `{a: ${customNode('5')}, b: {c: population, d: ${customNode('10')}}}`)
})

void test('vectorLiteral with invalid element uses customNode', (): void => {
    const parsed = getExpr(customNode('[population, population + 2, density_pw_1km]'))
    const typeEnv = createTypeEnvironment()
    const result = parseExpr(
        parsed,
        'test',
        [numVectorVectorType],
        typeEnv,
        () => {
            throw new Error('Fallback should not be called for vector elements')
        },
        false,
    )

    assert.strictEqual(unparse(result), `[population, ${customNode('population + 2')}, density_pw_1km]`)
})

void test('function parameter with constant just works', (): void => {
    const parsed = getExpr(customNode(`linearScale(min=0, max=100)`))
    const typeEnv = createTypeEnvironment()
    const result = parseExpr(
        parsed,
        'test',
        [{ type: 'opaque', name: 'scale' }],
        typeEnv,
        (e) => {
            throw new Error(`Fallback should not be called for valid expression, but was for ${JSON.stringify(e)}`)
        },
        false,
    )
    assert.strictEqual(unparse(result), 'linearScale(min=0, max=100)')
})

void test('function parameter with invalid expression uses customNode', (): void => {
    const parsed = getExpr(customNode(`linearScale(min=0, max=2 + 5)`))
    const typeEnv = createTypeEnvironment()
    const result = parseExpr(
        parsed,
        'test',
        [{ type: 'opaque', name: 'scale' }],
        typeEnv,
        (e) => {
            throw new Error(`Fallback should not be called for valid expression, but was for ${JSON.stringify(e)}`)
        },
        false,
    )
    assert.strictEqual(unparse(result), `linearScale(min=0, max=${customNode('2 + 5')})`)
})
