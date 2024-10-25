from typing import Union
from attr import dataclass
from census_blocks import RADII
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import (
    ORDER_CATEGORY_MAIN,
    ORDER_CATEGORY_OTHER_DENSITIES,
    CensusStatisticsColection,
)

DENSITY_EXPLANATION_AW = (
    "!TOOLTIP Area-weighted density is the total population divided by the total area."
)

DENSITY_EXPLANATION_PW = (
    "!TOOLTIP Population-weighted density is computed by computing the density"
    " within the given radius for each person in the region and then averaging the results."
    " This is a better measure of the density that people actually experience."
)


def format_radius(x):
    if x < 1:
        return f"{x * 1000:.0f}m"
    else:
        assert x == int(x)
        return f"{x:.0f}km"


ad = {f"ad_{k}": f"PW Density (r={format_radius(k)})" for k in RADII}
density_metrics = [f"ad_{k}" for k in RADII]


@dataclass
class S:
    key: str
    name: str
    category: str
    explanation: str
    quiz_q: Union[str, None] = None


census_basics = [
    S("population", "Population", "main", "population", "higher population"),
    *[
        S(
            k,
            ad[k],
            "main",
            "density",
            "higher population-weighted density (r=1km)" + DENSITY_EXPLANATION_PW
            if k == "ad_1"
            else None,
        )
        for k in density_metrics
    ],
    # no sd quiz q because it's antithetical to the purpose of this site
    S("sd", "AW Density", "main", "density"),
]

census_race = [
    S("white", "White %", "race", "race", "higher % of people who are White"),
    S("hispanic", "Hispanic %", "race",
]

census_stats = census_basics


class CensusBasics(CensusStatisticsColection):
    def name_for_each_statistic(self):
        return {s.key: s.name for s in census_stats}

    def category_for_each_statistic(self):
        return {s.key: s.category for s in census_stats}

    def explanation_page_for_each_statistic(self):
        return {s.key: s.explanation for s in census_stats}

    def quiz_question_names(self):
        return {s.key: s.quiz_q for s in census_stats if s.quiz_q is not None}

    def quiz_question_unused(self):
        return [s.key for s in census_stats if s.quiz_q is None]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        for k in density_metrics:
            statistics_table[k] /= statistics_table["population"]
        statistics_table["sd"] = (
            statistics_table["population"] / statistics_table["area"]
        )

    def extra_stats(self):
        return {
            f"ad_{d}": HistogramSpec(0, 0.1, f"pw_density_histogram_{d}", "population")
            for d in RADII
        }

# from urbanstats.statistics.statistic_collection import CensusStatisticsColection


# class RaceCensus(CensusStatisticsColection):
#     def name_for_each_statistic(self):
#         return {
#             "white": "White %",
#             "hispanic": "Hispanic %",
#             "black": "Black %",
#             "asian": "Asian %",
#             "native": "Native %",
#             "hawaiian_pi": "Hawaiian / PI %",
#             "other / mixed": "Other / Mixed %",
#         }

#     def category_for_each_statistic(self):
#         return self.same_for_each_name("race")

#     def explanation_page_for_each_statistic(self):
#         return self.same_for_each_name("race")

#     def quiz_question_names(self):
#         return {
#             "white": "higher % of people who are White",
#             "hispanic": "higher % of people who are Hispanic",
#             "black": "higher % of people who are Black",
#             "asian": "higher % of people who are Asian",
#         }

#     def quiz_question_unused(self):
#         return [
#             "native",
#             "hawaiian_pi",
#             "other / mixed",
#         ]

#     def mutate_statistic_table(self, statistics_table, shapefile_table):
#         statistics_table["other / mixed"] = (
#             statistics_table["other"] + statistics_table["mixed"]
#         )
#         for k in self.name_for_each_statistic():
#             statistics_table[k] /= statistics_table["population"]

#         del statistics_table["other"]
#         del statistics_table["mixed"]
