import geojsonExtent from '@mapbox/geojson-extent'
import maplibregl from 'maplibre-gl'
import { min } from 'mathjs'

import { indexPartitions } from './utils/partition'
import { Feature } from './utils/protos'
import { loadFeatureFromPossibleSymlink } from './utils/symlinks'
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
 * Given many regions to be compared, determine how best to split them into multiple maps
 *
 * If the bounds of the regions fill a map above some threshold, put all the regions in the same map
 *
 * Otherwise, weigh multiple groupings to determine the best one
 */
export async function partitionLongnames(longnames: string[]): Promise<number[][]> {
    const fillThreshold = 0.1
    const maxMaps = 6

    const boundingBoxes = await Promise.all(longnames.map(async longname => boundingBox(geometry(await loadFeatureFromPossibleSymlink(longname) as NormalizeProto<Feature>))))

    // We need to sort the bounding boxes otherwise there could be an edge case when partitioning where a region gets added in the middle of a partition two other regions
    // The partition of those two far partitions would not have been explored in `indexPartitions`, since `goodPartition` would have eliminated that search space.
    // Therefore, we need to sort the bounding boxes
    const sortedBoundingBoxes = Array.from(boundingBoxes.entries())
        .sort(([, a], [, b]) => a.getCenter().lat - b.getCenter().lat)
        .sort(([, a], [, b]) => a.getCenter().lng - b.getCenter().lng)

    const score = (partitions: number[][]): number[] => {
        const result = partitions.map((partition) => {
            const filled = proportionFilled(partition.map(index => sortedBoundingBoxes[index][1]))
            if (filled >= fillThreshold) {
                return partition.length
            }
            return filled
        }).sort((a, b) => a - b)
        return result
    }

    const scoreGt = (a: number[], b: number[]): boolean => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) {
                return a[i] > b[i]
            }
        }
        return a.length > b.length
    }

    try {
        let bestScore: number[] = []
        let result

        for (const partitions of indexPartitions(sortedBoundingBoxes.length, maxMaps, ps => scoreGt(score(ps), bestScore))) {
            // Only iterates over good partitions

            const currentScore = score(partitions)
            if (scoreGt(currentScore, bestScore)) {
                // Un-sort the indices
                // Also re-sort the partitions by the unsorted indices
                const unsortedPartitions = partitions.map(partition => partition.map(index => sortedBoundingBoxes[index][0])
                    .sort((a, b) => a - b)).sort((a, b) => min(a) - min(b))
                result = unsortedPartitions
                bestScore = currentScore
            }
        }

        if (result !== undefined) {
            return result
        }
    }
    catch (e) {
        console.warn('Error partitioning maps', e)
    }

    // Give up
    return [longnames.map((_, i) => i)]
}
