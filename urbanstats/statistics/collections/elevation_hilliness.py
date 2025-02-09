from urbanstats.data.aggregate_gridded_data import disaggregate_gridded_data
from urbanstats.data.elevation import elevation_gds
from urbanstats.games.quiz_question_metadata import (
    ELEVATION,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import GeographicStatistics

POPULATION_WEIGHTED_EXPLANATION = (
    "Population weighted elevation/hilliness"
    " statistics are calculated by computing the statistic for"
    " each person in the region and then averaging the results."
)


class ElevationHillinessStatistics(GeographicStatistics):
    version = 9

    def name_for_each_statistic(self):
        return {
            "gridded_hilliness": "PW Mean Hilliness (Grade)",
            "gridded_elevation": "PW Mean Elevation",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("elevation_hilliness")

    def quiz_question_descriptors(self):
        return {
            "gridded_elevation": QuizQuestionDescriptor(
                "higher population-weighted mean elevation !TOOLTIP "
                + POPULATION_WEIGHTED_EXPLANATION,
                ELEVATION,
            ),
            "gridded_hilliness": QuizQuestionSkip(),
        }

    def dependencies(self):
        return []

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        return disaggregate_gridded_data(
            gridded_data_sources=elevation_gds,
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )
