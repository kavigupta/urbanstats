/**
 * indexPartitions(2, () => true) -> [[0, 1]], [[0], [1]]
 * indexPartitions(3, () => true) -> [[0, 1, 2]], [[0, 1], [2]], [[0, 2], [1]], [[0], [1, 2]], [[0], [1], [2]]
 * indexPartitions(3, p => p.every(i => Math.abs(p[0] - i) < 2)) -> [[0, 1], [2]], [[0], [1, 2]], [[0], [1], [2]]
 *
 * `goodPartition` is a filter function that reduces the search space if a partition could not possibly become valid by adding more elements with a higher index
 *
 * This function has a built-in time limit, and will stop generating if it starts taking too long
 */
export function indexPartitions(upperBound: number, maxPartitions: number, goodPartitions: (partition: number[][]) => boolean): Generator<number[][], void> {
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
            const newPartition = current.map((subset, j) =>
                i === j ? [...subset, index] : subset,
            )
            if (goodPartitions(newPartition)) {
                yield* helper(index + 1, newPartition)
            }
        }

        if (current.length < maxPartitions) {
            yield* helper(index + 1, [...current, [index]])
        }
    }

    return helper(0, [])
}
