import { Inset } from '../urban-stats-script/constants/insets'

import { assert } from './defensive'

/*
 * Web Mercator, as the site's maps use, into the unit square the world fills. Shapes crossing the
 * antimeridian carry longitudes past ±180 rather than wrapping, so x runs outside [0, 1] for them.
 */
export function project([lon, lat]: [number, number]): [number, number] {
    const x = (lon + 180) / 360
    const clamped = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180
    const y = (1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2
    return [x, y]
}

function unproject([x, y]: [number, number]): [number, number] {
    return [x * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI]
}

/** Expands a [west, south, east, north] box about its center to the given aspect ratio, as maplibre's fitBounds does */
export function fitCoordBox(coordBox: [number, number, number, number], aspectRatio: number): [number, number, number, number] {
    const [x1, y1] = project([coordBox[0], coordBox[3]])
    const [x2, y2] = project([coordBox[2], coordBox[1]])
    const width = x2 - x1
    const height = y2 - y1
    if (!(aspectRatio > 0 && aspectRatio < Infinity) || Math.abs(Math.log(width / height / aspectRatio)) < 1e-3) {
        return coordBox
    }
    const [, top] = project([0, 90])
    const [, bottom] = project([0, -90])
    // Maps stop short of the poles, so a box that would grow past them shifts away instead
    const [newWidth, newHeight] = width / height < aspectRatio ? [height * aspectRatio, height] : [width, Math.min(width / aspectRatio, bottom - top)]
    const cx = (x1 + x2) / 2
    const cy = Math.max(top + newHeight / 2, Math.min(bottom - newHeight / 2, (y1 + y2) / 2))
    const [west, north] = unproject([cx - newWidth / 2, cy - newHeight / 2])
    const [east, south] = unproject([cx + newWidth / 2, cy + newHeight / 2])
    return [west, south, east, north]
}

/** The projected extent of a [west, south, east, north] box. */
function extent(coordBox: [number, number, number, number]): { width: number, height: number } {
    const [x1, y1] = project([coordBox[0], coordBox[1]])
    const [x2, y2] = project([coordBox[2], coordBox[3]])
    return { width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }
}

function computeAspectRatio(coordBox: [number, number, number, number]): number {
    const { width, height } = extent(coordBox)
    return width / height
}

function area(coordBox: [number, number, number, number]): number {
    const { width, height } = extent(coordBox)
    return width * height
}

/**
 * The canvas has no shape of its own and frames are fractions of it, so its shape comes from the map bounds, which have one.
 * It's the shape where the largest map's bounds exactly fill its frame, whose on-screen aspect is `(fw / fh) · (W / H)`.
 */
export function computeAspectRatioForInsets(mapsWithCoordBox: Inset[]): number {
    assert(mapsWithCoordBox.length > 0, 'No insets with coordBox')

    const biggestMap = mapsWithCoordBox.reduce((prev, curr) => {
        return area(curr.coordBox) > area(prev.coordBox) ? curr : prev
    })
    const coordBox = biggestMap.coordBox
    const onScreenWidth = biggestMap.topRight[0] - biggestMap.bottomLeft[0]
    const onScreenHeight = biggestMap.topRight[1] - biggestMap.bottomLeft[1]
    const onScreenAspectRatio = onScreenWidth / onScreenHeight
    return computeAspectRatio(coordBox) / onScreenAspectRatio
}
