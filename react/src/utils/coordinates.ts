import { Inset, Insets } from '../components/map'

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

export function computeAspectRatioForInsets(ins: Insets): number {
    const mapsWithCoordBox = ins.filter(inset => inset.coordBox !== undefined) as (Inset & { coordBox: [number, number, number, number] })[]
    assert(mapsWithCoordBox.length > 0, 'No insets with coordBox')

    const biggestMap = mapsWithCoordBox.reduce((prev, curr) => {
        return area(curr.coordBox) > area(prev.coordBox) ? curr : prev
    })
    const coordBox = biggestMap.coordBox
    return computeAspectRatio(coordBox)
}
