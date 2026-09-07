import geojsonExtent from '@mapbox/geojson-extent'
import maplibregl from 'maplibre-gl'

import { geometry } from './utils/geometry'
import { partitionBoxes } from './utils/partition-boxes'
import { Feature } from './utils/protos'
import { loadFeatureFromPossibleSymlink } from './utils/symlinks'
import { NormalizeProto } from './utils/types'

const boundingBoxCache = new WeakMap<GeoJSON.Geometry, maplibregl.LngLatBounds>()

export function boundingBox(geo: GeoJSON.Geometry): maplibregl.LngLatBounds {
    let result: maplibregl.LngLatBounds | undefined
    if ((result = boundingBoxCache.get(geo)) !== undefined) {
        return result
    }

    const bbox = geojsonExtent(geo)
    result = new maplibregl.LngLatBounds(
        new maplibregl.LngLat(bbox[0], bbox[1]),
        new maplibregl.LngLat(bbox[2], bbox[3]),
    )
    boundingBoxCache.set(geo, result)

    return result
}

export function extendBoxes(boxes: maplibregl.LngLatBounds[]): maplibregl.LngLatBounds {
    return boxes.reduce((result, box) => result.extend(box), new maplibregl.LngLatBounds())
}

export async function partitionLongnames(longnames: string[]): Promise<number[][]> {
    const boundingBoxes = await Promise.all(longnames.map(async longname => boundingBox(geometry(await loadFeatureFromPossibleSymlink(longname) as NormalizeProto<Feature>))))
    return partitionBoxes(boundingBoxes.map(bounds => [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]))
}
