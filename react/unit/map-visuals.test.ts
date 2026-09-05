/* eslint-disable no-restricted-syntax -- map colours are hex, not theme colours */
import assert from 'assert/strict'
import { test } from 'node:test'

import { hiddenColor, mapVisuals, MapResult } from '../src/mapper/map-rendering'
import { ClusterMap, CMap } from '../src/urban-stats-script/constants/map'

const ramp: [number, string][] = [[0, '#000000'], [1, '#ffffff']]

function commonMap(overrides: Partial<CMap>): CMap {
    return {
        geo: ['a', 'b', 'c'],
        data: [0, NaN, 1],
        scale: { kind: 'linear', min: 0, max: 1 },
        ramp,
        opacity: 1,
        label: undefined,
        basemap: { type: 'osm', noLabels: false },
        insets: [],
        textBoxes: [],
        missingData: undefined,
        outline: { color: { r: 0, g: 0, b: 0, a: 1 }, weight: 0 },
        ...overrides,
    }
}

function cMap(overrides: Partial<CMap>): MapResult {
    return { type: 'opaque', opaqueType: 'cMap', value: commonMap(overrides) }
}

void test('a missing value is hidden by default', () => {
    assert.deepStrictEqual(mapVisuals(cMap({})).colors, ['#000000', hiddenColor, '#ffffff'])
})

void test('a missingData without a colour brings back the one furthest from the ramp', () => {
    const colors = mapVisuals(cMap({ missingData: { color: undefined } })).colors
    assert.deepStrictEqual([colors[0], colors[2]], ['#000000', '#ffffff'])
    // A black-to-white ramp is furthest from something saturated, which is the point of the default.
    assert.notEqual(colors[1], hiddenColor)
    assert.match(colors[1], /^#[0-9a-f]{6}$/)
})

void test('a missingData colour overrides it', () => {
    const colors = mapVisuals(cMap({ missingData: { color: { r: 1, g: 0, b: 0, a: 1 } } })).colors
    assert.equal(colors[1], '#ff0000')
})

void test('a cluster map puts missing values in their own category', () => {
    const value: ClusterMap = {
        ...commonMap({}),
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
