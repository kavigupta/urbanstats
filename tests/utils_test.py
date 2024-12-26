import unittest
from collections import Counter

import numpy as np
from parameterized import parameterized

from urbanstats.utils import DiscreteDistribution, compute_bins, compute_bins_slow


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
