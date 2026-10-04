import numpy as np

from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.statistics.statistic_collection import GeographicStatistics

# most preferred first
SOURCES = ("usa", "canada", "gpw")


class PopulationMedianStatistics(GeographicStatistics):
    version = 2

    def name_for_each_statistic(self):
        return {
            "population_median_lat": "Population Median (Latitude)",
            "population_median_lon": "Population Median (Longitude)",
        }

    def unit_for_each_statistic(self):
        return {
            "population_median_lat": "latitude",
            "population_median_lon": "longitude",
        }

    def varname_for_each_statistic(self):
        return {
            "population_median_lat": "population_median_lat",
            "population_median_lon": "population_median_lon",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("population-median")

    def quiz_question_descriptors(self):
        return QuizQuestionSkip.several(*self.name_for_each_statistic())

    def dependencies(self):
        return [f"{k}_{s}" for k in self.name_for_each_statistic() for s in SOURCES]

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        result = {}
        for k in self.name_for_each_statistic():
            result[k] = np.full(len(shapefile_table), np.nan)
            for s in SOURCES:
                if existing_statistics[f"{k}_{s}"] is None:
                    continue
                source = np.array(existing_statistics[f"{k}_{s}"], dtype=np.float64)
                missing = np.isnan(result[k])
                result[k][missing] = source[missing]
        return result
