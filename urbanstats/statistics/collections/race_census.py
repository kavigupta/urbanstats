from urbanstats.statistics.statistic_collection import CensusStatisticsColection


class RaceCensus(CensusStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "white": "White %",
            "hispanic": "Hispanic %",
            "black": "Black %",
            "asian": "Asian %",
            "native": "Native %",
            "hawaiian_pi": "Hawaiian / PI %",
            "other / mixed": "Other / Mixed %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("race")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("race")

    def quiz_question_names(self):
        return {
            "white": "higher % of people who are White",
            "hispanic": "higher % of people who are Hispanic",
            "black": "higher % of people who are Black",
            "asian": "higher % of people who are Asian",
        }

    def quiz_question_unused(self):
        return [
            "native",
            "hawaiian_pi",
            "other / mixed",
        ]

    def mutate_shapefile_table(self, shapefile_table):
        for k in self.name_for_each_statistic():
            shapefile_table[k] /= shapefile_table["population"]
        shapefile_table["other / mixed"] = shapefile_table["other"] + shapefile_table["mixed"]
