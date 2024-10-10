import numpy as np
import pandas as pd
from urbanstats.census_2010.cdc import aggregated_cdc_table
from urbanstats.data.accidents import accidents_by_region
from urbanstats.statistics.collections.census_2010 import (
    compute_population,
    population_by_year,
)
from urbanstats.statistics.statistic_collection import USAStatistics


class NHTSAAccidentStatistics(USAStatistics):
    def name_for_each_statistic(self):
        return {
            "traffic_fatalities_last_decade": "Total Traffic Fatalities In Last Decade",
            "traffic_fatalities_last_decade_per_capita": "Traffic Fatalities Per Capita",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("transportation")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("nhtsa_accidents")

    def quiz_question_names(self):
        return {
            "traffic_fatalities_last_decade_per_capita": (
                "higher traffic "
                "fatalities per capita between 2012 and 2021"
                "!TOOLTIP traffic fatalities in the region, divided by the population of the region"
            ),
        }

    def quiz_question_unused(self):
        # do not include the non-per-capita version in the quiz
        return ["traffic_fatalities_last_decade"]

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        acc_raw = accidents_by_region(shapefile)
        pop = population_by_year(shapefile)
        acc_per_cap = {y: acc_raw[y] / compute_population(pop, y) for y in acc_raw}
        last_decade = sorted(acc_raw)[-10:]
        statistics_table["traffic_fatalities_last_decade"] = sum(
            acc_raw[y] for y in last_decade
        )
        statistics_table["traffic_fatalities_last_decade_per_capita"] = sum(
            acc_per_cap[y] for y in last_decade
        ) / len(last_decade)
        statistics_table["traffic_fatalities_by_year"] = pd.DataFrame(acc_raw).apply(
            list, axis=1
        )
        statistics_table["traffic_fatalities_per_capita_by_year"] = pd.DataFrame(
            acc_per_cap
        ).apply(list, axis=1)

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        raise NotImplementedError
