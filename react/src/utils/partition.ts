/**
 * Efficiently finds the best partition in some search space, given a hueristic
 * The hueristic must not increase when an element is added to any partition in the partition set that is ordred greater than all the elements already in the partition
 *
 * Example: (match numbers to partition group index parity)
 * indexPartitions(3, 2, ps => ps.reduce((a, p, i) => a + p.reduce((b, n) => b + n % 2 !== i % 2 ? 1 : 0, 0), 0), (a, b) => b - a) -> [[0, 2], [1]]
 *
 * This function has a built-in time limit, and will stop generating if it starts taking too long
 */
export function bestPartition<Score>(upperBound: number, maxPartitions: number, score: (partition: number[][]) => Score, compareScores: (a: Score, b: Score) => number): number[][] {
    const timeLimit = Date.now() + 500
    let bestScore: Score | undefined
    let best: number[][] | undefined

    function helper(index: number, current: number[][], currentScore?: Score): void {
        if (Date.now() > timeLimit) {
            throw new Error('out of time')
        }

        if (index === upperBound) {
            currentScore = currentScore ?? score(current)
            if (bestScore === undefined || compareScores(currentScore, bestScore) > 0) {
                bestScore = currentScore
                best = current
            }
            return
        }

        if (current.length === 0) {
            helper(index + 1, [[index]])
            return
        }

        for (let i = 0; i < current.length; i++) {
            const newPartition = current.map((subset, j) =>
                i === j ? [...subset, index] : subset,
            )
            const newPartitionScore = score(newPartition)
            if (bestScore === undefined || compareScores(newPartitionScore, bestScore) >= 0) {
                helper(index + 1, newPartition, newPartitionScore)
            }
        }

        if (current.length < maxPartitions) {
            const newPartition = [...current, [index]]
            helper(index + 1, newPartition)
        }
    }

    helper(0, [])
    return best!
}
