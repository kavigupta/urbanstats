import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { clusterMarkers } from '../cf-og-worker/src/clusters'
import { Inset } from '../src/urban-stats-script/constants/insets'

const usa: Inset = {
    bottomLeft: [0, 0],
    topRight: [1, 1],
    coordBox: [-130, 20, -60, 55],
    mainMap: true,
    name: undefined,
}

/** A grid across the country, so points keep merging over the zooms below the one drawn. */
const points = Array.from({ length: 900 }, (_, i) => ({
    lon: -125 + (i % 30) * 2,
    lat: 25 + Math.floor(i / 30) * 1,
    category: i % 3,
    size: 100,
}))

const contents = {
    kind: 'clusters' as const,
    points,
    // Only how many there are matters here; nothing in the clustering looks at a colour.
    categoryColors: Array.from({ length: 3 }, (_, i) => `category ${i}`),
    maxRadius: 30,
    clusterRadius: 30,
}

void describe('clusterMarkers', () => {
    void test('merging points conserves their total size', () => {
        const markers = clusterMarkers(contents, [{ inset: usa, layout: { scale: 4096, zoom: 4, originX: 0, originY: 0 } }], 1)
        const total = markers.flat().reduce((sum, marker) => sum + marker.byCategory.reduce((a, b) => a + b, 0), 0)
        assert.equal(total, points.length * 100)
    })
})
