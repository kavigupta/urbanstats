from dataclasses import dataclass
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np


@dataclass
class ValidQuizQuestions:
    """
    Contains indices of valid quiz questions.
    """

    geography_index_a: np.ndarray
    geography_index_b: np.ndarray
    stat_indices: np.ndarray

    @classmethod
    def join(cls, items: Sequence["ValidQuizQuestions"]) -> "ValidQuizQuestions":
        return cls(
            geography_index_a=np.concatenate([x.geography_index_a for x in items]),
            geography_index_b=np.concatenate([x.geography_index_b for x in items]),
            stat_indices=np.concatenate([x.stat_indices for x in items]),
        )

    def __len__(self) -> int:
        return len(self.stat_indices)

    def __getitem__(self, item: Any) -> "ValidQuizQuestions":
        return ValidQuizQuestions(
            geography_index_a=self.geography_index_a[item],
            geography_index_b=self.geography_index_b[item],
            stat_indices=self.stat_indices[item],
        )


def universe_overlap_mask(qt: Any, excluded_universes: List[str]) -> np.ndarray:
    excluded_universes_set = set(excluded_universes)
    non_default_non_continent_universes = [
        {u for u in us if u not in excluded_universes_set} for us in qt.universes
    ]
    return np.array(
        [
            [bool(a & b) for a in non_default_non_continent_universes]
            for b in non_default_non_continent_universes
        ]
    )


def _compute_difficulty_multipliers(
    qt: Any, col_to_difficulty: Dict[Any, float], intl_difficulty: float, excluded_universes: List[str]
) -> np.ndarray:
    # pylint: disable=unsupported-assignment-operation
    # diffmults is a numpy array
    diffmults = np.array(
        [col_to_difficulty[stat_col] for stat_col in list(qt.data.columns)]
    )[:, None, None]
    diffmults = np.repeat(diffmults, len(qt.data), axis=1)
    diffmults = np.repeat(diffmults, len(qt.data), axis=2)
    lrm = qt.local_region_mask
    diffmults[:, ~lrm, :] = intl_difficulty
    diffmults[:, :, ~lrm] = intl_difficulty
    diffmults[:, universe_overlap_mask(qt, excluded_universes)] = 0
    return diffmults


def invalid_values(values: np.ndarray) -> np.ndarray:
    values = np.abs(values)
    values = values / values.max(axis=1, keepdims=True)
    values = values < 1e-3
    return values[:, None, :] | values[:, :, None]


def _compute_adjusted_difficulties(
    qt: Any,
    col_to_difficulty: Dict[Any, float],
    intl_difficulty: float,
    diff_ranges: List[Tuple[float, float]],
    excluded_universes: List[str],
    *,
    descriptor_by_col: Dict[str, Any],
) -> np.ndarray:
    descriptors = [descriptor_by_col[stat_col] for stat_col in qt.data.columns]
    excluded_cols = [
        bool(set(d.exclude_geography_types) & set(qt.regions)) for d in descriptors
    ]
    max_pct_diff = max(max(x) for x in diff_ranges)
    values = np.array(qt.data).T
    invalid_mask = invalid_values(values)
    vals_a, vals_b = values[:, None], values[:, :, None]
    raw_pct_diff = (
        np.abs(vals_a - vals_b) / np.minimum(np.abs(vals_a), np.abs(vals_b)) * 100
    )
    raw_pct_diff[invalid_mask] = np.inf
    raw_pct_diff[raw_pct_diff > max_pct_diff] = np.inf
    if any(excluded_cols):
        raw_pct_diff[excluded_cols, :, :] = np.inf

    adj_pct_diff = raw_pct_diff / _compute_difficulty_multipliers(
        qt, col_to_difficulty, intl_difficulty, excluded_universes
    )
    return adj_pct_diff


def _compute_adjusted_difficulty_masks(
    qt: Any,
    col_to_difficulty: Dict[Any, float],
    intl_difficulty: float,
    diff_ranges: List[Tuple[float, float]],
    excluded_universes: List[str],
    *,
    descriptor_by_col: Dict[str, Any],
) -> List[np.ndarray]:
    adj_difficulties = _compute_adjusted_difficulties(
        qt,
        col_to_difficulty,
        intl_difficulty,
        diff_ranges,
        excluded_universes,
        descriptor_by_col=descriptor_by_col,
    )
    return [
        (lo <= adj_difficulties) & (adj_difficulties < hi) for lo, hi in diff_ranges
    ]


def classify_questions(
    qt: Any,
    stat_to_index: Dict[str, int],
    geo_to_index: Dict[str, int],
    *,
    col_to_difficulty: Dict[Any, float],
    intl_difficulty: float,
    diff_ranges: List[Tuple[float, float]],
    excluded_universes: List[str],
    descriptor_by_col: Dict[str, Any],
) -> List[ValidQuizQuestions]:
    # pylint: disable=too-many-locals
    remap_stats = np.array([stat_to_index[stat] for stat in qt.data])
    remap_geos = np.array([geo_to_index[geo] for geo in qt.data.index])
    results = []
    for mask in _compute_adjusted_difficulty_masks(
        qt,
        col_to_difficulty,
        intl_difficulty,
        diff_ranges,
        excluded_universes,
        descriptor_by_col=descriptor_by_col,
    ):
        stat_indices, a_indices, b_indices = np.where(mask)
        a_lt_b_mask = a_indices < b_indices
        stat_indices = stat_indices[a_lt_b_mask]
        a_indices, b_indices = a_indices[a_lt_b_mask], b_indices[a_lt_b_mask]
        results.append(
            ValidQuizQuestions(
                geography_index_a=remap_geos[a_indices],
                geography_index_b=remap_geos[b_indices],
                stat_indices=remap_stats[stat_indices],
            )
        )
    return results
