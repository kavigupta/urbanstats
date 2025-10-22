import unittest
from collections import Counter

import numpy as np
from parameterized import parameterized

from urbanstats.utils import (
    DiscreteDistribution,
    approximate_quantile,
    compute_bins,
    compute_bins_slow,
)


class TestComputeBinsSlowWorksAsIntended(unittest.TestCase):
    def test_empty(self):
        data = np.array([])
        weight = np.ones_like(data)
        bin_size = 0.1
        expected = [0.0]
        self.assertEqual(compute_bins_slow(data, weight, bin_size=bin_size), expected)

    def test_basic_unweighted(self):
        data = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        weight = np.ones_like(data)
        bin_size = 0.1
        expected = [0, 1, 1, 1, 1, 1]
        self.assertEqual(compute_bins_slow(data, weight, bin_size=bin_size), expected)

    def test_multiple_unweighted(self):
        data = np.array([0.1, 0.2, 0.3, 0.3, 0.3, 0.5])
        weight = np.ones_like(data)
        bin_size = 0.1
        expected = [0, 1, 1, 3, 0, 1]

        self.assertEqual(compute_bins_slow(data, weight, bin_size=bin_size), expected)

    def test_clipping_top_doesnt_happen(self):
        data = np.array([0.1, 0.2, 0.3, 0.4, 0.5, 5.0])
        weight = np.ones_like(data)
        bin_size = 0.1
        # ... 0.5, then 0.6-4.9 is empty for 44 bins, then 5.0
        expected = [0, 1, 1, 1, 1, 1] + [0] * 44 + [1]
        self.assertEqual(compute_bins_slow(data, weight, bin_size=bin_size), expected)

    def test_clipping_bottom(self):
        data = np.array([-0.1, 0, 0.1, 0.2, 0.3])
        weight = np.ones_like(data)
        bin_size = 0.1
        expected = [2, 1, 1, 1]
        self.assertEqual(compute_bins_slow(data, weight, bin_size=bin_size), expected)

    def test_weighted(self):
        data = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        weight = np.array([1, 2, 3, 4, 5])
        bin_size = 0.1
        expected = [0, 1, 2, 3, 4, 5]
        self.assertEqual(compute_bins_slow(data, weight, bin_size=bin_size), expected)

    @parameterized.expand([(seed,) for seed in range(100)])
    def test_random(self, seed):
        np.random.seed(seed)
        data = np.random.randn(1000) * 0.5
        weight = np.random.randn(1000)
        bin_size = np.clip(np.abs(np.random.randn()), 0.01, None)
        result = compute_bins_slow(data, weight, bin_size=bin_size)
        self.assertAlmostEqual(np.sum(result), np.sum(weight), places=5)


class TestComputeBinsSameAsSlow(unittest.TestCase):
    def test_empty(self):
        data = np.array([])
        weight = np.ones_like(data)
        bin_size = 0.1
        self.assertSame(data, weight, bin_size)

    def test_basic_unweighted(self):
        data = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        weight = np.ones_like(data)
        bin_size = 0.1
        self.assertSame(data, weight, bin_size)

    def test_clipping_top(self):
        data = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        weight = np.ones_like(data)
        bin_size = 0.1
        self.assertSame(data, weight, bin_size)

    @parameterized.expand([(seed,) for seed in range(100)])
    def test_random(self, seed):
        np.random.seed(seed)
        amount = int(np.exp(np.abs(np.random.randn() * 2) - 1)) + 1
        data = np.random.randn(amount) * 0.5
        weight = np.random.randn(amount)
        bin_size = np.clip(np.abs(np.random.randn()), 0.01, None)
        self.assertSame(data, weight, bin_size)

    def assertSame(self, data, weight, bin_size):
        print(f"data={data}\nweight={weight}\nbin_size={bin_size}")
        result = compute_bins_slow(data, weight, bin_size=bin_size)

        result2 = compute_bins(data, weight, bin_size=bin_size)
        self.assertTrue(np.allclose(result, result2))


class TestDsicreteDistribution(unittest.TestCase):
    @parameterized.expand([(seed,) for seed in range(10)])
    def test_even_distribution(self, seed):
        distro = DiscreteDistribution.of([1, 1, 1])
        n = 10**5
        samples = Counter(distro.sample(np.random.RandomState(seed), n))
        self.assertEqual(len(samples), 3)
        for i in range(3):
            self.assertAlmostEqual(samples[i] / n, 1 / 3, places=2)

    @parameterized.expand([(seed,) for seed in range(10)])
    def test_uneven_distribution(self, seed):
        distro = DiscreteDistribution.of([1, 100, 99])
        n = 10**6
        samples = Counter(distro.sample(np.random.RandomState(seed), n))
        self.assertEqual(len(samples), 3)
        self.assertAlmostEqual(samples[0] / n, 1 / 200, places=3)
        self.assertAlmostEqual(samples[1] / n, 100 / 200, places=2)
        self.assertAlmostEqual(samples[2] / n, 99 / 200, places=2)


class TestApproximateQuantiles(unittest.TestCase):
    def test_hits_a_bin_boundary(self):
        self.assertEqual(approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0), 0)
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.25), 100
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.5), 250
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 1.0), 300
        )

    def test_in_between_bins(self):
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.05), 20
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.1), 40
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.15), 60
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.2), 80
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.25), 100
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.3), 130
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.35), 160
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.4), 190
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.45), 220
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.5), 250
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.55), 255
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.6), 260
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.65), 265
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.7), 270
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.75), 275
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.8), 280
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.85), 285
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.9), 290
        )
        self.assertEqual(
            approximate_quantile([0, 100, 250, 300], [25, 25, 50], 0.95), 295
        )
        self.assertEqual(approximate_quantile([0, 100, 250, 300], [25, 25, 50], 1), 300)
