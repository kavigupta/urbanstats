"""
Run-length encoding (RLE) helpers for rasterized shapes.

Two formats:
- Array format (rasterize_using_lines): (rows, lon_starts, lon_ends)
- Dict format (for relationship_equirectangular): {row: [(lon_start, lon_end), ...]}
"""

from collections import defaultdict

import numpy as np
import tqdm.auto as tqdm

# 3 arcsec = 1200 pixels per degree (same as GHS 3 arcsec)
RESOLUTION_3ARCSEC = 1200


def _merge_intervals(intervals):
    """Merge overlapping/adjacent intervals. intervals is sorted list of (s, e)."""
    if not intervals:
        return []
    merged = [intervals[0]]
    for a, b in intervals[1:]:
        if a <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    return merged


def rle_dict_from_arrays(rows, lon_starts, lon_ends):
    """Convert array-format RLE to dict format: {row: [(lon_start, lon_end), ...]}."""
    by_row = defaultdict(list)
    for i in range(len(rows)):
        by_row[int(rows[i])].append((int(lon_starts[i]), int(lon_ends[i])))
    return {
        row: _merge_intervals(sorted(intervals))
        for row, intervals in sorted(by_row.items())
    }


def rle_arrays_from_dict(rle_dict):
    """Convert dict-format RLE to array format for exract_raster_points."""
    out_rows, out_lon_start, out_lon_end = [], [], []
    for row in sorted(rle_dict.keys()):
        for s, e in rle_dict[row]:
            out_rows.append(row)
            out_lon_start.append(s)
            out_lon_end.append(e)
    return (
        np.array(out_rows, dtype=np.int32),
        np.array(out_lon_start, dtype=np.int32),
        np.array(out_lon_end, dtype=np.int32),
    )


def merge_rle_runs(list_of_rles):
    """
    Union multiple dict-format RLEs into one.
    Returns dict {row: [(lon_start, lon_end), ...]}.
    """
    if not list_of_rles:
        return {}
    by_row = defaultdict(list)
    for d in list_of_rles:
        for row, intervals in d.items():
            by_row[row].extend(intervals)
    return {
        row: _merge_intervals(sorted(intervals))
        for row, intervals in sorted(by_row.items())
    }


def intersect_rle_runs(rle_a, rle_b):
    """
    Intersection of two dict-format RLEs.
    Returns dict {row: [(lon_start, lon_end), ...]} of cells in both a and b.
    """
    result = {}
    for row in sorted(set(rle_a) & set(rle_b)):
        a_intervals = rle_a[row]
        b_intervals = rle_b[row]
        i = j = 0
        intersections = []
        while i < len(a_intervals) and j < len(b_intervals):
            s1, e1 = a_intervals[i]
            s2, e2 = b_intervals[j]
            lo, hi = max(s1, s2), min(e1, e2)
            if lo <= hi:
                intersections.append((lo, hi))
            if e1 < e2:
                i += 1
            else:
                j += 1
        if intersections:
            result[row] = intersections
    return result


def rle_bounds(rle):
    """
    Compute the bounding box of an RLE as (min_row, max_row, min_col, max_col).
    """
    if not rle:
        return (0, 0, 0, 0)

    min_row = min(rle)
    max_row = max(rle)

    min_col = None
    max_col = None
    for intervals in rle.values():
        for s, e in intervals:
            if min_col is None or s < min_col:
                min_col = s
            if max_col is None or e > max_col:
                max_col = e

    return min_row, max_row, min_col, max_col


def rle_spatial_join(list_a, list_b):
    """
    Return pairs of indices (i, j) such that list_a[i] and list_b[j] overlap
    (have at least one cell in common). Uses precomputed bounds and row-sweep
    to limit full intersection checks to bbox-overlapping candidates.
    """
    bounds_a = np.array([rle_bounds(r) for r in list_a])
    bounds_b = np.array([rle_bounds(r) for r in list_b])
    results = []
    for i, j in tqdm.tqdm(
        bounding_box_overlaps(bounds_a, bounds_b), desc="RLE spatial join", delay=10
    ):
        inter = intersect_rle_runs(list_a[i], list_b[j])
        if inter:
            results.append((i, j))
    return results


def bounding_box_overlaps(bounds_a, bounds_b):
    num_pairs = 10_000_000
    if len(bounds_a) * len(bounds_b) > num_pairs and len(bounds_b) > 1:
        b_chunk_size = max(1, 10_000_000 // len(bounds_a))
        return [
            pair
            for i in tqdm.trange(
                0, len(bounds_b), b_chunk_size, delay=10, desc="Bounding box overlaps"
            )
            for pair in bounding_box_overlaps(bounds_a, bounds_b[i : i + b_chunk_size])
        ]
    xmin_a, xmax_a, ymin_a, ymax_a = (
        bounds_a[:, 0],
        bounds_a[:, 1],
        bounds_a[:, 2],
        bounds_a[:, 3],
    )
    xmin_b, xmax_b, ymin_b, ymax_b = (
        bounds_b[:, 0],
        bounds_b[:, 1],
        bounds_b[:, 2],
        bounds_b[:, 3],
    )
    xoverlap_mask = (xmax_a[:, None] >= xmin_b) & (xmax_b >= xmin_a[:, None])
    yoverlap_mask = (ymax_a[:, None] >= ymin_b) & (ymax_b >= ymin_a[:, None])
    overlap_mask = xoverlap_mask & yoverlap_mask
    a_idxs, b_idxs = np.where(overlap_mask)
    return list(zip(a_idxs, b_idxs))


def pad_rle(rle, radius_fn, ry, *, shape=None):
    """
    Pad (dilate) an RLE using per-cell ellipses.

    Accepts either dict-format RLE ({row: [(start, end), ...]}) or array-format
    (rows, lon_starts, lon_ends). The padding is defined by radius_fn(y) -> rx
    (x-radius in cells for row y) and ry (y-radius in cells, constant).
    Returns dict-format RLE.

    If shape is provided as (nrows, ncols), the padded RLE is clipped so that
    0 <= row < nrows and 0 <= col < ncols.
    """
    if not isinstance(rle, dict):
        rows, lon_starts, lon_ends = rle
        rle = rle_dict_from_arrays(rows, lon_starts, lon_ends)
    if not rle:
        return {}
    if ry <= 0:
        return {}

    max_row = max_col = None
    if shape is not None:
        max_row, max_col = shape

    max_dy = int(np.ceil(ry))
    output_rows = set()
    for row in rle:
        rx = radius_fn(row)
        if rx <= 0:
            continue
        for dy in range(-max_dy, max_dy + 1):
            yy = row + dy
            if max_row is not None and (yy < 0 or yy >= max_row):
                continue
            output_rows.add(yy)

    result = {}
    for yy in sorted(output_rows):
        row_intervals = []
        for dy in range(-max_dy, max_dy + 1):
            row = yy - dy
            if row not in rle:
                continue
            intervals = rle[row]
            rx = radius_fn(row)
            if rx <= 0:
                continue
            y_term = (dy / ry) ** 2
            if y_term > 1:
                continue
            max_dx = int(np.floor(rx * np.sqrt(1 - y_term)))
            for s, e in intervals:
                start = s - max_dx
                end = e + max_dx
                if max_col is not None:
                    if end < 0 or start >= max_col:
                        continue
                    start = max(start, 0)
                    end = min(end, max_col - 1)
                if start <= end:
                    row_intervals.append((start, end))
        merged = _merge_intervals(sorted(row_intervals))
        if merged:
            result[yy] = merged
    return result
