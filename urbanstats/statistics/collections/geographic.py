import numpy as np

from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.statistics.statistic_collection import GeographicStatistics


class AreaAndCompactnessStatistics(GeographicStatistics):
    version = 2

    def name_for_each_statistic(self):
        return {
            "area": "Area",
            "compactness": "Compactness",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("geography")

    def quiz_question_descriptors(self):
        return QuizQuestionSkip.several("area", "compactness")

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        statistics_table = {}

        statistics_table["area"] = (
            shapefile_table.geometry.to_crs({"proj": "cea"}).area / 1e6
        )
        statistics_table["perimiter"] = (
            shapefile_table.geometry.to_crs({"proj": "cea"}).length / 1e3
        )
        statistics_table["compactness"] = (
            4 * np.pi * statistics_table["area"] / statistics_table["perimiter"] ** 2
        )
        return statistics_table
