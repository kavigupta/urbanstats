import { bestPartition } from './partition'

/** A geographic bounding box, in the `[west, south, east, north]` order insets store. */
export type CoordBox = [number, number, number, number]

const mercatorX = (lng: number): number => (180 + lng) / 360
const mercatorY = (lat: number): number => (180 - (180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)))) / 360

/** The box in EPSG:3857, with both axes running the way screen coordinates do: east and north. */
export function mercatorBox([west, south, east, north]: CoordBox): CoordBox {
    return [mercatorX(west), -mercatorY(south), mercatorX(east), -mercatorY(north)]
}

/** Area of a box in the EPSG:3857 projection. */
function area([west, south, east, north]: CoordBox): number {
    // Handle wrapping by normalizing x difference
    let dx = mercatorX(east) - mercatorX(west)
    if (dx < 0) {
        dx += 1 // Web Mercator x wraps at 1
    }
    return Math.abs(dx * (mercatorY(north) - mercatorY(south)))
}

export function extendCoordBoxes(boxes: CoordBox[]): CoordBox {
    return boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])
}

function proportionFilled(boxes: CoordBox[]): number {
    return boxes.reduce((a, box) => a + area(box), 0) / area(extendCoordBoxes(boxes))
}

/**
 * Given many boxes to be shown together, determine how best to split them into multiple maps.
 *
 * If the bounds of the boxes fill a map above `fillThreshold`, put all of them in the same map.
 * Otherwise, weigh multiple groupings to determine the best one.
 */
export function partitionBoxes(boxes: CoordBox[], fillThreshold = 0.1): number[][] {
    const maxMaps = 6

    // We need to sort the boxes otherwise there could be an edge case when partitioning where a box gets added in the middle of a partition two other boxes
    // The partition of those two far partitions would not have been explored in `bestPartition`, since the hueristic would have eliminated that search space.
    // Therefore, we need to sort the boxes
    const center = (box: CoordBox, axis: 0 | 1): number => (box[axis] + box[axis + 2]) / 2
    const sortedBoxes = Array.from(boxes.entries())
        .sort(([, a], [, b]) => center(a, 1) - center(b, 1))
        .sort(([, a], [, b]) => center(a, 0) - center(b, 0))

    try {
        const partitions = bestPartition(sortedBoxes.length, maxMaps,
            ps => ps.map((partition) => {
                const filled = proportionFilled(partition.map(index => sortedBoxes[index][1]))
                if (filled >= fillThreshold) {
                    return partition.length
                }
                return filled
            }).sort((a, b) => a - b),
            (a, b) => {
                for (let i = 0; i < Math.min(a.length, b.length); i++) {
                    if (a[i] !== b[i]) {
                        return a[i] - b[i]
                    }
                }
                return a.length - b.length
            },
        )

        // Un-sort the indices
        // Also re-sort the partitions by the unsorted indices
        return partitions.map(partition => partition.map(index => sortedBoxes[index][0])
            .sort((a, b) => a - b)).sort((a, b) => Math.min(...a) - Math.min(...b))
    }
    catch (e) {
        console.warn('Error partitioning maps', e)
    }

    // Give up
    return [boxes.map((_, i) => i)]
}
