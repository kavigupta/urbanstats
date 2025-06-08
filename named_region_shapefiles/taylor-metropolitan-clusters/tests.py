import unittest
from parameterized import parameterized

import numpy as np

from create_shapefile import encode_as_rows


class EncodeAsRowsTests(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(
            encode_as_rows(np.array([1, 1, 1]), np.array([2, 3, 4])), [[1, 2, 4]]
        )

    def test_two_rows(self):
        self.assertEqual(
            encode_as_rows(np.array([1, 1, 2, 2]), np.array([2, 3, 4, 5])),
            [[1, 2, 3], [2, 4, 5]],
        )

    def test_three_rows(self):
        self.assertEqual(
            encode_as_rows(np.array([1, 1, 2, 2, 3, 3]), np.array([2, 3, 4, 5, 6, 7])),
            [[1, 2, 3], [2, 4, 5], [3, 6, 7]],
        )

    def test_gap_in_row(self):
        self.assertEqual(
            encode_as_rows(
                np.array([1, 1, 1, 1, 1, 1, 2, 2, 2, 2]),
                np.array([2, 3, 4, 6, 7, 8, 8, 9, 10, 11]),
            ),
            [[1, 2, 4], [1, 6, 8], [2, 8, 11]],
        )

    @parameterized.expand([(seed,) for seed in range(100)])
    def test_order_invariance(self, seed):
        """
        Test that the order of the input does not affect the output.
        """
        size = 100
        count = 100
        np.random.seed(seed)
        x = np.random.randint(0, size, size=count)
        y = np.random.randint(0, size, size=count)
        rows1 = encode_as_rows(x, y)
        order = np.random.permutation(len(x))
        rows2 = encode_as_rows(x[order], y[order])
        self.assertCountEqual(rows1, rows2)
