from urbanstats.statistics.statistic_collection import USDAFRAStatisticsCollection


class USDAFRAStatistics(USDAFRAStatisticsCollection):
    version = 3
    tooltip = "!TOOLTIP The USDA defines a grocery store as a 'supermarket, supercenter, or large grocery store.'"

    def name_for_each_statistic(self):
        return {
            "lapophalfshare_usda_fra_1": "Within 0.5mi of a grocery store %",
            "lapop1share_usda_fra_1": "Within 1mi of a grocery store %",
            "lapop10share_usda_fra_1": "Within 10mi of a grocery store %",
            "lapop20share_usda_fra_1": "Within 20mi of a grocery store %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("feature")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("usda_fra")

    def quiz_question_names(self):
        return {
            "lapophalfshare_usda_fra_1": "!FULL Which has more access to grocery stores (higher % of people within 0.5mi of a grocery store)?"
            + self.tooltip,
            "lapop1share_usda_fra_1": "!FULL Which has more access to grocery stores (higher % of people within 1mi of a grocery store)?",
        }

    def quiz_question_unused(self):
        return [
            # too low variance (almost all are 100%)
            "lapop10share_usda_fra_1",
            "lapop20share_usda_fra_1",
        ]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        for cdc in self.name_for_each_statistic():
            statistics_table[cdc] /= statistics_table["population_2010"]
            # not having access to grocery stores -> having access to grocery stores
            statistics_table[cdc] = 1 - statistics_table[cdc]
