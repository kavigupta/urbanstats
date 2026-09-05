/* eslint-disable no-restricted-syntax -- map colours are hex, not theme colours */
import assert from 'assert/strict'
import { test } from 'node:test'

import { hiddenColor, mapVisuals } from '../src/mapper/map-rendering'
import { ClusterMap } from '../src/urban-stats-script/constants/map'

/*
 * A cluster map bins its data rather than colouring it directly, so a missing value needs a bin of
 * its own; without one it indexes the colourbar at NaN. What the other map kinds do with a missing
 * value is a colour, which the mapper-missing-data screenshots show; a bin number is not.
 */
void test('a cluster map puts missing values in their own category', () => {
    const value: ClusterMap = {
        geo: ['a', 'b', 'c'],
        data: [0, NaN, 1],
        scale: { kind: 'linear', min: 0, max: 1 },
        ramp: [[0, '#000000'], [1, '#ffffff']],
        opacity: 1,
        label: undefined,
        basemap: { type: 'osm', noLabels: false },
        insets: [],
        textBoxes: [],
        missingData: undefined,
        maxRadius: 10,
        relativeArea: [1, 1, 1],
        clusterRadiusSpacing: 0,
    }
    const visuals = mapVisuals({ type: 'opaque', opaqueType: 'clusterMap', value })
    const ticks = visuals.ramp!.ticks.length
    assert.deepStrictEqual(visuals.bins, [0, ticks, ticks - 1])
    assert.equal(visuals.categoryColors!.length, ticks + 1)
    assert.equal(visuals.categoryColors![ticks], hiddenColor)
    assert.deepStrictEqual(visuals.colors, ['#000000', hiddenColor, '#ffffff'])
})
/* eslint-enable no-restricted-syntax */
