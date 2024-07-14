from census_blocks import RADII
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

    def order_category_for_each_statistic(self):
        return {
            k: (
                ORDER_CATEGORY_OTHER_DENSITIES
                if k.startswith("ad_") and not k.startswith("ad_1")
                else ORDER_CATEGORY_MAIN
            )
            for k in self.name_for_each_statistic()
        }

    def category_for_each_statistic(self):
        return {
            k: "main" if v == ORDER_CATEGORY_MAIN else "other_densities"
            for k, v in self.order_category_for_each_statistic().items()
        }

    def explanation_page_for_each_statistic(self):
        return {
            k: "population" if k == "population" else "density"
            for k in self.name_for_each_statistic()
        }

    def quiz_question_names(self):
        return {
            "population": "higher population",
            "ad_1": "higher population-weighted density (r=1km)"
            + DENSITY_EXPLANATION_PW,
            "sd": "higher area-weighted density" + DENSITY_EXPLANATION_AW,
        }

    def quiz_question_unused(self):
        return [
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
