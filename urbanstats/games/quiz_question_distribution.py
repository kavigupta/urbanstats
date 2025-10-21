from typing import Counter

import numpy as np
import pandas as pd

from urbanstats.games.fit_distribution.distribution import train_quiz_question_weights
from urbanstats.games.quiz_columns import get_quiz_stats, stat_to_difficulty
from urbanstats.universe.universe_list import (
    default_universes,
    universe_by_universe_type,
)

INTERNATIONAL_DIFFICULTY_MULTIPLIER = 2
RANGES = [
    (200, 500),
    (125, 200),
    (75, 125),
    (40, 75),
    (5, 40),
]

MIN_POP = 250_000
MIN_POP_INTERNATIONAL = 2_500_000


# vulture: ignore -- used in notebooks
def compute_difficulty(stat_a, stat_b, stat_column_original, a, b):
    diffmult = stat_to_difficulty()[stat_column_original]
    if not any(x.endswith("USA") or x.endswith("Canada") for x in (a, b)):
        diffmult = INTERNATIONAL_DIFFICULTY_MULTIPLIER
    diff = abs(stat_a - stat_b) / min(abs(stat_a), abs(stat_b)) * 100
    diff = diff / diffmult
    return diff


def compute_geo_target(qqp, geographies_by_type):
    geo_weight = pd.concat(
        [
            qt.weight_internal
            / qt.weight_internal.sum()
            * qt.weight_internal.shape[0] ** 0.5
            for _, qt in geographies_by_type.items()
        ]
    )
    geo_weight /= geo_weight.sum()
    geo_target = np.array(geo_weight.loc[qqp.all_geographies])

    return geo_target


def compute_stat_target(qqp):
    collections = collections_each(qqp)
    count_collections = Counter(collections)
    stat_target = np.array(
        [c.weight_entire_collection / count_collections[c] ** 0.1 for c in collections]
    )
    stat_target /= stat_target.sum()
    return stat_target


def collections_each(qqp):
    collections = {
        col: descriptor.collection for col, descriptor, _ in get_quiz_stats()
    }
    collections = [collections[x] for x in qqp.all_stats]
    return collections


def collections_index(qqp):
    collections = collections_each(qqp)
    collection_to_i = {
        col: i for i, col in enumerate(sorted(set(collections), key=str))
    }
    return np.array([collection_to_i[x] for x in collections])


def quiz_question_weights(tables_by_type):
    result = train_quiz_question_weights(
        tables_by_type,
        col_to_difficulty=stat_to_difficulty(),
        intl_difficulty=INTERNATIONAL_DIFFICULTY_MULTIPLIER,
        diff_ranges=RANGES,
        compute_geo_target=compute_geo_target,
        compute_stat_target=lambda qqp, _: compute_stat_target(qqp),
        excluded_universes=sorted(
            set(default_universes) | set(universe_by_universe_type()["continent"])
        ),
    )
    _test_question_nonexistence(result["qqp"])
    return result


def _test_question_nonexistence(qqp):
    """
    Check that certain known-bad questions do not exist in the generated quiz questions.
    """
    # Issue #1512
    1/0
    _assert_does_not_exist(
        qqp,
        "Santo Domingo Urban Center, Dominican Republic",
        "Faisalabad Urban Center, Pakistan",
        "days_below_40_4",
    )


def _assert_does_not_exist(qqp, geo_a, geo_b, stat):
    geo_a_i = qqp.all_geographies.index(geo_a)
    geo_b_i = qqp.all_geographies.index(geo_b)
    stat_i = qqp.all_stats.index(stat)
    for i, vqq in enumerate(qqp.questions_by_number, 1):
        mask = (
            (vqq.geography_index_a == geo_a_i)
            & (vqq.geography_index_b == geo_b_i)
            & (vqq.stat_indices == stat_i)
        )
        mask |= (
            (vqq.geography_index_a == geo_b_i)
            & (vqq.geography_index_b == geo_a_i)
            & (vqq.stat_indices == stat_i)
        )
        if mask.any():
            raise RuntimeError(
                f"Question with geos {geo_a} and {geo_b} and stat {stat} found at index {i}"
            )
