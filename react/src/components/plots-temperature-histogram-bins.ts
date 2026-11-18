// Pure bin/label math for TemperatureHistogramPlot, kept dependency-free (no React, no Observable
// Plot, no CSS imports) so it can be unit tested directly with node:test.

// boundary j (0 <= j < numBins - 1) sits at temperature binMin + j*binSize. Bucket i's point is
// plotted at x = i - 0.5, i.e. between boundary (i-1) and boundary i -- so the axis only needs to
// label each boundary once (a single temperature), instead of repeating it in adjacent bucket-range labels.
export function boundaryLabel(boundaryIdx: number, binMin: number, binSize: number, convert: (v: number) => number, unitSuffix: string): string {
    return `${Math.round(convert(binMin + boundaryIdx * binSize))}${unitSuffix}`
}

// descriptive range for a bucket, used only in the hover tooltip (not on the axis, where
// adjacent buckets' ranges would redundantly repeat the shared boundary value)
export function bucketRangeLabel(binIdx: number, binMin: number, binSize: number, convert: (v: number) => number, unitSuffix: string): string {
    const round = (v: number): string => Math.round(convert(v)).toString()
    const lo = binMin + (binIdx - 1) * binSize
    const hi = lo + binSize
    return `${round(lo)}-${round(hi)}${unitSuffix}`
}

// trims the real bins (1 <= idx <= numBins - 2, excluding the open-ended catch-all buckets at
// 0 and numBins - 1) down to the range that actually has data across all compared histograms,
// plus one bin of padding on each side -- so a region's plot zooms to its own temperature range
// instead of always spanning the fixed global bin range (-40 to 140F)
export function temperatureHistogramBounds(countsPerHistogram: number[][], numBins: number): [number, number] {
    const firstNonZero = (counts: number[]): number => {
        let i = 1
        while (i < numBins - 1 && counts[i] === 0) {
            i++
        }
        return i
    }
    const lastNonZero = (counts: number[]): number => {
        let i = numBins - 2
        while (i > 1 && counts[i] === 0) {
            i--
        }
        return i
    }
    const binIdxStart = Math.max(1, Math.min(...countsPerHistogram.map(firstNonZero)) - 1)
    const binIdxEnd = Math.min(numBins - 2, Math.max(...countsPerHistogram.map(lastNonZero)) + 1)
    // all-zero data (e.g. an invalid stat) -- fall back to the full bin range rather than an empty one
    if (binIdxStart >= binIdxEnd) {
        return [1, numBins - 2]
    }
    return [binIdxStart, binIdxEnd]
}
