from urbanstats.census_2010.usda_food_research_atlas import aggregated_usda_fra
from urbanstats.games.quiz_question_metadata import (
    FEATURE_DIST,
    WEATHER,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import USAStatistics


class USDAFRAStatistics(USAStatistics):
    version = 4
    tooltip = "!TOOLTIP The USDA defines a grocery store as a 'supermarket, supercenter, or large grocery store.'"

    def name_for_each_statistic(self):
        return {
            "lapophalfshare_usda_fra_1": "Within 0.5mi of a grocery store %",
            "lapop1share_usda_fra_1": "Within 1mi of a grocery store %",
            "lapop10share_usda_fra_1": "Within 10mi of a grocery store %",
            "lapop20share_usda_fra_1": "Within 20mi of a grocery store %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("usda_fra")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                FEATURE_DIST,
                {
                    "lapop1share_usda_fra_1": "!FULL Which has more access to grocery stores (higher % of people within 1mi of a grocery store)?"
                    + self.tooltip,
                },
            ),
            **QuizQuestionSkip.several(
                # duplicate
                "lapophalfshare_usda_fra_1",
                # too low variance (almost all are 100%)
                "lapop10share_usda_fra_1",
                "lapop20share_usda_fra_1",
            ),
        }

    def dependencies(self):
        return ["population_2010"]

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        statistics_table = {}

        t = aggregated_usda_fra(shapefile)
        for column in t.columns:
            statistics_table[column] = t[column]

        for cdc in self.name_for_each_statistic():
            statistics_table[cdc] /= existing_statistics["population_2010"]
            # not having access to grocery stores -> having access to grocery stores
            statistics_table[cdc] = 1 - statistics_table[cdc]

        return statistics_table
