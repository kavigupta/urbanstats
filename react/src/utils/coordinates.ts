import { Insets } from '../components/map'

import { assert } from './defensive'

// Web Mercator projection functions
function lngToWebMercatorX(lng: number): number {
    return lng * Math.PI / 180 * 6378137
}

function latToWebMercatorY(lat: number): number {
    return 6378137 * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
}

export function computeAspectRatio(coordBox: [number, number, number, number]): number {
    // coordBox is [west, south, east, north]
    const x1 = lngToWebMercatorX(coordBox[0])
    const x2 = lngToWebMercatorX(coordBox[2])
    const y1 = latToWebMercatorY(coordBox[1])
    const y2 = latToWebMercatorY(coordBox[3])

    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)

    return width / height
}

function area(coordBox: [number, number, number, number]): number {
    // coordBox is [west, south, east, north]
    const x1 = lngToWebMercatorX(coordBox[0])
    const x2 = lngToWebMercatorX(coordBox[2])
    const y1 = latToWebMercatorY(coordBox[1])
    const y2 = latToWebMercatorY(coordBox[3])

    return Math.abs((x2 - x1) * (y2 - y1))
}

export function computeAspectRatioForInsets(mapsWithCoordBox: Insets): number {
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
