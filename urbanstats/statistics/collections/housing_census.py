from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import CensusStatisticsColection
from urbanstats.statistics.utils import fractionalize


class HousingCensus(CensusStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "housing_per_pop": "Housing Units per Adult",
            "vacancy": "Vacancy %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("housing")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-census")

    def quiz_question_names(self):
        return {
            "housing_per_pop": "higher number of housing units per adult",
            "vacancy": "higher % of units that are vacant",
        }

    def quiz_question_unused(self):
        return []

    def mutate_shapefile_table(self, shapefile_table):
        result = shapefile_table
        result["housing_per_pop"] = result["total"] / result["population_18"]
        result["vacancy"] = result["vacant"] / result["total"]
