import unittest

from parameterized import parameterized
import numpy as np

from urbanstats.data.elevation import interpolate


class TestInterpolate(unittest.TestCase):
    def test_interpolate_basic_x(self):
        img = np.repeat(np.arange(10)[None], 10, axis=0)
        self.assertTrue(
            np.allclose(
                interpolate(img, np.array([2.3]), np.array([3.8])),
                [2.3],
            )
        )

    def test_interpolate_basic_y(self):
        img = np.repeat(np.arange(10)[:, None], 10, axis=1)
        self.assertTrue(
            np.allclose(
                interpolate(img, np.array([2.3]), np.array([3.8])),
                [3.8],
            )
        )

    @parameterized.expand([(seed,) for seed in range(10)])
    def test_interpolate_linear(self, seed):
        xs = np.arange(10)[None]
        ys = np.arange(10)[:, None]
        rng = np.random.RandomState(seed)
        xcoeff, ycoeff = rng.rand(2)
        img = xcoeff * xs + ycoeff * ys
        xidx = rng.rand(100) * 9
        yidx = rng.rand(100) * 9

        self.assertTrue(
            np.allclose(
                interpolate(img, xidx, yidx),
                xcoeff * xidx + ycoeff * yidx,
            )
        )
