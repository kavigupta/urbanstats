import unittest

import numpy as np
from parameterized import parameterized

from urbanstats.geometry.rle import (
    intersect_rle_runs,
    merge_rle_runs,
    rle_bounds,
    pad_rle,
)


def bool_to_rle_dict(mask: np.ndarray):
    """
    Convert a 2D boolean array into dict-format RLE:
    {row: [(start_col, end_col), ...]} with merged, sorted intervals.
    """
    assert mask.ndim == 2
    nrows, ncols = mask.shape
    rle = {}
    for row in range(nrows):
        row_vals = mask[row]
        if not np.any(row_vals):
            continue
        starts = []
        ends = []
        in_run = False
        for col in range(ncols):
            if row_vals[col]:
                if not in_run:
                    in_run = True
                    starts.append(col)
                last_true = col
            else:
                if in_run:
                    in_run = False
                    ends.append(last_true)
        if in_run:
            ends.append(last_true)
        rle[row] = list(zip(starts, ends))
    return rle


class TestRleFuzz(unittest.TestCase):
    def _random_masks(self, rng, n_masks, shape):
        rows, cols = shape
        masks = []
        for _ in range(n_masks):
            p = rng.uniform(0.05, 0.95)
            masks.append(rng.random((rows, cols)) < p)
        return masks

    @parameterized.expand([(seed,) for seed in range(50)])
    def test_merge_rle_runs_fuzz(self, seed):
        rows, cols = 32, 64
        rng = np.random.RandomState(seed)
        n_masks = rng.randint(1, 5)
        masks = self._random_masks(rng, n_masks, (rows, cols))

        rles = [bool_to_rle_dict(m) for m in masks]
        merged_rle = merge_rle_runs(rles)

        merged_array = np.any(masks, axis=0)
        merged_rle_direct = bool_to_rle_dict(merged_array)

        self.assertEqual(merged_rle, merged_rle_direct)

    @parameterized.expand([(seed,) for seed in range(50)])
    def test_intersect_rle_runs_fuzz(self, seed):
        rows, cols = 32, 64
        rng = np.random.RandomState(seed)

        masks = self._random_masks(rng, 2, (rows, cols))
        a, b = masks

        rle_a = bool_to_rle_dict(a)
        rle_b = bool_to_rle_dict(b)
        inter_rle = intersect_rle_runs(rle_a, rle_b)

        inter_array = a & b
        inter_rle_direct = bool_to_rle_dict(inter_array)

        self.assertEqual(inter_rle, inter_rle_direct)

    @parameterized.expand([(seed,) for seed in range(50)])
    def test_rle_bounds_fuzz(self, seed):
        rows, cols = 32, 64
        rng = np.random.RandomState(seed)
        mask = rng.random((rows, cols)) < rng.uniform(0.0, 1.0)

        rle = bool_to_rle_dict(mask)
        min_row, max_row, min_col, max_col = rle_bounds(rle)

        if not np.any(mask):
            self.assertIsNone(min_row)
            self.assertIsNone(max_row)
            self.assertIsNone(min_col)
            self.assertIsNone(max_col)
        else:
            ys, xs = np.where(mask)
            self.assertEqual(min_row, int(ys.min()))
            self.assertEqual(max_row, int(ys.max()))
            self.assertEqual(min_col, int(xs.min()))
            self.assertEqual(max_col, int(xs.max()))

    @parameterized.expand(
        [
            (seed, rx, ry)
            for seed in range(20)
            for rx in (0.5, 1.0, 2.0)
            for ry in (0.5, 1.0, 2.0)
        ]
    )
    def test_pad_rle_fuzz(self, seed, rx0, ry0):
        rows, cols = 16, 32
        rng = np.random.RandomState(seed)
        mask = rng.random((rows, cols)) < rng.uniform(0.0, 1.0)

        rle = bool_to_rle_dict(mask)
        radius_fn = lambda y: (rx0 * np.log(y + 1), ry0)
        padded_rle = pad_rle(rle, radius_fn, shape=mask.shape)

        padded_mask = np.zeros_like(mask, dtype=bool)

        xmask, ymask = np.meshgrid(np.arange(cols), np.arange(rows))
        for y, x in zip(*np.where(mask)):
            dx = xmask - x
            dy = ymask - y
            rx, ry = radius_fn(y)
            in_ellipse = (dx / rx) ** 2 + (dy / ry) ** 2 <= 1
            padded_mask |= in_ellipse

        padded_rle_direct = bool_to_rle_dict(padded_mask)
        self.assertEqual(padded_rle, padded_rle_direct)


if __name__ == "__main__":
    unittest.main()
