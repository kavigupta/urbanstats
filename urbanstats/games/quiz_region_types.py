from functools import lru_cache

import numpy as np

from urbanstats.geometry.shapefiles.shapefiles_list import (
    shapefiles,
    unlocalization_map,
)

quiz_weights = {}

QUIZ_REGION_TYPES_USA = [
    "City",
    "County",
    "MSA",
    "State",
    "Urban Area",
    "Congressional District",
    "Media Market",
    "Judicial Circuit",
]

QUIZ_REGION_TYPES_CANADA = [
    "Province",
    "CA Census Division",
    "CA Population Center",
    "CA CMA",
]
for region_type in QUIZ_REGION_TYPES_CANADA:
    # really need to downweight these so they don't show up as often
    quiz_weights[region_type] = 0.1

QUIZ_REGION_TYPES_INTERNATIONAL = [
    "Country",
    "Subnational Region",
    "Urban Center",
]

QUIZ_REGION_TYPES_ALL = [
    *QUIZ_REGION_TYPES_USA,
    *QUIZ_REGION_TYPES_CANADA,
    *QUIZ_REGION_TYPES_INTERNATIONAL,
]


@lru_cache(maxsize=1)
def _weights_array():
    weights = np.array(
        [quiz_weights.get(region_type, 1) for region_type in QUIZ_REGION_TYPES_ALL]
    )
    return weights / weights.sum()


def sample_quiz_type(rng):
    return rng.choice(QUIZ_REGION_TYPES_ALL, p=_weights_array())


def validate():
    types = {x.meta["type"] for x in shapefiles.values()} | set(unlocalization_map)
    print(unlocalization_map)
    unrecognized = set(QUIZ_REGION_TYPES_ALL) - types
    if unrecognized:
        raise ValueError(f"Unrecognized region types: {unrecognized}")


validate()
