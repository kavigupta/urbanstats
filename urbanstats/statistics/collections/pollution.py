from urbanstats.data.aggregate_gridded_data import disaggregate_gridded_data
from urbanstats.games.quiz_question_metadata import (
    POLLUTION,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.statistic_collection import GeographicStatistics
from urbanstats.data.pollution import pollution_gds

POPULATION_WEIGHTED_EXPLANATION = (
    "Population weighted pollution"
    " statistics are calculated by computing the statistic for"
    " each person in the region and then averaging the results."
)


class PollutionStatistics(GeographicStatistics):
    version = 1

    def name_for_each_statistic(self):
        return {
            "pm_25_2018_2022": "PW Mean PM2.5 Pollution",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("pollution")

    def quiz_question_descriptors(self):
        return {
            "pm_25_2018_2022": QuizQuestionDescriptor(
                "higher population-weighted PM2.5 pollution !TOOLTIP "
                + POPULATION_WEIGHTED_EXPLANATION,
                POLLUTION,
            ),
        }

    def dependencies(self):
        return []

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        return disaggregate_gridded_data(
            gridded_data_sources=pollution_gds,
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )
