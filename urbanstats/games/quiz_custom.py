from functools import lru_cache

import numpy as np

from urbanstats.games.quiz_columns import get_quiz_stats, stat_to_quiz_name
from urbanstats.statistics.output_statistics_metadata import (
    all_legacy_statistic_names,
    statistic_internal_to_display_name,
)
from urbanstats.website_data.table import shapefile_without_ordinals


@lru_cache(maxsize=None)
def shapefile():
    return shapefile_without_ordinals().set_index("longname")


def backmap_stat_column_name():
    results = {v: k for k, v in statistic_internal_to_display_name().items()}
    legacy = all_legacy_statistic_names()
    for k, v in legacy.items():
        results[k] = results[v]
    return results


def custom_quiz_question(stat_column_name, longname_a, longname_b):
    t = shapefile()
    stat_column_internal = backmap_stat_column_name()[stat_column_name]
    stat_column_question = stat_to_quiz_name()[stat_column_internal]
    stat_column_internal_original = stat_column_internal
    return dict(
        stat_column_original=stat_column_internal_original,
        question=stat_column_question,
        longname_a=longname_a,
        longname_b=longname_b,
        stat_a=extract(t.loc[longname_a], stat_column_internal),
        stat_b=extract(t.loc[longname_b], stat_column_internal),
    )


def extract(row, column):
    deprecated_columns = ["transportation_means_car"]
    if column in deprecated_columns:
        return float(row[column])
    [cols] = [z for x, _, z in get_quiz_stats() if x == column]
    vals = [row[col] for col in cols]
    # get the one non-nan value
    [val] = [v for v in vals if not np.isnan(v)]
    return float(val)


@lru_cache(maxsize=None)
def get_custom_quizzes():
    return {
        # april fool's day 2024
        212: [
            custom_quiz_question("Mean high temp", "Alaska, USA", "Puerto Rico, USA"),
            custom_quiz_question("Population", "China", "China city, Texas, USA"),
            custom_quiz_question(
                "PW Density (r=1km)",
                "New York County, New York, USA",
                "Inyo County, California, USA",
            ),
            custom_quiz_question(
                "1BR Rent > $1500 %",
                "San Francisco city, California, USA",
                "West Virginia, USA",
            ),
            custom_quiz_question(
                "Arts, entertainment, and recreation %",
                "Carbon County, Pennsylvania, USA",
                "Clark County, Nevada, USA",
            ),
        ],
        # april fool's day 2025
        577: [
            custom_quiz_question(
                "PW Density (r=4km)",
                "London Urban Center, United Kingdom",
                "London Urban Center, Canada",
            ),
            custom_quiz_question(
                "Snowfall [rain-equivalent]",
                "Nevada County, California, USA",
                "Nevada, USA",
            ),
            custom_quiz_question(
                "PW Mean PM2.5 Pollution",
                "New York Urban Center, USA",
                "York Urban Center, United Kingdom",
            ),
            custom_quiz_question(
                "Cohabiting With Partner (Gay) %",
                "Portland [Urban Area], OR-WA, USA",
                "Portland [Urban Area], ME, USA",
            ),
            custom_quiz_question(
                "PW Mean Elevation",
                "Georgia",
                "Georgia, USA",
            ),
        ],
        # 666
        666: [
            custom_quiz_question(
                "PW Mean Elevation",
                "Destruction Bay Settlement, Yukon Territory, Yukon, Canada",
                "Red Devil CDP, Alaska, USA",
            ),
            custom_quiz_question(
                "Mean high heat index",
                "Deville CDP, Louisiana, USA",
                "Death Valley Unified School District, California, USA",
            ),
            custom_quiz_question(
                "PW Mean PM2.5 Pollution",
                "Devils Lake city, North Dakota, USA",
                "Florida, USA",
            ),
            custom_quiz_question(
                "Agriculture, forestry, fishing and hunting %",
                "Horn Lake city, Mississippi, USA",
                "Kill Devil Hills MSA, NC, USA",
            ),
            custom_quiz_question(
                "Commute Car %",
                "Hellertown borough, Pennsylvania, USA",
                "66616, USA",
            ),
        ],
    }
