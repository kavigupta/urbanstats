from functools import lru_cache

from urbanstats.website_data.table import shapefile_without_ordinals
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)

from .quiz import stats_to_display


@lru_cache(maxsize=None)
def shapefile():
    return shapefile_without_ordinals().set_index("longname")


def custom_quiz_question(stat_column_name, longname_a, longname_b):
    t = shapefile()
    stat_column_internal = {
        v: k for k, v in statistic_internal_to_display_name().items()
    }[stat_column_name]
    stat_column_question = stats_to_display[stat_column_internal]
    stat_column_internal_original = stat_column_internal
    if stat_column_internal == "population":
        stat_column_internal = "best_population_estimate"
    return dict(
        stat_column_original=stat_column_internal_original,
        question=stat_column_question,
        longname_a=longname_a,
        longname_b=longname_b,
        stat_a=t.loc[longname_a, stat_column_internal],
        stat_b=t.loc[longname_b, stat_column_internal],
    )


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
        ]
    }
