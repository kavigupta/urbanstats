import geojsonExtent from '@mapbox/geojson-extent'
import maplibregl from 'maplibre-gl'
import { min } from 'mathjs'

import { assert } from './utils/defensive'
import { indexPartitions } from './utils/partition'
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

export function performPartitioning(
    fillThreshold: number,
    boundingBoxes: maplibregl.LngLatBounds[],
): number[][] {
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
    return [boundingBoxes.map((_, i) => i)]
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
    const boundingBoxes = await Promise.all(longnames.map(async longname => boundingBox(geometry(await loadShapeFromPossibleSymlink(longname) as NormalizeProto<Feature>))))

    return performPartitioning(fillThreshold, boundingBoxes)
}

interface GroupedBounds {
    idxs: number[]
    overallBounds: maplibregl.LngLatBounds
}

function done(groupedBounds: GroupedBounds[]): boolean {
    // If we have less than 4 groups, we are done
    return groupedBounds.length <= 1
}

function mergeBounds(a: GroupedBounds, b: GroupedBounds): GroupedBounds {
    const merged = new maplibregl.LngLatBounds(
        a.overallBounds.getSouthWest().wrap(),
        a.overallBounds.getNorthEast().wrap(),
    ).extend(b.overallBounds)
    return {
        idxs: [...a.idxs, ...b.idxs],
        overallBounds: merged,
    }
}

function mergeBest(groupedBounds: GroupedBounds[]): GroupedBounds[] {
    let bestI = -1
    let bestJ = -1
    let bestMerged: GroupedBounds | null = null
    let bestDelta = Infinity
    for (let i = 0; i < groupedBounds.length; i++) {
        for (let j = i + 1; j < groupedBounds.length; j++) {
            const merged = mergeBounds(groupedBounds[i], groupedBounds[j])
            const delta = area(merged.overallBounds) - area(groupedBounds[i].overallBounds) - area(groupedBounds[j].overallBounds)
            if (delta < bestDelta) {
                bestDelta = delta
                bestMerged = merged
                bestI = i
                bestJ = j
            }
        }
    }
    console.log(`Merging bounds ${bestI} and ${bestJ} with delta ${bestDelta}`)
    assert(bestMerged !== null, 'No best merged bounds found')
    groupedBounds = groupedBounds.filter((_, idx) => idx !== bestI && idx !== bestJ)
    groupedBounds.push(bestMerged)
    return groupedBounds
}

function removeSmallBounds(groupedBounds: GroupedBounds[], minArea: number): [GroupedBounds[], GroupedBounds[]] {
    groupedBounds.sort((a, b) => area(a.overallBounds) - area(b.overallBounds))
    // remove groups that are cumulatively less than 1% of the total area
    let a = 0
    let i = 0
    while (i < groupedBounds.length) {
        const areaThis = area(groupedBounds[i].overallBounds)
        console.log(`Area of group ${i}: ${areaThis / minArea}`)
        a += area(groupedBounds[i].overallBounds)
        console.log(`Cumulative area: ${a}, minArea: ${minArea}`)
        if (a > minArea) {
            break
        }
        i++
    }
    return [groupedBounds.slice(0, i), groupedBounds.slice(i)]
}

/**
 * Similar to `performPartitioning`, but it prioritizes reducing the total amount of space covered while keeping the
 * number of maps low.
 */
export function performInseting(boundingBoxes: maplibregl.LngLatBounds[]): number[][] {
    let groupedBounds = boundingBoxes.map((box, idx) => ({
        idxs: [idx],
        overallBounds: box,
    })) satisfies GroupedBounds[]
    const totalArea = groupedBounds.map(({ overallBounds }) => area(overallBounds)).reduce((a, b) => a + b, 0)
    console.log(`Total area: ${totalArea}`)
    // const [unused, used] = removeSmallBounds(groupedBounds, totalArea * 0.001)
    // console.log(`Removed ${unused.length} small bounds, keeping ${used.length} used bounds`)
    // groupedBounds = used
    let minArea = totalArea
    while (!done(groupedBounds)) {
        const newGB = mergeBest(groupedBounds)
        const ar = newGB.map(({ overallBounds }) => area(overallBounds)).reduce((a, b) => a + b, 0)
        minArea = Math.min(minArea, ar)
        console.log(`New area after merge: ${ar / totalArea}`)
        if (ar > minArea * 1.15) {
            console.log('Merged bounds exceeded total area, stopping')
            break
        }
        groupedBounds = newGB
    }
    return groupedBounds.map(({ idxs }) => idxs)
}
