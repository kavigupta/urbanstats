import assert from 'assert/strict'
import { test } from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { parseStatUSS } from '../src/stat/utils'
import { Universe } from '../src/universe'
import { addColumn } from '../src/urban-stats-script/add-column'
import { parseNoErrorAsCustomNode, unparse } from '../src/urban-stats-script/parser'

const universe: Universe = 'world'
const typeEnvironment = defaultTypeEnvironment(universe)

const standardPrefix = `customNode("");
condition (true)
`

void test('simple table call adds column correctly', (): void => {
    const ast = parseStatUSS(`${standardPrefix}table(columns=[column(values=population)])`, universe)
    const colAdder = addColumn(ast, typeEnvironment)
    assert.ok(colAdder, 'addColumn should return a function for table call')
    assert.strictEqual(unparse(colAdder('density_pw_1km')), `${standardPrefix}table(columns=[column(values=population), column(values=density_pw_1km)])`)
})

void test('table call with multiple columns adds column correctly', (): void => {
    const ast = parseStatUSS(`${standardPrefix}table(columns=[column(values=population), column(values=density_pw_1km)])`, universe)
    const colAdder = addColumn(ast, typeEnvironment)
    assert.ok(colAdder, 'addColumn should return a function for table call')
    assert.strictEqual(unparse(colAdder('area')), `${standardPrefix}table(
    columns=[
        column(values=population),
        column(values=density_pw_1km),
        column(values=area)
    ]
)`)
})

void test('table call without columns argument returns undefined', (): void => {
    const ast = parseStatUSS('table(population=[100, 200, 300])', universe)
    const colAdder = addColumn(ast, typeEnvironment)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined when columns argument is missing')
})

void test('table call with non-vector columns returns undefined', (): void => {
    const ast = parseStatUSS('table(columns=population)', universe)
    const colAdder = addColumn(ast, typeEnvironment)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined when columns is not a vector literal')
})

void test('non-table call returns undefined', (): void => {
    const ast = parseStatUSS('linearScale(min=0, max=100)', universe)
    const colAdder = addColumn(ast, typeEnvironment)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined for non-table calls')
})

void test('customNode wrapping table call adds column correctly', (): void => {
    const customNodeAst = parseStatUSS('1; table(columns=[column(values=population)])', universe)
    const colAdder = addColumn(customNodeAst, typeEnvironment)
    assert.ok(colAdder, 'addColumn should work through customNode')

    const result = colAdder('density_pw_1km')
    const unparsed = unparse(result)
    assert.strictEqual(unparsed, unparse(parseStatUSS('1;table(columns=[column(values=population), column(values=density_pw_1km)])', universe)))
})

void test('statements with table call as last statement adds column correctly', (): void => {
    const ast = parseNoErrorAsCustomNode('population; table(columns=[column(values=density_pw_1km)])', 'test')
    const colAdder = addColumn(ast, typeEnvironment)
    assert.ok(colAdder, 'addColumn should work on last statement in statements')

    const result = colAdder('area')
    const unparsed = unparse(result)
    assert.strictEqual(unparsed, 'customNode("population;\\ntable(columns=[column(values=density_pw_1km), column(values=area)])")')
})

void test('empty statements returns undefined', (): void => {
    const ast = parseNoErrorAsCustomNode('', 'test')
    const colAdder = addColumn(ast, typeEnvironment)
    assert.strictEqual(colAdder, undefined, 'addColumn should return undefined for non-table expressions')
})

void test('condition with table call in rest adds column correctly', (): void => {
    const ast = parseNoErrorAsCustomNode('condition(true); table(columns=[density_pw_1km])', 'test')
    const colAdder = addColumn(ast, typeEnvironment)
    assert.ok(colAdder, 'addColumn should work on last element in condition rest')

    const result = colAdder('area')
    const unparsed = unparse(result)
    assert(unparsed.includes('density_pw_1km') && unparsed.includes('area'),
        `Expected result to contain both columns, got: ${unparsed}`)
})

void test('table call with other named arguments preserves them', (): void => {
    const ast = parseStatUSS(`${standardPrefix}table(columns=[column(values=population)], population=[100, 200, 300])`, universe)
    const colAdder = addColumn(ast, typeEnvironment)
    assert.ok(colAdder, 'addColumn should return a function for table call')

    const result = colAdder('density_pw_1km')
    const unparsed = unparse(result)
    assert.strictEqual(unparsed, `${standardPrefix}table(
    columns=[column(values=population), column(values=density_pw_1km)],
    population=[100, 200, 300]
)`)
})
