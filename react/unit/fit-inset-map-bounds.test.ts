import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { fitInsetMapBounds, InsetEdits, replaceInsets } from '../src/mapper/settings/edit-insets'
import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { Inset, layoutInsets } from '../src/urban-stats-script/constants/insets'
import { computeAspectRatioForInsets } from '../src/utils/coordinates'

function inset(name: string, mainMap: boolean, bottomLeft: [number, number], topRight: [number, number]): Inset {
    return { bottomLeft, topRight, coordBox: [-130, 20, -60, 55], mainMap, name }
}

const noEdits: InsetEdits = { insets: i => i, ast: (a: UrbanStatsASTExpression[]) => a }

void describe('fitInsetMapBounds', () => {
    void test('accepting a narrowed main map keeps the canvas aspect ratio', () => {
        const original = [inset('main', true, [0, 0], [1, 1])]
        const canvasAspectRatio = computeAspectRatioForInsets(original)
        const narrowed = replaceInsets(noEdits, [0, 1], [inset('main', true, [0, 0], [0.5, 1])])
        const fitted = fitInsetMapBounds(narrowed, original, canvasAspectRatio).insets(original)
        assert.ok(Math.abs(computeAspectRatioForInsets(layoutInsets(fitted).leaves) / canvasAspectRatio - 1) < 1e-6)
    })

    void test('leaves insets that were not edited alone', () => {
        const original = [inset('main', true, [0, 0], [1, 1]), inset('small', false, [0, 0], [0.1, 0.5])]
        assert.equal(fitInsetMapBounds(noEdits, original, 2).insets(original)[1], original[1])
    })
})
