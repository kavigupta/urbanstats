from urbanstats.statistics.statistic_collection import (
    ORDER_CATEGORY_MAIN,
    ORDER_CATEGORY_OTHER_DENSITIES,
    CensusStatisticsColection,
)
from .race_census import RaceCensus

from .census_basics import ad, CensusBasics


class Census2010(CensusStatisticsColection):

    def name_for_each_statistic(self):

        ad_2010 = {f"{k}_2010": f"{v} (2010)" for k, v in ad.items()}
        ad_change = {
            f"{k}_change_2010": f"{v} Change (2010-2020)" for k, v in ad.items()
        }

        return {
            "population_2010": "Population (2010)",
            "population_change_2010": "Population Change (2010-2020)",
            **{"ad_1_2010": ad_2010["ad_1_2010"]},
            **{"ad_1_change_2010": ad_change["ad_1_change_2010"]},
            "sd_2010": "AW Density (2010)",
            **{
                f"{k}_2010": f"{v} (2010)"
                for k, v in RaceCensus().name_for_each_statistic().items()
            },
            "housing_per_pop_2010": "Housing Units per Adult (2010)",
            "vacancy_2010": "Vacancy % (2010)",
            **{k: ad_2010[k] for k in ad_2010 if k != "ad_1_2010"},
            **{k: ad_change[k] for k in ad_change if k != "ad_1_change_2010"},
        }

    def order_category_for_each_statistic(self):
        return CensusBasics.order_category_for_each_statistic(self)

    def category_for_each_statistic(self):
        return self.same_for_each_name("2010")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("2010")

    def quiz_question_names(self):
        return {
            "population_change_2010": "higher % change in population from 2010 to 2020",
            "ad_1_change_2010": "higher % change in population-weighted density (r=1km) from 2010 to 2020",
        }

    def quiz_question_unused(self):
        return [
            "ad_0.5_change_2010",
            "ad_4_change_2010",
            "ad_0.25_change_2010",
            "ad_2_change_2010",
            # direct 2010 statistics_tables
            "population_2010",
            "sd_2010",
            "ad_0.25_2010",
            "ad_0.5_2010",
            "ad_1_2010",
            "ad_2_2010",
            "ad_4_2010",
            "housing_per_pop_2010",
            "asian_2010",
            "other / mixed_2010",
            "native_2010",
            "white_2010",
            "vacancy_2010",
            "hispanic_2010",
            "black_2010",
            "hawaiian_pi_2010",
        ]

    def mutate_statistic_table(self, statistics_table, shapefile_table):

        from census_blocks import racial_demographics
        from stats_for_shapefile import density_metrics

        statistics_table["population_change_2010"] = (
            statistics_table["population"] - statistics_table["population_2010"]
        ) / statistics_table["population_2010"]
        for k in density_metrics:
            statistics_table[f"{k}_2010"] /= statistics_table["population_2010"]
            statistics_table[f"{k}_change_2010"] = (
                statistics_table[k] - statistics_table[f"{k}_2010"]
            ) / statistics_table[f"{k}_2010"]
        statistics_table["sd_2010"] = (
            statistics_table["population_2010"] / statistics_table["area"]
        )
        for k in racial_demographics:
            statistics_table[k + "_2010"] /= statistics_table["population_2010"]
        statistics_table["other / mixed_2010"] = (
            statistics_table["other_2010"] + statistics_table["mixed_2010"]
        )
        del statistics_table["other_2010"]
        del statistics_table["mixed_2010"]
        statistics_table["housing_per_pop_2010"] = (
            statistics_table["total_2010"] / statistics_table["population_18_2010"]
        )
        statistics_table["vacancy_2010"] = (
            statistics_table["vacant_2010"] / statistics_table["total_2010"]
        )

        del statistics_table["vacant_2010"]
        del statistics_table["total_2010"]
        del statistics_table["occupied_2010"]
