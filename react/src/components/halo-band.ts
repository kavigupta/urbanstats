import ClipperLib from 'clipper-lib'
import { clipPolygon, Point } from 'lineclip'
import { MercatorCoordinate } from 'maplibre-gl'
import type maplibregl from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { MapRef } from 'react-map-gl/maplibre'

import { Polygon } from './map-common'

// MapLibre draws the world this many pixels wide at zoom 0
const worldPxAtZoom0 = 512

// Clipper works in integers, so project to this many units per screen pixel
const unitsPerPx = 4

function worldSize(zoom: number): number {
    return worldPxAtZoom0 * 2 ** zoom * unitsPerPx
}

/** In mercator coordinates, which run from 0 to 1 across the world */
interface Region { zoom: number, x0: number, y0: number, x1: number, y1: number }

const projectedCache = new WeakMap<GeoJSON.Geometry, { points: Point[], hole: boolean }[]>()

function projectedRings(geometry: GeoJSON.Geometry): { points: Point[], hole: boolean }[] {
    let result = projectedCache.get(geometry)
    if (result === undefined) {
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
        result = polygons.flatMap(polygon => polygon.map((ring, i) => ({
            points: ring.map(([lon, lat]) => {
                const { x, y } = MercatorCoordinate.fromLngLat([lon, lat])
                return [x, y] satisfies Point
            }),
            hole: i > 0,
        })))
        projectedCache.set(geometry, result)
    }
    return result
}

/**
 * Returns the polygon minus its inset by widthPx at the region's zoom, within the region. The region's edges cut a
 * false band, so it should reach well past the screen.
 */
function haloBand(geometry: GeoJSON.Geometry, region: Region, widthPx: number): GeoJSON.MultiPolygon {
    const size = worldSize(region.zoom)
    const polygon = projectedRings(geometry).flatMap(({ points, hole }) => {
        const ring = ClipperLib.JS.Lighten(
            // relative to the region's corner, as clipper is slower once coordinates pass 2^25 or so
            clipPolygon(points, [region.x0, region.y0, region.x1, region.y1])
                .map(([x, y]) => ({ X: Math.round((x - region.x0) * size), Y: Math.round((y - region.y0) * size) })),
            unitsPerPx / 2,
        )
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
        const ring = path.map(({ X, Y }) => new MercatorCoordinate(region.x0 + X / size, region.y0 + Y / size).toLngLat().toArray())
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
    const { x: x0, y: y0 } = MercatorCoordinate.fromLngLat(bounds.getNorthWest())
    const { x: x1, y: y1 } = MercatorCoordinate.fromLngLat(bounds.getSouthEast())
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
