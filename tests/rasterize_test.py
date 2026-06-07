import unittest

import numpy as np

from urbanstats.geometry.rle import (
    merge_rle_runs,
    rle_arrays_from_dict,
    rle_dict_from_arrays,
)


def _rle(tuples):
    """Helper: build array-format RLE from list of (row, start, end) tuples."""
    if not tuples:
        return (
            np.array([], dtype=np.int32),
            np.array([], dtype=np.int32),
            np.array([], dtype=np.int32),
        )
    rows, lon_starts, lon_ends = zip(*tuples)
    return (
        np.array(rows, dtype=np.int32),
        np.array(lon_starts, dtype=np.int32),
        np.array(lon_ends, dtype=np.int32),
    )


def _rle_dict(tuples):
    """Helper: build dict-format RLE from list of (row, start, end) tuples."""
    return rle_dict_from_arrays(*_rle(tuples)) if tuples else {}


def _dict_to_tuples(rle_dict):
    """Helper: convert dict-format RLE to list of (row, start, end)."""
    if not rle_dict:
        return []
    rows, lon_starts, lon_ends = rle_arrays_from_dict(rle_dict)
    return list(zip(rows.tolist(), lon_starts.tolist(), lon_ends.tolist()))


class TestMergeRleRuns(unittest.TestCase):
    def test_empty_list(self):
        result = merge_rle_runs([])
        self.assertEqual(result, {})
        self.assertEqual(_dict_to_tuples(result), [])

    def test_single_rle_unchanged(self):
        rle = _rle_dict([(0, 10, 20), (0, 30, 40)])
        result = merge_rle_runs([rle])
        self.assertEqual(_dict_to_tuples(result), [(0, 10, 20), (0, 30, 40)])

    def test_two_rles_same_row_non_overlapping(self):
        rle1 = _rle_dict([(0, 0, 9)])
        rle2 = _rle_dict([(0, 20, 29)])
        result = merge_rle_runs([rle1, rle2])
        self.assertEqual(_dict_to_tuples(result), [(0, 0, 9), (0, 20, 29)])

    def test_two_rles_same_row_overlapping(self):
        rle1 = _rle_dict([(0, 0, 15)])
        rle2 = _rle_dict([(0, 10, 25)])
        result = merge_rle_runs([rle1, rle2])
        self.assertEqual(_dict_to_tuples(result), [(0, 0, 25)])

    def test_two_rles_same_row_adjacent(self):
        rle1 = _rle_dict([(0, 0, 9)])
        rle2 = _rle_dict([(0, 10, 19)])
        result = merge_rle_runs([rle1, rle2])
        self.assertEqual(_dict_to_tuples(result), [(0, 0, 19)])

    def test_two_rles_different_rows(self):
        rle1 = _rle_dict([(0, 5, 15)])
        rle2 = _rle_dict([(1, 5, 15)])
        result = merge_rle_runs([rle1, rle2])
        self.assertEqual(_dict_to_tuples(result), [(0, 5, 15), (1, 5, 15)])

    def test_merge_three_intervals_same_row(self):
        rle1 = _rle_dict([(0, 0, 9)])
        rle2 = _rle_dict([(0, 10, 19)])
        rle3 = _rle_dict([(0, 20, 29)])
        result = merge_rle_runs([rle1, rle2, rle3])
        self.assertEqual(_dict_to_tuples(result), [(0, 0, 29)])

    def test_merge_three_intervals_gap_in_middle(self):
        rle1 = _rle_dict([(0, 0, 9)])
        rle2 = _rle_dict([(0, 20, 29)])
        rle3 = _rle_dict([(0, 10, 19)])
        result = merge_rle_runs([rle1, rle2, rle3])
        self.assertEqual(_dict_to_tuples(result), [(0, 0, 29)])

    def test_rows_sorted(self):
        rle1 = _rle_dict([(2, 0, 5)])
        rle2 = _rle_dict([(0, 0, 5)])
        rle3 = _rle_dict([(1, 0, 5)])
        result = merge_rle_runs([rle1, rle2, rle3])
        self.assertEqual(
            _dict_to_tuples(result),
            [(0, 0, 5), (1, 0, 5), (2, 0, 5)],
        )

    def test_adjacent_plus_one_gap_merges(self):
        rle1 = _rle_dict([(0, 0, 9)])
        rle2 = _rle_dict([(0, 10, 10)])
        result = merge_rle_runs([rle1, rle2])
        self.assertEqual(_dict_to_tuples(result), [(0, 0, 10)])
