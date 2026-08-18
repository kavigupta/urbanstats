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
