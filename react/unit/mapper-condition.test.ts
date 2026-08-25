import assert from 'assert/strict'
import { test } from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { changeConditionKind, classifyCondition, parseCondition } from '../src/mapper/settings/condition'
import { attemptParseAsTopLevel, mapUSSFromString, MapUSS, validMapperOutputs } from '../src/mapper/settings/map-uss'
import { changeBlockId } from '../src/mapper/settings/parseExpr'
import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { parse, unparse } from '../src/urban-stats-script/parser'

const testBlock = { type: 'single' as const, ident: 'test' }

function getExpr(code: string): UrbanStatsASTExpression {
    const parsed = parse(code, testBlock)
    if (parsed.type !== 'expression') {
        throw new Error(`Expected expression, received ${parsed.type}`)
    }
    return parsed.value
}

function asCondition(code: string): UrbanStatsASTExpression {
    const result = parseCondition(getExpr(code), 'test', defaultTypeEnvironment('world'), false)
    // Emits a console error if any subexpression was given a block ident outside of ours
    changeBlockId(result, 'test', '')
    return result
}

function simplified(expr: UrbanStatsASTExpression): string {
    return unparse(expr, { simplify: 'auto-ux' })
}

function customNode(code: string): string {
    return `customNode(${JSON.stringify(code)})`
}

void test('a comparison against a constant', () => {
    const condition = asCondition('population < 1000')
    const classified = classifyCondition(condition)
    assert.strictEqual(classified.kind, 'comparison')
    assert.strictEqual(classified.operator, '<')
    assert.strictEqual(unparse(classified.lhs), 'population')
    assert.strictEqual(unparse(classified.rhs), '1000')
})

void test('a comparison between two statistics', () => {
    const classified = classifyCondition(asCondition('population > density_pw_1km'))
    assert.strictEqual(classified.kind, 'comparison')
    assert.strictEqual(unparse(classified.rhs), 'density_pw_1km')
})

void test('groups are flattened', () => {
    const classified = classifyCondition(asCondition('population < 1000 & density_pw_1km > 5 & population > 10'))
    assert.strictEqual(classified.kind, '&')
    assert.deepStrictEqual(classified.operands.map(simplified), ['population < 1000', 'density_pw_1km > 5', 'population > 10'])
})

void test('precedence nests groups', () => {
    const classified = classifyCondition(asCondition('population < 1000 & density_pw_1km > 5 | population > 10'))
    assert.strictEqual(classified.kind, '|')
    assert.deepStrictEqual(classified.operands.map(simplified), ['population < 1000 & density_pw_1km > 5', 'population > 10'])
})

void test('a condition previously written as code comes up graphically', () => {
    const classified = classifyCondition(asCondition(customNode('population < 1000')))
    assert.strictEqual(classified.kind, 'comparison')
})

void test('an expression outside the grammar stays custom', () => {
    const condition = asCondition('!(population < 1000)')
    const classified = classifyCondition(condition)
    assert.strictEqual(classified.kind, 'custom')
    assert.strictEqual(simplified(condition), '!(population < 1000)')
})

void test('an operand outside the grammar keeps the comparison', () => {
    const condition = asCondition('population * 2 > 1000')
    const classified = classifyCondition(condition)
    assert.strictEqual(classified.kind, 'comparison')
    assert.strictEqual(classified.lhs.type, 'customNode')
    assert.strictEqual(simplified(condition), 'population * 2 > 1000')
})

void test('a custom operand of a group keeps its grouping', () => {
    const condition = asCondition(`(${customNode('population < 1 | population > 2')}) & density_pw_1km > 5`)
    assert.strictEqual(classifyCondition(condition).kind, '&')
    assert.strictEqual(simplified(condition), '(population < 1 | population > 2) & density_pw_1km > 5')
})

void test('switching between all-of and any-of keeps the operands', () => {
    const condition = asCondition('population < 1000 & density_pw_1km > 5')
    const flipped = changeConditionKind(condition, classifyCondition(condition), '|', 'test', defaultTypeEnvironment('world'))
    changeBlockId(flipped, 'test', '')
    assert.strictEqual(simplified(flipped), 'population < 1000 | density_pw_1km > 5')
})

void test('grouping a comparison keeps it as the first operand', () => {
    const condition = asCondition('population < 1000')
    const grouped = changeConditionKind(condition, classifyCondition(condition), '&', 'test', defaultTypeEnvironment('world'))
    changeBlockId(grouped, 'test', '')
    const classified = classifyCondition(grouped)
    assert.strictEqual(classified.kind, '&')
    assert.strictEqual(simplified(classified.operands[0]), 'population < 1000')
})

void test('ungrouping keeps the first comparison', () => {
    const condition = asCondition('population < 1000 & density_pw_1km > 5')
    const ungrouped = changeConditionKind(condition, classifyCondition(condition), 'comparison', 'test', defaultTypeEnvironment('world'))
    changeBlockId(ungrouped, 'test', '')
    assert.strictEqual(simplified(ungrouped), 'population < 1000')
})

void test('going custom keeps the whole condition as code', () => {
    const condition = asCondition('population < 1000 & density_pw_1km > 5')
    const custom = changeConditionKind(condition, classifyCondition(condition), 'custom', 'test', defaultTypeEnvironment('world'))
    assert.strictEqual(classifyCondition(custom).kind, 'custom')
    assert.strictEqual(simplified(custom), 'population < 1000 & density_pw_1km > 5')
})

void test('a filtered map round-trips through its saved form', () => {
    const typeEnvironment = defaultTypeEnvironment('world')
    // A whole script comes in as one custom node; unchecking "Enable custom script" is what splits it up
    const asTopLevel = (code: string): MapUSS => {
        const uss = mapUSSFromString(code)
        return attemptParseAsTopLevel(uss.type === 'customNode' ? uss.expr : uss, typeEnvironment, true, validMapperOutputs)
    }
    const edited = asTopLevel(`
        condition (population < 1000 & density_pw_1km > 5)
        cMap(data=population, scale=linearScale(), ramp=rampUridis)
    `)
    assert.strictEqual(edited.type, 'statements')
    assert.strictEqual(classifyCondition(edited.result[1].condition).kind, '&')
    assert.strictEqual(unparse(asTopLevel(unparse(edited))), unparse(edited))
})

void test('leaving custom reads the code as a condition', () => {
    const typeEnvironment = defaultTypeEnvironment('world')
    const custom = asCondition(customNode('population > (50) & density_pw_1km < (80)'))
    assert.strictEqual(classifyCondition(custom).kind, '&')

    const asCustom = changeConditionKind(custom, classifyCondition(custom), 'custom', 'test', typeEnvironment)
    assert.strictEqual(classifyCondition(asCustom).kind, 'custom')

    const backToGroup = changeConditionKind(asCustom, classifyCondition(asCustom), '&', 'test', typeEnvironment)
    changeBlockId(backToGroup, 'test', '')
    const classified = classifyCondition(backToGroup)
    assert.strictEqual(classified.kind, '&')
    assert.deepStrictEqual(classified.operands.map(simplified), ['population > 50', 'density_pw_1km < 80'])
})

void test('leaving custom for a comparison reads the code as one', () => {
    const custom = asCondition(customNode('population > 50'))
    const asCustom = changeConditionKind(custom, classifyCondition(custom), 'custom', 'test', defaultTypeEnvironment('world'))
    const comparison = changeConditionKind(asCustom, classifyCondition(asCustom), 'comparison', 'test', defaultTypeEnvironment('world'))
    changeBlockId(comparison, 'test', '')
    assert.strictEqual(simplified(comparison), 'population > 50')
})

void test('code outside the grammar becomes the first operand of a group', () => {
    const custom = asCondition('!(population < 1000)')
    const grouped = changeConditionKind(custom, classifyCondition(custom), '&', 'test', defaultTypeEnvironment('world'))
    changeBlockId(grouped, 'test', '')
    const classified = classifyCondition(grouped)
    assert.strictEqual(classified.kind, '&')
    assert.strictEqual(simplified(classified.operands[0]), '!(population < 1000)')
})
