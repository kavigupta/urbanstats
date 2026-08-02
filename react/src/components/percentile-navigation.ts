/**
 * Given the population percentiles of every geography of a type, ordered from highest value to
 * lowest (i.e. by ordinal, so index 0 is the highest-ranked geography), return the index of the
 * geography to navigate to when the user requests a given percentile.
 *
 * Always navigates to the bottom of the percentile, so 50 is the median, 100 is the top, 0 is the bottom.
 */
export function percentileBucketIndex(populationPercentiles: number[], targetPercentile: number): number {
    const target = Math.max(0, Math.min(100, targetPercentile))
    // Default to the top geography, so a request above the maximum percentile resolves there.
    let index = 0
    for (let i = 0; i < populationPercentiles.length; i++) {
        if (populationPercentiles[i] >= target) {
            index = i
        }
    }
    return index
}
