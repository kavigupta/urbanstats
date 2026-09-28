import unittest

import numpy as np

from urbanstats.data.gpw import median_from_histogram, produce_histogram


def weighted_median(values, weights):
    order = np.argsort(values)
    cumulative = np.cumsum(weights[order])
    return values[order][np.searchsorted(cumulative, cumulative[-1] / 2)]


class MedianFromHistogramTest(unittest.TestCase):
    def test_missing_or_empty(self):
        self.assertTrue(np.isnan(median_from_histogram(np.nan)))
        self.assertTrue(np.isnan(median_from_histogram(np.zeros(3))))

    def test_single_bin_is_its_center(self):
        self.assertAlmostEqual(median_from_histogram(np.array([0, 0, 5.0])), 10**0.2)

    def test_within_a_bin_of_the_exact_median(self):
        rng = np.random.default_rng(0)
        for _ in range(20):
            density = 10 ** rng.uniform(0, 5, size=rng.integers(1, 500))
            population = rng.integers(1, 1000, size=len(density)).astype(float)
            estimate = median_from_histogram(produce_histogram(density, population))
            exact = weighted_median(density, population)
            self.assertLess(abs(np.log10(estimate / exact)), 0.1)
