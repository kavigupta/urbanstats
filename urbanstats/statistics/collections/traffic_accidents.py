import numpy as np

from urbanstats.data.accidents import accidents_by_region
from urbanstats.games.quiz_question_metadata import (
    TRAFFIC_ACCIDENTS,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census import (
    compute_population,
    population_by_year,
)
from urbanstats.statistics.statistic_collection import USAStatistics


class NHTSAAccidentStatistics(USAStatistics):
    version = 5

    def name_for_each_statistic(self):
        return {
            "traffic_fatalities_last_decade_per_capita": "Traffic Fatalities Per Capita Per Year",
            "traffic_fatalities_ped_last_decade_per_capita": "Pedestrian/Cyclist Fatalities Per Capita Per Year",
            "traffic_fatalities_last_decade": "Total Traffic Fatalities In Last Decade",
            "traffic_fatalities_ped_last_decade": "Total Pedestrian/Cyclist Fatalities In Last Decade",
        }

    def varname_for_each_statistic(self):
        return {
            "traffic_fatalities_last_decade_per_capita": "traffic_fatalities_per_capita",
            "traffic_fatalities_ped_last_decade_per_capita": "ped_cyclist_fatalities_per_capita",
            "traffic_fatalities_last_decade": "traffic_fatalities",
            "traffic_fatalities_ped_last_decade": "traffic_ped_cyclist_fatalities",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("nhtsa_accidents")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                TRAFFIC_ACCIDENTS,
                {
                    "traffic_fatalities_last_decade_per_capita": (
                        "higher traffic "
                        "fatalities per capita between 2013 and 2022"
                        "!TOOLTIP traffic fatalities in the region, divided by the population of the region"
                    ),
                    "traffic_fatalities_ped_last_decade_per_capita": (
                        "higher pedestrian/cyclist "
                        "fatalities per capita between 2013 and 2022"
                        "!TOOLTIP pedestrian and cyclist fatalities in the region, divided by the population of the region"
                    ),
                },
            ),
            **QuizQuestionSkip.several(
                "traffic_fatalities_last_decade", "traffic_fatalities_ped_last_decade"
            ),
        }

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        acc_raw_all = accidents_by_region(shapefile)
        pop = population_by_year(shapefile, no_pr=True)
        acc_per_cap_all = {
            y: {
                k: for_year_and_key / compute_population(pop, y)
                for k, for_year_and_key in for_year.items()
            }
            for y, for_year in acc_raw_all.items()
        }
        last_decade = sorted(acc_raw_all)[-10:]
        statistics_table = {}
        for prefix, key in [
            ("traffic_fatalities", "fatals"),
            ("traffic_fatalities_ped", "fatals_pedestrian_plus"),
        ]:
            acc_raw = {y: acc[key] for y, acc in acc_raw_all.items()}
            acc_per_cap = {y: acc[key] for y, acc in acc_per_cap_all.items()}
            res = np.array(sum(acc_raw[y] for y in last_decade))
            statistics_table[f"{prefix}_last_decade"] = res
            statistics_table[f"{prefix}_last_decade_per_capita"] = np.array(
                sum(acc_per_cap[y] for y in last_decade) / len(last_decade)
            )
        return statistics_table

    def extra_stats(self):
        return {}
