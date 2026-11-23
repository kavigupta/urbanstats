import assert from 'assert/strict'
import { describe, test } from 'node:test'

import maplibregl from 'maplibre-gl'

import { haloBandDirect, nextRenderedRegion, RenderedRegion, unitsPerPx, worldSize } from '../src/components/halo-band'

const zoom = 10
const pxSize = worldSize(zoom) / unitsPerPx
const region: RenderedRegion = { zoom, x0: 0.25, y0: 0.4, x1: 0.25 + 3000 / pxSize, y1: 0.4 + 2000 / pxSize }

function lngLat([x, y]: [number, number]): GeoJSON.Position {
    return new maplibregl.MercatorCoordinate(region.x0 + x / pxSize, region.y0 + y / pxSize).toLngLat().toArray()
}

function pixels(position: GeoJSON.Position): [number, number] {
    const { x, y } = maplibregl.MercatorCoordinate.fromLngLat([position[0], position[1]])
    return [(x - region.x0) * pxSize, (y - region.y0) * pxSize]
}

function square(x: number, y: number, side: number): GeoJSON.Position[] {
    return ([[x, y], [x + side, y], [x + side, y + side], [x, y + side], [x, y]] satisfies [number, number][]).map(lngLat)
}

function area(band: GeoJSON.MultiPolygon): number {
    const ringArea = (ring: GeoJSON.Position[]): number => {
        const points = ring.map(pixels)
        let sum = 0
        for (let i = 0; i < points.length - 1; i++) {
            sum += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1]
        }
        return Math.abs(sum) / 2
    }
    return band.coordinates.reduce((total, [outer, ...holes]) => total + ringArea(outer) - holes.reduce((h, ring) => h + ringArea(ring), 0), 0)
}

function fakeMap(x0: number, y0: number, x1: number, y1: number, mapZoom: number): maplibregl.Map {
    const corner = (x: number, y: number): maplibregl.LngLat => new maplibregl.MercatorCoordinate(x, y).toLngLat()
    return {
        getBounds: () => ({ getNorthWest: () => corner(x0, y0), getSouthEast: () => corner(x1, y1) }),
        getZoom: () => mapZoom,
    } as unknown as maplibregl.Map
}

void describe('haloBandDirect', () => {
    void test('is a band of the given width inside a square', () => {
        const band = haloBandDirect({ type: 'Polygon', coordinates: [square(1000, 500, 200)] }, region, 8)
        assert.equal(band.coordinates.length, 1)
        assert.equal(band.coordinates[0].length, 2)
        assert(Math.abs(area(band) - (200 ** 2 - 184 ** 2)) < 10)
    })

    void test('fills a shape narrower than twice the width', () => {
        const band = haloBandDirect({ type: 'Polygon', coordinates: [square(1000, 500, 10)] }, region, 8)
        assert.equal(band.coordinates.length, 1)
        assert.equal(band.coordinates[0].length, 1)
        assert(Math.abs(area(band) - 100) < 1)
    })

    void test('puts a band inside the polygon around a hole', () => {
        const band = haloBandDirect({ type: 'Polygon', coordinates: [square(1000, 500, 200), square(1050, 550, 100).reverse()] }, region, 8)
        // the band grows out from the hole, so its corners are quarter circles
        const holeBand = 4 * 100 * 8 + Math.PI * 8 ** 2
        assert(Math.abs(area(band) - (200 ** 2 - 184 ** 2 + holeBand)) < 20)
    })

    void test('is empty for a polygon outside the region', () => {
        const band = haloBandDirect({ type: 'Polygon', coordinates: [square(-1000, -1000, 200)] }, region, 8)
        assert.equal(band.coordinates.length, 0)
    })

    void test('has no band along the edge of the region', () => {
        const band = haloBandDirect({ type: 'Polygon', coordinates: [square(-1000, -1000, 6000)] }, region, 8)
        assert.equal(band.coordinates.length, 0)
    })

    void test('keeps the band along a real edge that crosses the region', () => {
        const band = haloBandDirect({ type: 'Polygon', coordinates: [square(-1000, 500, 2000)] }, region, 8)
        assert(band.coordinates.flat(2).map(pixels).some(([x, y]) => x > 0 && x < 1000 && y > 507 && y < 509))
    })

    void test('draws the band on the copy of a shape stored a world away', () => {
        for (const world of [-1, 1]) {
            const band = haloBandDirect({ type: 'Polygon', coordinates: [square(1000 + world * pxSize, 500, 200)] }, region, 8)
            assert(Math.abs(area(band) - (200 ** 2 - 184 ** 2)) < 10)
            for (const position of band.coordinates.flat(2)) {
                const [x] = pixels(position)
                assert(x > 900 && x < 1300)
            }
        }
    })

    void test('handles each part of a multipolygon', () => {
        const band = haloBandDirect({ type: 'MultiPolygon', coordinates: [[square(1000, 500, 200)], [square(2000, 500, 200)]] }, region, 8)
        assert.equal(band.coordinates.length, 2)
    })
})

void describe('nextRenderedRegion', () => {
    const screen = { x0: 0.5, y0: 0.5, x1: 0.501, y1: 0.502 }

    void test('extends a screen past each side by its size', () => {
        const next = nextRenderedRegion(fakeMap(screen.x0, screen.y0, screen.x1, screen.y1, 9.7), undefined)
        assert.equal(next.zoom, 10)
        assert(Math.abs(next.x0 - 0.499) < 1e-9 && Math.abs(next.x1 - 0.502) < 1e-9)
        assert(Math.abs(next.y0 - 0.498) < 1e-9 && Math.abs(next.y1 - 0.504) < 1e-9)
    })

    void test('keeps the region while the screen pans within it', () => {
        const current = nextRenderedRegion(fakeMap(screen.x0, screen.y0, screen.x1, screen.y1, 10), undefined)
        assert.equal(nextRenderedRegion(fakeMap(0.4995, 0.4995, 0.5005, 0.5015, 10.2), current), current)
    })

    void test('replaces the region when the screen leaves it', () => {
        const current = nextRenderedRegion(fakeMap(screen.x0, screen.y0, screen.x1, screen.y1, 10), undefined)
        const next = nextRenderedRegion(fakeMap(0.5015, 0.5, 0.5025, 0.502, 10), current)
        assert.notEqual(next, current)
        assert(Math.abs(next.x0 - 0.5005) < 1e-9)
    })

    void test('replaces the region when the rounded zoom changes', () => {
        const current = nextRenderedRegion(fakeMap(screen.x0, screen.y0, screen.x1, screen.y1, 10), undefined)
        assert.equal(nextRenderedRegion(fakeMap(screen.x0, screen.y0, screen.x1, screen.y1, 10.6), current).zoom, 11)
    })
})
