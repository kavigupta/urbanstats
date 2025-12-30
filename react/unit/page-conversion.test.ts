import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { idOutput, type MapUSS } from '../src/mapper/settings/map-uss'
import { parse, parseNoErrorAsCustomNode, unparse } from '../src/urban-stats-script/parser'
import type { TypeEnvironment } from '../src/urban-stats-script/types-values'
import { convertTableToMapper, mapperToTable } from '../src/utils/page-conversion'

function getTypeEnvironment(): TypeEnvironment {
    return defaultTypeEnvironment('USA')
}

void describe('mapperToTable', () => {
    void test('converts cMap to table', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("");\ncondition (true)\ncMap(data=density_pw_1km)`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert(result !== undefined, 'Should convert successfully')
        const unparsed = unparse(result)
        assert.equal(unparsed, 'customNode("");\ncondition (true)\ntable(columns=[column(values=density_pw_1km)])')
    })

    void test('converts pMap to table', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("");\ncondition (true)\npMap(data=population)`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert(result !== undefined, 'Should convert successfully')
        const unparsed = unparse(result)
        assert.equal(unparsed, 'customNode("");\ncondition (true)\ntable(columns=[column(values=population)])')
    })

    void test('converts cMapRGB to table', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("");\ncondition (true)\ncMapRGB(dataR=density_pw_1km)`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert(result !== undefined, 'Should convert successfully')
        const unparsed = unparse(result)
        assert.equal(unparsed, 'customNode("");\ncondition (true)\ntable(columns=[column(values=density_pw_1km)])')
    })

    void test('converts cMap with complex data expression', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("");\ncondition (true)\ncMap(data=density_pw_1km * 2)`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert(result !== undefined, 'Should convert successfully')
        const unparsed = unparse(result)
        // Complex expressions get wrapped in customNode
        assert.equal(unparsed, 'customNode("");\ncondition (true)\ntable(columns=[column(values=customNode("density_pw_1km * 2"))])')
    })

    void test('converts mapper with preamble', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("let x = 5");\ncondition (true)\ncMap(data=density_pw_1km)`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert(result !== undefined, 'Should convert successfully')
        const unparsed = unparse(result)
        // The preamble is preserved in the output, wrapped in customNode
        assert.equal(unparsed, 'customNode("let x = 5");\ncondition (true)\ntable(columns=[column(values=density_pw_1km)])')
    })

    void test('converts mapper with condition', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("");\ncondition (true)\ncMap(data=density_pw_1km)`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert(result !== undefined, 'Should convert successfully')
        // mapperToTable preserves the full structure including condition
        const unparsed = unparse(result)
        assert.equal(unparsed, 'customNode("");\ncondition (true)\ntable(columns=[column(values=density_pw_1km)])')
    })

    void test('returns undefined for non-mapper expression', () => {
        const typeEnvironment = getTypeEnvironment()
        const fullInput = `customNode("");\ncondition (true)\ndensity_pw_1km`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert.equal(result, undefined, 'Should return undefined for non-mapper expression')
    })

    void test('returns undefined for invalid mapper structure', () => {
        const typeEnvironment = getTypeEnvironment()
        const parsed = parse('density_pw_1km', { type: 'single', ident: idOutput })
        if (parsed.type === 'error') {
            throw new Error('Failed to parse')
        }
        const result = mapperToTable(parsed as MapUSS, typeEnvironment)
        assert.equal(result, undefined, 'Should return undefined for invalid structure')
    })
})

void describe('convertTableToMapper', () => {
    void test('converts simple table to mapper', () => {
        const parsed = parseNoErrorAsCustomNode('table(columns=[column(values=density_pw_1km)])', idOutput, [{ type: 'opaque', name: 'table', allowCustomExpression: false }])
        const result = convertTableToMapper(parsed)
        assert(result !== undefined, 'Should convert successfully')
        // parseNoErrorAsCustomNode wraps in customNode
        assert.equal(result, 'customNode("cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)")')
    })

    void test('converts table with complex expression to mapper', () => {
        const parsed = parseNoErrorAsCustomNode('table(columns=[column(values=density_pw_1km * 2)])', idOutput, [{ type: 'opaque', name: 'table', allowCustomExpression: false }])
        const result = convertTableToMapper(parsed)
        assert(result !== undefined, 'Should convert successfully')
        // Complex expressions get wrapped in customNode
        assert.equal(result, 'customNode("cMap(data=density_pw_1km * 2, scale=linearScale(), ramp=rampUridis)")')
    })

    void test('converts table with preamble to mapper', () => {
        const fullInput = `customNode("let x = 5");\ncondition (true)\ntable(columns=[column(values=density_pw_1km)])`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = convertTableToMapper(parsed)
        assert(result !== undefined, 'Should convert successfully')
        assert.equal(result, 'customNode("let x = 5");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)')
    })

    void test('converts table with condition to mapper', () => {
        const fullInput = `customNode("");\ncondition (true)\ntable(columns=[column(values=density_pw_1km)])`
        const parsed = parse(fullInput, { type: 'multi' })
        if (parsed.type === 'error') {
            throw new Error(`Failed to parse: ${fullInput}`)
        }
        const result = convertTableToMapper(parsed)
        assert(result !== undefined, 'Should convert successfully')
        // convertTableToMapper returns the unparsed string of the transformed AST
        // For conditions, it preserves the condition structure as "condition (true) ..."
        assert.equal(result, 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)')
    })

    void test('returns undefined for table without columns', () => {
        const parsed = parse('table()', { type: 'single', ident: idOutput })
        if (parsed.type === 'error') {
            throw new Error('Failed to parse')
        }
        const result = convertTableToMapper(parsed)
        assert.equal(result, undefined, 'Should return undefined for table without columns')
    })

    void test('returns undefined for table with empty columns', () => {
        const parsed = parse('table(columns=[])', { type: 'single', ident: idOutput })
        if (parsed.type === 'error') {
            throw new Error('Failed to parse')
        }
        const result = convertTableToMapper(parsed)
        assert.equal(result, undefined, 'Should return undefined for table with empty columns')
    })

    void test('returns undefined for non-table expression', () => {
        const parsed = parse('density_pw_1km', { type: 'single', ident: idOutput })
        if (parsed.type === 'error') {
            throw new Error('Failed to parse')
        }
        const result = convertTableToMapper(parsed)
        assert.equal(result, undefined, 'Should return undefined for non-table expression')
    })

    void test('returns undefined for table with column without values', () => {
        const parsed = parse('table(columns=[column()])', { type: 'single', ident: idOutput })
        if (parsed.type === 'error') {
            throw new Error('Failed to parse')
        }
        const result = convertTableToMapper(parsed)
        assert.equal(result, undefined, 'Should return undefined for column without values')
    })

    void test('handles customNode wrapper', () => {
        const parsed = parseNoErrorAsCustomNode('table(columns=[column(values=density_pw_1km)])', idOutput, [{ type: 'opaque', name: 'table', allowCustomExpression: false }])
        // parseNoErrorAsCustomNode returns a customNode, which should be handled
        const result = convertTableToMapper(parsed)
        assert(result !== undefined, 'Should convert successfully')
        // The customNode wrapper is preserved in the output
        assert.equal(result, 'customNode("cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)")')
    })
})
