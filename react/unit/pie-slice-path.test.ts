import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { pieSlicePath, pieSlices } from '../src/syau/cluster-geometry'

const radius = 20
const whole = pieSlicePath(radius, radius, radius, 0, 2 * Math.PI)

function pathOfRest(sizes: [number, number]): string {
    const [, rest] = pieSlices(sizes)
    return pieSlicePath(radius, radius, radius, rest.from, rest.to)
}

void describe('pieSlicePath', () => {
    void test('draws a lone slice as a closed circle rather than a wedge', () => {
        assert.equal(whole, 'M40.0,20.0A20.0,20.0 0 1,1 0.0,20.0A20.0,20.0 0 1,1 40.0,20.0z')
    })

    void test('rounds a near-whole slice up to the whole pie', () => {
        // A named city of a few hundred people among a cluster of millions leaves the rest of the
        // pie so close to a whole turn that its arc would have vanished into a point.
        assert.equal(pathOfRest([250, 12e6]), whole)
    })

    void test('keeps the arc of a slice a visible sliver short of whole', () => {
        assert.notEqual(pathOfRest([25e3, 12e6]), whole)
    })

    void test('does not round a sliver up to the whole pie', () => {
        const [sliver] = pieSlices([250, 12e6])
        assert.notEqual(pieSlicePath(radius, radius, radius, sliver.from, sliver.to), whole)
    })
})
