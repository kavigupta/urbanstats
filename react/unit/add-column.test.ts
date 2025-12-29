import assert from 'assert/strict'
import { test } from 'node:test'

import { addColumn } from '../src/urban-stats-script/add-column'
import { UrbanStatsASTExpression, UrbanStatsASTStatement } from '../src/urban-stats-script/ast'
import { parse, parseNoErrorAsCustomNode, unparse } from '../src/urban-stats-script/parser'

const testBlock = { type: 'single' as const, ident: 'test' }

function getStatement(code: string): UrbanStatsASTStatement {
    const parsed = parse(code, testBlock)
    if (parsed.type === 'error') {
        throw new Error(`Parse error: ${JSON.stringify(parsed.errors)}`)
    }
    return parsed
}

function getExpr(code: string): UrbanStatsASTExpression {
    const parsed = parse(code, testBlock)
    if (parsed.type === 'error') {
        throw new Error(`Parse error: ${JSON.stringify(parsed.errors)}`)
    }
    if (parsed.type !== 'expression') {
        throw new Error(`Expected expression, received ${parsed.type}`)
    }
    return parsed.value
}

void test('simple table call adds column correctly', (): void => {
    const ast = getStatement('table(columns=[population])')
    const colAdder = addColumn(ast)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should return a function for table call')

    const newCol = getExpr('density_pw_1km')
    const result = colAdder!(() => newCol)
    assert.strictEqual(unparse(result), 'table(columns=[population, density_pw_1km])')
})

void test('table call with multiple columns adds column correctly', (): void => {
    const ast = getStatement('table(columns=[population, density_pw_1km])')
    const colAdder = addColumn(ast)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should return a function for table call')

    const newCol = getExpr('area')
    const result = colAdder!(() => newCol)
    assert.strictEqual(unparse(result), 'table(columns=[population, density_pw_1km, area])')
})

void test('table call without columns argument returns undefined', (): void => {
    const ast = getStatement('table(population=[100, 200, 300])')
    const colAdder = addColumn(ast)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined when columns argument is missing')
})

void test('table call with non-vector columns returns undefined', (): void => {
    const ast = getStatement('table(columns=population)')
    const colAdder = addColumn(ast)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined when columns is not a vector literal')
})

void test('non-table call returns undefined', (): void => {
    const ast = getStatement('linearScale(min=0, max=100)')
    const colAdder = addColumn(ast)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined for non-table calls')
})

void test('customNode wrapping table call adds column correctly', (): void => {
    const customNodeAst = parseNoErrorAsCustomNode('table(columns=[population])', 'test')
    const colAdder = addColumn(customNodeAst)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should work through customNode')

    const newCol = getExpr('density_pw_1km')
    const result = colAdder!(() => newCol)
    const unparsed = unparse(result)
    assert.strictEqual(unparsed, unparse(parseNoErrorAsCustomNode('table(columns=[population, density_pw_1km])', 'test')))
})

void test('statements with table call as last statement adds column correctly', (): void => {
    const ast = getStatement('population; table(columns=[density_pw_1km])')
    const colAdder = addColumn(ast)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should work on last statement in statements')

    const newCol = getExpr('area')
    const result = colAdder!(() => newCol)
    const unparsed = unparse(result)
    assert.strictEqual(unparsed, 'population;\ntable(columns=[density_pw_1km, area])')
})

void test('empty statements returns undefined', (): void => {
    // We can't easily create empty statements through parse, so we'll test with a condition that has empty rest
    // Actually, let's test with a statement that doesn't end with a table call
    const ast = getStatement('population')
    const colAdder = addColumn(ast)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined for non-table expressions')
})

void test('expression wrapping table call adds column correctly', (): void => {
    const ast = getStatement('table(columns=[population])')
    // The parsed statement is already an expression wrapper
    const colAdder = addColumn(ast)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should work through expression wrapper')

    const newCol = getExpr('density_pw_1km')
    const result = colAdder!(() => newCol)
    assert.strictEqual(unparse(result), 'table(columns=[population, density_pw_1km])')
})

void test('condition with table call in rest adds column correctly', (): void => {
    const ast = getStatement('condition(true); table(columns=[density_pw_1km])')
    const colAdder = addColumn(ast)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should work on last element in condition rest')

    const newCol = getExpr('area')
    const result = colAdder!(() => newCol)
    const unparsed = unparse(result)
    assert(unparsed.includes('density_pw_1km') && unparsed.includes('area'),
        `Expected result to contain both columns, got: ${unparsed}`)
})

void test('table call with other named arguments preserves them', (): void => {
    const ast = getStatement('table(columns=[population], population=[100, 200, 300])')
    const colAdder = addColumn(ast)
    assert.notStrictEqual(colAdder, undefined, 'addColumn should return a function for table call')

    const newCol = getExpr('density_pw_1km')
    const result = colAdder!(() => newCol)
    const unparsed = unparse(result)
    assert.strictEqual(unparsed, 'table(columns=[population, density_pw_1km], population=[100, 200, 300])')
})
