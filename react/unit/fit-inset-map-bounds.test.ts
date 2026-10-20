import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { fitInsetMapBounds } from '../src/mapper/settings/edit-insets'
import { Inset } from '../src/urban-stats-script/constants/insets'
import { computeAspectRatioForInsets, fitCoordBox } from '../src/utils/coordinates'

function inset(name: string, mainMap: boolean, bottomLeft: [number, number], topRight: [number, number]): Inset {
    return { bottomLeft, topRight, coordBox: [-130, 20, -60, 55], mainMap, name }
}

void describe('fitInsetMapBounds', () => {
    void test('accepting a narrowed main map keeps the canvas aspect ratio', () => {
        const original = [inset('main', true, [0, 0], [1, 1])]
        const canvasAspectRatio = computeAspectRatioForInsets(original)
        const fitted = fitInsetMapBounds([inset('main', true, [0, 0], [0.5, 1])], original, canvasAspectRatio)
        assert.ok(Math.abs(computeAspectRatioForInsets(fitted) / canvasAspectRatio - 1) < 1e-6)
    })

    void test('a box made taller near a pole stays within the latitudes the map can show', () => {
        // Svalbard, in a frame four times as tall as it is wide
        const fitted = fitCoordBox([10, 76, 34, 84], 0.25)
        assert.ok(fitted[3] <= 85.06, `north edge at ${fitted[3]}`)
        assert.ok(Math.abs(computeAspectRatioForInsets([{ ...inset('svalbard', true, [0, 0], [1, 1]), coordBox: fitted }]) / 0.25 - 1) < 1e-6)
    })

    void test('leaves insets that were not edited alone', () => {
        const original = [inset('main', true, [0, 0], [1, 1]), inset('small', false, [0, 0], [0.1, 0.5])]
        assert.equal(fitInsetMapBounds(original, original, 2)[1], original[1])
    })
})
