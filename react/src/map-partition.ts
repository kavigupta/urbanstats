import geojsonExtent from '@mapbox/geojson-extent'
import maplibregl from 'maplibre-gl'

import { Feature } from './utils/protos'
import { loadShapeFromPossibleSymlink } from './utils/symlinks'
import { NormalizeProto } from './utils/types'

export function geometry(poly: NormalizeProto<Feature>): GeoJSON.Geometry {
    if (poly.geometry === 'multipolygon') {
        const polys = poly.multipolygon.polygons
        const coords = polys.map(
            multiPoly => multiPoly.rings.map(
                ring => ring.coords.map(
                    coordinate => [coordinate.lon, coordinate.lat],
                ),
            ),
        )
        return {
            type: 'MultiPolygon',
            coordinates: coords,
        }
    }
    else {
        const coords = poly.polygon.rings.map(
            ring => ring.coords.map(
                coordinate => [coordinate.lon, coordinate.lat],
            ),
        )
        return {
            type: 'Polygon',
            coordinates: coords,
        }
    }
}

export function boundingBox(geo: GeoJSON.Geometry): maplibregl.LngLatBounds {
    const bbox = geojsonExtent(geo)
    return new maplibregl.LngLatBounds(
        new maplibregl.LngLat(bbox[0], bbox[1]),
        new maplibregl.LngLat(bbox[2], bbox[3]),
    )
}

export function extendBoxes(boxes: maplibregl.LngLatBounds[]): maplibregl.LngLatBounds {
    return boxes.reduce((result, box) => result.extend(box), new maplibregl.LngLatBounds())
}

// Area of bounds in EPSG:3857 projection
function area(bounds: maplibregl.LngLatBounds): number {
    const sw = maplibregl.MercatorCoordinate.fromLngLat(bounds.getSouthWest())
    const ne = maplibregl.MercatorCoordinate.fromLngLat(bounds.getNorthEast())
    // Handle wrapping by normalizing x difference
    let dx = ne.x - sw.x
    if (dx < 0) {
        dx += 1 // Web Mercator x wraps at 1
    }
    return Math.abs(dx * (ne.y - sw.y))
}

function proportionFilled(boxes: maplibregl.LngLatBounds[]): number {
    return boxes.reduce((a, box) => a + area(box), 0) / area(extendBoxes(boxes))
}

/**
 * indexPartitions(2, inf) -> [[0, 1]], [[0], [1]]
 * indexPartitions(3, inf) -> [[0, 1, 2]], [[0, 1], [2]], [[0, 2], [1]], [[0], [1, 2]], [[0], [1], [2]]
 * indexPartitions(3, 2) -> [[0, 1, 2]], [[0, 1], [2]], [[0, 2], [1]], [[0], [1, 2]]
 */
function* indexPartitions(upperBound: number, maxPartitions: number, index = 0, current: number[][] = []): Generator<number[][], void> {
    if (index === upperBound) {
        yield current
        return
    }

    if (current.length === 0) {
        yield* indexPartitions(upperBound, maxPartitions, index + 1, [[index]])
        return
    }

    for (let i = 0; i < current.length; i++) {
        const newPartition = current.map((subset, j) =>
            i === j ? [...subset, index] : subset,
        )
        yield* indexPartitions(upperBound, maxPartitions, index + 1, newPartition)
    }

    if (current.length < maxPartitions) {
        yield* indexPartitions(upperBound, maxPartitions, index + 1, [...current, [index]])
    }
}

/**
 * Given many regions to be compared, determine how best to split them into multiple maps
 *
 * If the bounds of the regions fill a map above some threshold, put all the regions in the same map
 *
 * Otherwise, weigh multiple groupings to determine the best one
 */
export async function partitionLongnames(longnames: string[], maxPartitions: number): Promise<string[][]> {
    const fillThreshold = 0.05
    const timeLimit = Date.now() + 500

    const boundingBoxes = await Promise.all(longnames.map(async longname => boundingBox(geometry(await loadShapeFromPossibleSymlink(longname) as NormalizeProto<Feature>))))

    for (const partitions of indexPartitions(boundingBoxes.length, maxPartitions)) {
        if (partitions.every(partition => proportionFilled(partition.map(index => boundingBoxes[index])) > fillThreshold)) {
            return partitions.map(partition => partition.map(index => longnames[index]))
        }
        if (Date.now() > timeLimit) {
            break
        }
    }

    // Give up
    return [longnames]
}
