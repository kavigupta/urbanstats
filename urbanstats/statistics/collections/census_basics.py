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


class CensusBasics(CensusStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "population": "Population",
            **ad,
            "sd": "AW Density",
        }

    def year(self):
        return 2020

    def category_for_each_statistic(self):
        from urbanstats.statistics.collections.census_2010 import Census2020

        return Census2020.category_for_each_statistic(self)

    def explanation_page_for_each_statistic(self):
        from urbanstats.statistics.collections.census_2010 import Census2020

        return Census2020.explanation_page_for_each_statistic(self)

    def quiz_question_names(self):
        return {
            "population": "higher population",
            "ad_1": "higher population-weighted density (r=1km)"
            + DENSITY_EXPLANATION_PW,
        }

    def quiz_question_unused(self):
        return [
            # no sd because it's antithetical to the purpose of this site
            "sd",
            # duplicate
            "ad_0.25",
            "ad_0.5",
            "ad_2",
            "ad_4",
        ]

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
