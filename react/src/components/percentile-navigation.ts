/**
 * Given the population percentiles of every geography of a type, ordered from highest value to
 * lowest (i.e. by ordinal, so index 0 is the highest-ranked geography), return the index of the
 * geography to navigate to when the user requests a given percentile.
 *
 * `populationPercentiles[i]` is the share of the population (0-100) living in a geography with a
 * strictly lower value than geography `i`, so it is non-increasing as the index (and value) goes
 * down.
 *
 * We navigate to the "bottom" of the requested percentile bucket: the lowest-value geography that
 * still has at least `targetPercentile`% of the population below it. This sends the 0th percentile
 * to the least-valued geography (the last index), the 100th to the most-valued (index 0), and the
 * 50th to the population-weighted median. Because the most-populous geography holds a large share
 * of the population, the percentiles top out below 100, so any request above the maximum resolves
 * to the top geography.
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
