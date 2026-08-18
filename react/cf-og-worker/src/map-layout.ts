/*
 * Where a shape sits on the map, shared by the basemap and the outline drawn over it. The
 * projection runs past [0, 1] for a shape crossing the antimeridian, so the fits below stay tight;
 * `coveringTiles` wraps the tile x it asks for, which is where the world is round again.
 */
import { project } from '../../src/utils/coordinates'

/** A closed ring of [lon, lat] pairs. */
export type Ring = [number, number][]

const tileSize = 256

/** Past this the tiles stop adding detail, so a shape smaller than the box just stays smaller. */
const maxZoom = 17

export interface MapLayout {
    /** Box pixels per unit of projected space, chosen so the rings fill the box. */
    scale: number
    /** The zoom the map reads as, which line widths and label sizes are picked against. */
    zoom: number
    /** The box's top-left corner, in that same scaled space. */
    originX: number
    originY: number
}

function layoutAround(centerX: number, centerY: number, scale: number, width: number, height: number): MapLayout {
    return {
        scale,
        zoom: Math.max(0, Math.min(maxZoom, Math.round(Math.log2(scale / tileSize)))),
        originX: centerX * scale - width / 2,
        originY: centerY * scale - height / 2,
    }
}

export function fitRings(rings: Ring[], width: number, height: number): MapLayout {
    // A loop rather than Math.min(...xs): a country's outline carries more points than an argument
    // list takes, and the RangeError would land as a card that silently fell back.
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity]
    for (const ring of rings) {
        for (const point of ring) {
            const [x, y] = project(point)
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
        }
    }

    const pad = 8
    const fit = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1))
    // A shape small enough to want more than maxZoom's detail just stays small, rather than
    // filling the box out of tiles that have nothing more to show.
    const scale = Math.min(fit, tileSize * 2 ** (maxZoom + 1))
    return layoutAround((minX + maxX) / 2, (minY + maxY) / 2, scale, width, height)
}

/**
 * Fits a lon/lat box inside a pixel box, as maplibre's `fitBounds` does for an inset. Unlike
 * `fitRings` the box is what the map's author chose, so it is met exactly rather than held back to
 * what the tiles can show.
 */
export function fitBounds([west, south, east, north]: [number, number, number, number], width: number, height: number): MapLayout {
    const [left, top] = project([west, north])
    const [right, bottom] = project([east, south])
    const scale = Math.min(width / (right - left || 1), height / (bottom - top || 1))
    return layoutAround((left + right) / 2, (top + bottom) / 2, scale, width, height)
}

/** Projects a point into the card's map box. */
export function place(layout: MapLayout, point: [number, number]): [number, number] {
    const [x, y] = project(point)
    return [x * layout.scale - layout.originX, y * layout.scale - layout.originY]
}

/**
 * A run of box pixels as SVG path data, empty if it falls outside the box. Overlap rather than a
 * point inside it: a shape larger than the box still fills it, and so does the ocean polygon a
 * small inset sits wholly inside, whose every corner is outside.
 */
export function polyline(points: [number, number][], width: number, height: number, close: boolean): string {
    const kept: string[] = []
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity]
    let last: [number, number] | undefined
    for (const [x, y] of points) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        // A shapefile carries far more detail than a card's pixels hold, and every point kept is
        // path data satori and resvg both have to walk.
        if (last !== undefined && Math.abs(x - last[0]) < 0.5 && Math.abs(y - last[1]) < 0.5) {
            continue
        }
        last = [x, y]
        kept.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    if (kept.length < 2 || maxX < 0 || minX > width || maxY < 0 || minY > height) {
        return ''
    }
    return `M${kept.join('L')}${close ? 'Z' : ''}`
}

/** Whether a circle of this radius shows in the box at all. */
export function withinBox(x: number, y: number, radius: number, width: number, height: number): boolean {
    return x + radius >= 0 && x - radius <= width && y + radius >= 0 && y - radius <= height
}
