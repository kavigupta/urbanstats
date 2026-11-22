import ClipperLib from 'clipper-lib'
import type maplibregl from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { MapRef } from 'react-map-gl/maplibre'

import { Polygon } from './map-common'

// Clipper works in integers, so project to this many units per screen pixel
const unitsPerPx = 4

function worldSize(zoom: number): number {
    return 512 * 2 ** zoom * unitsPerPx
}

function mercator([lon, lat]: GeoJSON.Position): [number, number] {
    const sinLat = Math.sin(lat * Math.PI / 180)
    return [(lon + 180) / 360, 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)]
}

function unmercator([x, y]: [number, number]): GeoJSON.Position {
    return [x * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI]
}

/** In mercator coordinates, which run from 0 to 1 across the world */
interface Region { zoom: number, x0: number, y0: number, x1: number, y1: number }

interface ProjectedRing { points: [number, number][], hole: boolean, x0: number, y0: number, x1: number, y1: number }

const projectedCache = new WeakMap<GeoJSON.Geometry, ProjectedRing[]>()

function projectedRings(geometry: GeoJSON.Geometry): ProjectedRing[] {
    let result = projectedCache.get(geometry)
    if (result === undefined) {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
        result = polygons.flatMap(polygon => polygon.map((ring, i) => {
            const points = ring.map(mercator)
            const [x0, y0, x1, y1] = points.reduce(
                ([minX, minY, maxX, maxY], [x, y]) => [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)],
                [Infinity, Infinity, -Infinity, -Infinity],
            )
            return { points, hole: i > 0, x0, y0, x1, y1 }
        }))
        projectedCache.set(geometry, result)
    }
    return result
}

// Sutherland-Hodgman, against one side of a rectangle at a time
function clipSide(ring: ClipperLib.IntPoint[], inside: (p: ClipperLib.IntPoint) => boolean, cross: (a: ClipperLib.IntPoint, b: ClipperLib.IntPoint) => ClipperLib.IntPoint): ClipperLib.IntPoint[] {
    const result: ClipperLib.IntPoint[] = []
    ring.forEach((b, i) => {
        const a = ring[(i + ring.length - 1) % ring.length]
        if (inside(a) !== inside(b)) {
            result.push(cross(a, b))
        }
        if (inside(b)) {
            result.push(b)
        }
    })
    return result
}

function clipToRect(ring: ClipperLib.IntPoint[], width: number, height: number): ClipperLib.IntPoint[] {
    const atX = (x: number) => (a: ClipperLib.IntPoint, b: ClipperLib.IntPoint) => ({ X: x, Y: Math.round(a.Y + (b.Y - a.Y) * (x - a.X) / (b.X - a.X)) })
    const atY = (y: number) => (a: ClipperLib.IntPoint, b: ClipperLib.IntPoint) => ({ X: Math.round(a.X + (b.X - a.X) * (y - a.Y) / (b.Y - a.Y)), Y: y })
    ring = clipSide(ring, p => p.X >= 0, atX(0))
    ring = clipSide(ring, p => p.X <= width, atX(width))
    ring = clipSide(ring, p => p.Y >= 0, atY(0))
    return clipSide(ring, p => p.Y <= height, atY(height))
}

/**
 * Returns the polygon minus its inset by widthPx at the region's zoom, within the region. The region's edges cut a
 * false band, so it should reach well past the screen.
 */
function haloBand(geometry: GeoJSON.Geometry, region: Region, widthPx: number): GeoJSON.MultiPolygon {
    const size = worldSize(region.zoom)
    // relative to the region's corner, as clipper is slower once coordinates pass 2^25 or so
    const width = Math.round((region.x1 - region.x0) * size)
    const height = Math.round((region.y1 - region.y0) * size)
    const polygon = projectedRings(geometry).flatMap(({ points, hole, x0, y0, x1, y1 }) => {
        if (x1 < region.x0 || x0 > region.x1 || y1 < region.y0 || y0 > region.y1) {
            return []
        }
        const ring = ClipperLib.JS.Lighten(clipToRect(
            points.map(([x, y]) => ({ X: Math.round((x - region.x0) * size), Y: Math.round((y - region.y0) * size) })),
            width, height,
        ), unitsPerPx / 2)
        if (ring.length < 3) {
            return []
        }
        // so holes grow when the polygon is inset
        if (ClipperLib.Clipper.Orientation(ring) === hole) {
            ring.reverse()
        }
        return [ring]
    })

    const offset = new ClipperLib.ClipperOffset(2, unitsPerPx / 4)
    offset.AddPaths(polygon, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
    const inset: ClipperLib.Paths = []
    offset.Execute(inset, -widthPx * unitsPerPx)

    const clipper = new ClipperLib.Clipper()
    clipper.AddPaths(polygon, ClipperLib.PolyType.ptSubject, true)
    clipper.AddPaths(inset, ClipperLib.PolyType.ptClip, true)
    const tree = new ClipperLib.PolyTree()
    clipper.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)

    const close = (path: ClipperLib.Path): GeoJSON.Position[] => {
        const ring = path.map(({ X, Y }) => unmercator([region.x0 + X / size, region.y0 + Y / size]))
        return [...ring, ring[0]]
    }
    return {
        type: 'MultiPolygon',
        coordinates: ClipperLib.JS.PolyTreeToExPolygons(tree).map(({ outer, holes }) => [close(outer), ...holes.map(close)]),
    }
}

export const haloOpacity = 0.35

const haloBandCache = new WeakMap<GeoJSON.Geometry, { region: Region, widthPx: number, band: GeoJSON.MultiPolygon }>()

function cachedHaloBand(geometry: GeoJSON.Geometry, region: Region, widthPx: number): GeoJSON.MultiPolygon {
    const cached = haloBandCache.get(geometry)
    if (cached?.region === region && cached.widthPx === widthPx) {
        return cached.band
    }
    const band = haloBand(geometry, region, widthPx)
    haloBandCache.set(geometry, { region, widthPx, band })
    return band
}

function screen(map: maplibregl.Map): Region {
    const bounds = map.getBounds()
    const [x0, y0] = mercator([bounds.getWest(), bounds.getNorth()])
    const [x1, y1] = mercator([bounds.getEast(), bounds.getSouth()])
    return { zoom: Math.round(map.getZoom()), x0, y0, x1, y1 }
}

/** The screen and a screen's width and height past each side, so panning shows the halo before it is recomputed */
function regionAround({ zoom, x0, y0, x1, y1 }: Region): Region {
    const width = x1 - x0
    const height = y1 - y0
    return { zoom, x0: x0 - width, y0: y0 - height, x1: x1 + width, y1: y1 + height }
}

function within(inner: Region, outer: Region): boolean {
    return inner.zoom === outer.zoom && inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1
}

export function useHaloCollection(map: MapRef | undefined, features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
    const [region, setRegion] = useState<Region | undefined>(undefined)
    useEffect(() => {
        if (map === undefined) {
            return
        }
        const update = (): void => {
            const now = screen(map.getMap())
            setRegion(current => current !== undefined && within(now, current) ? current : regionAround(now))
        }
        update()
        map.on('moveend', update)
        return () => {
            map.off('moveend', update)
        }
    }, [map])

    return useMemo(() => ({
        type: 'FeatureCollection',
        features: region === undefined
            ? []
            : features.flatMap((feature) => {
                const { haloWidth, haloColor } = feature.properties as Polygon
                if (haloWidth === undefined) {
                    return []
                }
                return [{
                    type: 'Feature' as const,
                    properties: { haloColor },
                    geometry: cachedHaloBand(feature.geometry, region, haloWidth),
                }]
            }),
    }), [features, region])
}
