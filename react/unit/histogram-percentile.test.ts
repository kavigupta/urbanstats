import assert from 'assert/strict'
import { test } from 'node:test'

import { approximateHistogramPercentile } from '../src/components/plots-histogram-utils'
import { Histogram } from '../src/utils/protos'

void test('approximateHistogramPercentile maps percentiles across bins', () => {
    const histogram = Histogram.create({
        binMin: 0,
        binSize: 1,
        counts: [1, 1, 1, 1],
    })

    assert.equal(approximateHistogramPercentile(histogram, 0), 0)
    assert.equal(approximateHistogramPercentile(histogram, 25), 1)
    assert.equal(approximateHistogramPercentile(histogram, 50), 2)
    assert.equal(approximateHistogramPercentile(histogram, 75), 3)
    assert.equal(approximateHistogramPercentile(histogram, 100), 4)
})

void test('approximateHistogramPercentile handles empty histograms', () => {
    const histogram = Histogram.create({
        binMin: 0,
        binSize: 1,
        counts: [],
    })

    assert.ok(Number.isNaN(approximateHistogramPercentile(histogram, 50)))
})
