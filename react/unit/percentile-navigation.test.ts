import assert from 'assert/strict'
import { test } from 'node:test'

import { percentileBucketIndex } from '../src/components/percentile-navigation'

// Percentiles are ordered from highest-value geography (index 0) to lowest, and are the share of
// population living somewhere with a strictly lower value, so they are non-increasing. This example
// mirrors the shape of the real US-states-by-population data (California tops out at 88).
const percentiles = [88, 79, 73, 67, 52, 30, 10, 0]

void test('0th percentile goes to the last (lowest-value) geography', () => {
    assert.strictEqual(percentileBucketIndex(percentiles, 0), percentiles.length - 1)
})

void test('100th percentile goes to the first (highest-value) geography', () => {
    assert.strictEqual(percentileBucketIndex(percentiles, 100), 0)
})

void test('a percentile above the maximum resolves to the top geography', () => {
    // The maximum percentile here is 88, so 95 (like asking for the 95th-percentile state) -> index 0.
    assert.strictEqual(percentileBucketIndex(percentiles, 95), 0)
    assert.strictEqual(percentileBucketIndex(percentiles, 89), 0)
})

void test('the 50th percentile goes to the median geography', () => {
    // index 4 has 52% of the population below it and index 5 has 30%, so index 4 is the lowest-value
    // geography with at least half the population below it.
    assert.strictEqual(percentileBucketIndex(percentiles, 50), 4)
})

void test('requesting a geography\'s own percentile keeps you on it', () => {
    assert.strictEqual(percentileBucketIndex(percentiles, 88), 0) // California -> California
    assert.strictEqual(percentileBucketIndex(percentiles, 79), 1)
    assert.strictEqual(percentileBucketIndex(percentiles, 67), 3)
})

void test('goes to the bottom (lowest value) of a tied bucket', () => {
    // Three geographies share the 50th percentile; the bottom one is index 3.
    const tied = [88, 50, 50, 50, 10, 0]
    assert.strictEqual(percentileBucketIndex(tied, 50), 3)
})

void test('target is clamped to [0, 100]', () => {
    assert.strictEqual(percentileBucketIndex(percentiles, -20), percentiles.length - 1)
    assert.strictEqual(percentileBucketIndex(percentiles, 1000), 0)
})

void test('a single geography always resolves to index 0', () => {
    assert.strictEqual(percentileBucketIndex([42], 0), 0)
    assert.strictEqual(percentileBucketIndex([42], 100), 0)
})
