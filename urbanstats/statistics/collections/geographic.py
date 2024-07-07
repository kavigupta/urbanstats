import numpy as np

from urbanstats.statistics.statistic_collection import GeographicStatistics


class AreaAndCompactnessStatistics(GeographicStatistics):
    def name_for_each_statistic(self):
        return {
            "area": "Area",
            "compactness": "Compactness",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("main")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("geography")

    def quiz_question_names(self):
        return {}

    def quiz_question_unused(self):
        return ["area", "compactness"]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        assert (
            "area" in statistics_table
        ), "area not in statistics table. I know this should probably be creating it. I'll fix it later."
        statistics_table["perimiter"] = (
            shapefile_table.geometry.to_crs({"proj": "cea"}).length / 1e3
        )
        statistics_table["compactness"] = (
            4 * np.pi * statistics_table.area / statistics_table.perimiter**2
        )
