import assert from 'assert/strict'
import { test } from 'node:test'

import { evaluate, execute } from '../src/urban-stats-script/interpreter'
import { undocValue } from '../src/urban-stats-script/types-values'

import { emptyContext, numType, numVectorType, parseExpr, parseProgram } from './urban-stats-script-utils'

void test('customNode', (): void => {
    assert.deepStrictEqual(
        evaluate(parseExpr('customNode("2 + 2")'), emptyContext()),
        undocValue(4, numType),
    )
})

void test('customNode using variables', (): void => {
    assert.deepStrictEqual(
        execute(parseProgram(`x = 3
            customNode("x * x")`), emptyContext()),
        undocValue(9, numType),
    )
})

void test('customNode with broadcasting', (): void => {
    assert.deepStrictEqual(
        execute(parseProgram(`x = [1, 2, 3]
            customNode("x * x")`), emptyContext()),
        undocValue([1, 4, 9], numVectorType),
    )
})
