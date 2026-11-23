import ClipperLib from 'clipper-lib'
import { clipPolygon, Point } from 'lineclip'
import maplibregl from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { MapRef } from 'react-map-gl/maplibre'

import { Polygon } from './map-common'

// MapLibre draws the world this many pixels wide at zoom 0
const worldPxAtZoom0 = 512

// Clipper works in integers, so project to this many units per screen pixel
export const unitsPerPx = 4

export function worldSize(zoom: number): number {
    return worldPxAtZoom0 * 2 ** zoom * unitsPerPx
}

/** A region of the map to be rendered, in the internal Mercator coordinates which are [0, 1]^2 across the entire world */
export interface RenderedRegion { zoom: number, x0: number, y0: number, x1: number, y1: number }

const projectedRingsCache = new WeakMap<GeoJSON.Geometry, { points: Point[], hole: boolean }[]>()

function projectedRingsDirect(geometry: GeoJSON.Geometry): { points: Point[], hole: boolean }[] {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
    return polygons.flatMap(polygon => polygon.map((ring, i) => ({
        points: ring.map(([lon, lat]) => {
            const { x, y } = maplibregl.MercatorCoordinate.fromLngLat([lon, lat])
            return [x, y] satisfies Point
        }),
        hole: i > 0,
    })))
}

function projectedRings(geometry: GeoJSON.Geometry): { points: Point[], hole: boolean }[] {
    let result = projectedRingsCache.get(geometry)
    if (result === undefined) {
        result = projectedRingsDirect(geometry)
        projectedRingsCache.set(geometry, result)
    }
    return result
}

// moves the polygon inwards, creating the smaller version
function shrink(polygon: ClipperLib.Paths, widthPx: number): ClipperLib.Paths {
    const offset = new ClipperLib.ClipperOffset(/* miter limit, does nothing */ 2, /* Tolerance on arcs */ unitsPerPx / 4)
    offset.AddPaths(polygon, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
    const result: ClipperLib.Paths = []
    offset.Execute(result, -widthPx * unitsPerPx)
    return result
}

function difference(subject: ClipperLib.Paths, clip: ClipperLib.Paths): ClipperLib.ExPolygons {
    const clipper = new ClipperLib.Clipper()
    clipper.AddPaths(subject, ClipperLib.PolyType.ptSubject, true)
    clipper.AddPaths(clip, ClipperLib.PolyType.ptClip, true)
    const tree = new ClipperLib.PolyTree()
    clipper.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    return ClipperLib.JS.PolyTreeToExPolygons(tree)
}

/** Undoes the projection in haloBandDirect, and repeats the first point at the end as GeoJSON requires */
function toGeoJSONRing(path: ClipperLib.Path, renderedRegion: RenderedRegion): GeoJSON.Position[] {
    const size = worldSize(renderedRegion.zoom)
    const ring = path.map(({ X, Y }) => new maplibregl.MercatorCoordinate(renderedRegion.x0 + X / size, renderedRegion.y0 + Y / size).toLngLat().toArray())
    return [...ring, ring[0]]
}

/**
 * Returns the 'halo band' which is the area of the polygon that is within the widthPx of the polygon's edge,
 * at the current zoom level. This is clipped to the rendered region, for efficiency.
 */
export function haloBandDirect(geometry: GeoJSON.Geometry, renderedRegion: RenderedRegion, widthPx: number): GeoJSON.MultiPolygon {
    const size = worldSize(renderedRegion.zoom)
    // the clip edge gets a band too, so clip far enough out that it lies outside the region
    const pad = (widthPx + 1) * unitsPerPx / size
    const polygon = projectedRings(geometry).flatMap(({ points, hole }) => {
        const clipped = clipPolygon(points, [renderedRegion.x0 - pad, renderedRegion.y0 - pad, renderedRegion.x1 + pad, renderedRegion.y1 + pad])
        // shifted so that (0, 0) is the top left and units are in pixels*unitsPerPx, so that Clipper can work with integers
        const clippedShifted = clipped.map(([x, y]) => ({ X: Math.round((x - renderedRegion.x0) * size), Y: Math.round((y - renderedRegion.y0) * size) }))
        // "lighten" is simplify
        const clippedShiftedSimplified = ClipperLib.JS.Lighten(clippedShifted, unitsPerPx / 2)
        if (clippedShiftedSimplified.length < 3) {
            return []
        }
        // direction is used to encode outer/inner ring
        if (ClipperLib.Clipper.Orientation(clippedShiftedSimplified) === hole) {
            clippedShiftedSimplified.reverse()
        }
        return [clippedShiftedSimplified]
    })

    return {
        type: 'MultiPolygon',
        coordinates: difference(polygon, shrink(polygon, widthPx)).map(({ outer, holes }) => [
            toGeoJSONRing(outer, renderedRegion), ...holes.map(x => toGeoJSONRing(x, renderedRegion)),
        ]),
    }
}

export const haloOpacity = 0.35

const haloBandCache = new WeakMap<GeoJSON.Geometry, { region: RenderedRegion, widthPx: number, band: GeoJSON.MultiPolygon }>()

function haloBand(geometry: GeoJSON.Geometry, region: RenderedRegion, widthPx: number): GeoJSON.MultiPolygon {
    const cached = haloBandCache.get(geometry)
    if (cached?.region === region && cached.widthPx === widthPx) {
        return cached.band
    }
    const band = haloBandDirect(geometry, region, widthPx)
    haloBandCache.set(geometry, { region, widthPx, band })
    return band
}

/**
 * Keeps the current region while the screen stays inside it at the same zoom. Otherwise returns the screen and a
 * screen's width and height past each side, so panning shows the halo before it is recomputed.
 */
export function nextRenderedRegion(map: maplibregl.Map, current: RenderedRegion | undefined): RenderedRegion {
    const bounds = map.getBounds()
    const { x: x0, y: y0 } = maplibregl.MercatorCoordinate.fromLngLat(bounds.getNorthWest())
    const { x: x1, y: y1 } = maplibregl.MercatorCoordinate.fromLngLat(bounds.getSouthEast())
    const zoom = Math.round(map.getZoom())
    if (current?.zoom === zoom && x0 >= current.x0 && x1 <= current.x1 && y0 >= current.y0 && y1 <= current.y1) {
        return current
    }
    const width = x1 - x0
    const height = y1 - y0
    return { zoom, x0: x0 - width, y0: y0 - height, x1: x1 + width, y1: y1 + height }
}

export function useHaloCollection(map: MapRef | undefined, features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
    const [renderedRegion, setRenderedRegion] = useState<RenderedRegion | undefined>(undefined)
    useEffect(() => {
        if (map === undefined) {
            return
        }
        const update = (): void => {
            setRenderedRegion(current => nextRenderedRegion(map.getMap(), current))
        }
        update()
        map.on('moveend', update)
        return () => {
            map.off('moveend', update)
        }
    }, [map])

    return useMemo(() => ({
        type: 'FeatureCollection',
        features: renderedRegion === undefined
            ? []
            : features.flatMap((feature) => {
                const { haloWidth, haloColor } = feature.properties as Polygon
                if (haloWidth === undefined) {
                    return []
                }
                return [{
                    type: 'Feature' as const,
                    properties: { haloColor },
                    geometry: haloBand(feature.geometry, renderedRegion, haloWidth),
                }]
            }),
    }), [features, renderedRegion])
}
