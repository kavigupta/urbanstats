import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { boundaryLabel, bucketRangeLabel, temperatureHistogramBounds } from '../src/components/plots-temperature-histogram-bins'

// real bin data always has this shape: index 0 and index (counts.length - 1) are open-ended
// catch-all buckets ("<= min" / "> max"), and indices 1..counts.length-2 are the two-sided bins.
const numBins = 20 // matches the live -40F..140F, 10-degree-wide binning
const binMin = -40
const binSize = 10

// all zero except at the given real-bin indices (1..numBins-2), each set to `count`
function countsWithDataAt(indices: number[], count = 100): number[] {
    const counts = new Array<number>(numBins).fill(0)
    for (const i of indices) {
        counts[i] = count
    }
    return counts
}

void describe('temperatureHistogramBounds', () => {
    void test('clips to the nonzero range plus one bin of padding, Los-Angeles-like (mild, temperate climate)', () => {
        // real days concentrated at indices 8-13 (i.e. 40F-100F): -40+8*10=40, -40+14*10=100
        const counts = countsWithDataAt([8, 9, 10, 11, 12, 13])
        const [start, end] = temperatureHistogramBounds([counts], numBins)
        assert.equal(start, 7)
        assert.equal(end, 14)
        // sanity: resulting boundary temperatures must stay within the real, global bin range
        assert.ok(binMin + (start - 1) * binSize >= binMin)
        assert.ok(binMin + end * binSize <= binMin + (numBins - 2) * binSize)
        assert.equal(binMin + (start - 1) * binSize, 20)
        assert.equal(binMin + end * binSize, 100)
    })

    void test('never clips past the real bin range even with no padding room at the low end', () => {
        const counts = countsWithDataAt([1, 2, 3])
        const [start, end] = temperatureHistogramBounds([counts], numBins)
        assert.equal(start, 1) // clamped, can't go below the first real bin
        assert.equal(end, 4)
    })

    void test('never clips past the real bin range even with no padding room at the high end', () => {
        const counts = countsWithDataAt([numBins - 4, numBins - 3, numBins - 2])
        const [start, end] = temperatureHistogramBounds([counts], numBins)
        assert.equal(start, numBins - 5)
        assert.equal(end, numBins - 2) // clamped, can't go past the last real bin
    })

    void test('a single nonzero real bin still produces a valid, padded range', () => {
        const counts = countsWithDataAt([10])
        const [start, end] = temperatureHistogramBounds([counts], numBins)
        assert.equal(start, 9)
        assert.equal(end, 11)
    })

    void test('ignores the open-ended catch-all buckets (index 0 and numBins - 1) even when huge', () => {
        const counts = countsWithDataAt([10])
        counts[0] = 1_000_000
        counts[numBins - 1] = 1_000_000
        const [start, end] = temperatureHistogramBounds([counts], numBins)
        assert.equal(start, 9)
        assert.equal(end, 11)
    })

    void test('falls back to the full real-bin range when every bin is zero (e.g. invalid data)', () => {
        const counts = countsWithDataAt([])
        const [start, end] = temperatureHistogramBounds([counts], numBins)
        assert.equal(start, 1)
        assert.equal(end, numBins - 2)
    })

    void test('unions the nonzero ranges across multiple compared histograms (comparison view)', () => {
        const cold = countsWithDataAt([2, 3]) // e.g. a very cold region
        const hot = countsWithDataAt([16, 17]) // e.g. a very hot region
        const [start, end] = temperatureHistogramBounds([cold, hot], numBins)
        assert.equal(start, 1) // cold region's start (2 - 1), clamped
        assert.equal(end, numBins - 2) // hot region's end (17 + 1), clamped
    })

    void test('one all-zero histogram compared against a real one does not widen the range', () => {
        const empty = countsWithDataAt([])
        const real = countsWithDataAt([9, 10, 11])
        const [start, end] = temperatureHistogramBounds([empty, real], numBins)
        assert.equal(start, 8)
        assert.equal(end, 12)
    })

    void test('resulting boundary index is always within [0, numBins - 2] for a variety of shapes', () => {
        const scenarios = [
            countsWithDataAt([1]),
            countsWithDataAt([numBins - 2]),
            countsWithDataAt(Array.from({ length: numBins - 2 }, (_, i) => i + 1)), // every real bin populated
            countsWithDataAt([]),
            countsWithDataAt([9]),
        ]
        for (const counts of scenarios) {
            const [start, end] = temperatureHistogramBounds([counts], numBins)
            const lowestBoundary = start - 1
            const highestBoundary = end
            assert.ok(lowestBoundary >= 0, `lowest boundary ${lowestBoundary} should be >= 0`)
            assert.ok(highestBoundary <= numBins - 2, `highest boundary ${highestBoundary} should be <= ${numBins - 2}`)
        }
    })
})

void describe('boundaryLabel', () => {
    const identity = (v: number): number => v

    void test('computes the boundary temperature from the bin index, with no conversion', () => {
        assert.equal(boundaryLabel(0, binMin, binSize, identity, '°F'), '-40°F')
        assert.equal(boundaryLabel(18, binMin, binSize, identity, '°F'), '140°F')
        assert.equal(boundaryLabel(4, binMin, binSize, identity, '°F'), '0°F')
    })

    void test('never exceeds the true max temperature (140F) for any in-range boundary index', () => {
        for (let j = 0; j <= numBins - 2; j++) {
            const label = boundaryLabel(j, binMin, binSize, identity, '°F')
            const value = Number(label.replaceAll('°F', ''))
            assert.ok(value >= binMin, `${label} should be >= ${binMin}F`)
            assert.ok(value <= binMin + (numBins - 2) * binSize, `${label} should be <= 140F`)
        }
    })

    void test('applies a unit conversion function before formatting', () => {
        const fahrenheitToCelsius = (f: number): number => (f - 32) * 5 / 9
        // boundary 18 -> 140F -> exactly 60C
        assert.equal(boundaryLabel(18, binMin, binSize, fahrenheitToCelsius, '°C'), '60°C')
        // boundary 0 -> -40F -> exactly -40C
        assert.equal(boundaryLabel(0, binMin, binSize, fahrenheitToCelsius, '°C'), '-40°C')
    })

    void test('rounds fractional converted values', () => {
        const fahrenheitToCelsius = (f: number): number => (f - 32) * 5 / 9
        // boundary 5 -> -40 + 50 = 10F -> (10-32)*5/9 = -12.222...C
        assert.equal(boundaryLabel(5, binMin, binSize, fahrenheitToCelsius, '°C'), '-12°C')
    })
})

void describe('bucketRangeLabel', () => {
    const identity = (v: number): number => v

    void test('computes the [lo, hi) temperature range covered by a real bin', () => {
        // binIdx 1 covers boundary 0 to boundary 1: -40 to -30
        assert.equal(bucketRangeLabel(1, binMin, binSize, identity, '°F'), '-40--30°F')
        // binIdx 10 covers boundary 9 to boundary 10: 50 to 60
        assert.equal(bucketRangeLabel(10, binMin, binSize, identity, '°F'), '50-60°F')
        // binIdx 18 (last real bin) covers boundary 17 to boundary 18: 130 to 140
        assert.equal(bucketRangeLabel(18, binMin, binSize, identity, '°F'), '130-140°F')
    })

    void test('never produces a hi value above the true max temperature (140F)', () => {
        for (let binIdx = 1; binIdx <= numBins - 2; binIdx++) {
            const label = bucketRangeLabel(binIdx, binMin, binSize, identity, '°F')
            // signed integers only, e.g. "-40--30°F" -> ["-40", "-30"]; split('-') would mis-parse the negative hi
            const numbers = label.match(/-?\d+/g)!
            const hi = Number(numbers[numbers.length - 1])
            assert.ok(hi <= binMin + (numBins - 2) * binSize, `${label}'s hi should be <= 140F`)
        }
    })
})
