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

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        statistics_table["other / mixed"] = (
            statistics_table["other"] + statistics_table["mixed"]
        )
        for k in self.name_for_each_statistic():
            statistics_table[k] /= statistics_table["population"]

        del statistics_table["other"]
        del statistics_table["mixed"]
