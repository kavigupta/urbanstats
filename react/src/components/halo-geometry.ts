import ClipperLib from 'clipper-lib'
import { clipPolygon, Point } from 'lineclip'
import maplibregl from 'maplibre-gl'

// MapLibre draws the world this many pixels wide at zoom 0
const worldPxAtZoom0 = 512

// Clipper works in integers, so project to this many units per screen pixel
export const unitsPerPx = 4

export function worldSize(zoom: number): number {
    return worldPxAtZoom0 * 2 ** zoom * unitsPerPx
}

/** A region of the map to be rendered, in the internal Mercator coordinates which are [0, 1]^2 across the entire world */
export interface RenderedRegion { zoom: number, x0: number, y0: number, x1: number, y1: number }

export interface ProjectedRing { points: Point[], hole: boolean }

export function projectedRingsDirect(geometry: GeoJSON.Geometry): ProjectedRing[] {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
    return polygons.flatMap(polygon => polygon.map((ring, i) => ({
        points: ring.map(([lon, lat]) => {
            const { x, y } = maplibregl.MercatorCoordinate.fromLngLat([lon, lat])
            return [x, y] satisfies Point
        }),
        hole: i > 0,
    })))
}

// moves the polygon inwards, creating the smaller version
function shrink(polygon: ClipperLib.Paths, widthPx: number): ClipperLib.Paths {
    const offset = new ClipperLib.ClipperOffset(/* miter limit, does nothing */ 2, /* Tolerance on arcs */ unitsPerPx / 4)
    offset.AddPaths(polygon, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
    const result: ClipperLib.Paths = []
    offset.Execute(result, -widthPx * unitsPerPx)
    return result
}

function difference(subject: ClipperLib.Paths, clip: ClipperLib.Paths): ClipperLib.Paths {
    const clipper = new ClipperLib.Clipper()
    clipper.AddPaths(subject, ClipperLib.PolyType.ptSubject, true)
    clipper.AddPaths(clip, ClipperLib.PolyType.ptClip, true)
    const result: ClipperLib.Paths = []
    clipper.Execute(ClipperLib.ClipType.ctDifference, result, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    return result
}

function intersection(subject: ClipperLib.Paths, clip: ClipperLib.Paths): ClipperLib.ExPolygons {
    const clipper = new ClipperLib.Clipper()
    clipper.AddPaths(subject, ClipperLib.PolyType.ptSubject, true)
    clipper.AddPaths(clip, ClipperLib.PolyType.ptClip, true)
    const tree = new ClipperLib.PolyTree()
    clipper.Execute(ClipperLib.ClipType.ctIntersection, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
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
export function haloBandDirect(rings: ProjectedRing[], renderedRegion: RenderedRegion, widthPx: number): GeoJSON.MultiPolygon {
    const size = worldSize(renderedRegion.zoom)
    // the clip edge gets a band too, so clip far enough out that it lies outside the region, then cut it off
    const pad = (widthPx + 1) * unitsPerPx / size
    // MapLibre draws a copy of the world every 1 unit of x, and the region can reach into those copies
    const worldCopies = Array.from({ length: Math.ceil(renderedRegion.x1) - Math.floor(renderedRegion.x0) + 2 }, (_, i) => Math.floor(renderedRegion.x0) - 1 + i)
    const polygon = worldCopies.flatMap(copy => rings.flatMap(({ points, hole }) => {
        const clipped = clipPolygon(points, [renderedRegion.x0 - copy - pad, renderedRegion.y0 - pad, renderedRegion.x1 - copy + pad, renderedRegion.y1 + pad])
        // shifted so that (0, 0) is the top left and units are in pixels*unitsPerPx, so that Clipper can work with integers
        const clippedShifted = clipped.map(([x, y]) => ({ X: Math.round((x + copy - renderedRegion.x0) * size), Y: Math.round((y - renderedRegion.y0) * size) }))
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
    }))

    const width = Math.round((renderedRegion.x1 - renderedRegion.x0) * size)
    const height = Math.round((renderedRegion.y1 - renderedRegion.y0) * size)
    const region = [{ X: 0, Y: 0 }, { X: width, Y: 0 }, { X: width, Y: height }, { X: 0, Y: height }]

    return {
        type: 'MultiPolygon',
        coordinates: intersection(difference(polygon, shrink(polygon, widthPx)), [region]).map(({ outer, holes }) => [
            toGeoJSONRing(outer, renderedRegion), ...holes.map(x => toGeoJSONRing(x, renderedRegion)),
        ]),
    }
}
