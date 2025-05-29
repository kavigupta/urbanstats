import geojsonExtent from '@mapbox/geojson-extent'
import maplibregl from 'maplibre-gl'
import { min } from 'mathjs'

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
 * indexPartitions(2, () => true) -> [[0, 1]], [[0], [1]]
 * indexPartitions(3, () => true) -> [[0, 1, 2]], [[0, 1], [2]], [[0, 2], [1]], [[0], [1, 2]], [[0], [1], [2]]
 * indexPartitions(3, p => p.every(i => Math.abs(p[0] - i) < 2)) -> [[0, 1], [2]], [[0], [1, 2]], [[0], [1], [2]]
 *
 * `goodPartition` is a filter function that reduces the search space if a partition could not possibly become valid by adding more elements with a higher index
 *
 * This function has a built-in time limit, and will stop generating if it starts taking too long
 */
function indexPartitions(upperBound: number, goodPartition: (partition: number[]) => boolean): Generator<number[][], void> {
    const timeLimit = Date.now() + 500

    function* helper(index: number, current: number[][]): Generator<number[][], void> {
        if (Date.now() > timeLimit) {
            throw new Error('out of time')
        }

        if (index === upperBound) {
            yield current
            return
        }

        if (current.length === 0) {
            yield* helper(index + 1, [[index]])
            return
        }

        for (let i = 0; i < current.length; i++) {
            if (goodPartition([...current[i], index])) {
                const newPartition = current.map((subset, j) =>
                    i === j ? [...subset, index] : subset,
                )
                yield* helper(index + 1, newPartition)
            }
        }

        yield* helper(index + 1, [...current, [index]])
    }

    return helper(0, [])
}

/**
 * Given many regions to be compared, determine how best to split them into multiple maps
 *
 * If the bounds of the regions fill a map above some threshold, put all the regions in the same map
 *
 * Otherwise, weigh multiple groupings to determine the best one
 */
export async function partitionLongnames(longnames: string[]): Promise<number[][]> {
    const fillThreshold = 0.05

    const boundingBoxes = await Promise.all(longnames.map(async longname => boundingBox(geometry(await loadShapeFromPossibleSymlink(longname) as NormalizeProto<Feature>))))

    // We need to sort the bounding boxes otherwise there could be an edge case when partitioning where a region gets added in the middle of a partition two other regions
    // The partition of those two far partitions would not have been explored in `indexPartitions`, since `goodPartition` would have eliminated that search space.
    // Therefore, we need to sort the bounding boxes
    const sortedBoundingBoxes = Array.from(boundingBoxes.entries())
        .sort(([, a], [, b]) => a.getCenter().lat - b.getCenter().lat)
        .sort(([, a], [, b]) => a.getCenter().lng - b.getCenter().lng)

    try {
        for (const partitions of indexPartitions(sortedBoundingBoxes.length, partition => proportionFilled(partition.map(index => sortedBoundingBoxes[index][1])) > fillThreshold)) {
            // Only iterates over good partitions

            // Un-sort the indices
            // Also re-sort the partitions by the unsorted indices
            const unsortedPartitions = partitions.map(partition => partition.map(index => sortedBoundingBoxes[index][0])
                .sort((a, b) => a - b)).sort((a, b) => min(a) - min(b))
            return unsortedPartitions
        }
    }
    catch (e) {
        console.warn('Error partitioning maps', e)
    }

    // Give up
    return [longnames.map((_, i) => i)]
}
