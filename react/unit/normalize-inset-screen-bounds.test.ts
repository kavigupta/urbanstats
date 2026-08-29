import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { normalizeInsetScreenBounds } from '../src/mapper/settings/edit-insets'
import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { deconstruct, Inset } from '../src/urban-stats-script/constants/insets'

function inset(bottomLeft: [number, number], topRight: [number, number]): Inset {
    return { bottomLeft, topRight, coordBox: [-130, 20, -60, 55], mainMap: false, name: 'inset' }
}

function normalize(insets: Inset[]): { screenBounds: [number, number][][], astRewritten: boolean[] } {
    const result = normalizeInsetScreenBounds({ insets: i => i, ast: (a: UrbanStatsASTExpression[]) => a }, insets)
    const ast = insets.map(deconstruct)
    return {
        screenBounds: result.insets(insets).map(i => [i.bottomLeft, i.topRight]),
        astRewritten: result.ast(ast).map((expr, i) => expr !== ast[i]),
    }
}

void describe('normalizeInsetScreenBounds', () => {
    void test('stretches the insets to span the canvas', () => {
        assert.deepEqual(normalize([
            inset([0.25, 0.25], [0.5, 0.75]),
            inset([0.5, 0.5], [0.75, 0.625]),
        ]), {
            screenBounds: [
                [[0, 0], [0.5, 1]],
                [[0.5, 0.5], [1, 0.75]],
            ],
            astRewritten: [true, true],
        })
    })

    void test('leaves insets that already span the canvas alone', () => {
        assert.deepEqual(normalize([
            inset([0, 0], [1, 1]),
            inset([0.25, 0.25], [0.5, 0.5]),
        ]), {
            screenBounds: [
                [[0, 0], [1, 1]],
                [[0.25, 0.25], [0.5, 0.5]],
            ],
            astRewritten: [false, false],
        })
    })

    void test('scales an axis that has extent without dividing by zero on one that does not', () => {
        assert.deepEqual(normalize([
            inset([0.25, 0.5], [0.5, 0.5]),
            inset([0.5, 0.5], [0.75, 0.5]),
        ]), {
            screenBounds: [
                [[0, 0.5], [0.5, 0.5]],
                [[0.5, 0.5], [1, 0.5]],
            ],
            astRewritten: [true, true],
        })
    })
})
