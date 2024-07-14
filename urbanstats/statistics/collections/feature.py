from urbanstats.features.feature import feature_columns
from urbanstats.statistics.statistic_collection import (
    USFeatureDistanceStatisticsCollection,
)


class USFeatureDistanceStatistics(USFeatureDistanceStatisticsCollection):
    def name_for_each_statistic(self):
        return {
            "park_percent_1km_v2": "PW Mean % of parkland within 1km",
            **feature_columns,
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("feature")

    def explanation_page_for_each_statistic(self):
        return {
            "park_percent_1km_v2": "park",
            "within_Hospital_10": "hospital",
            "mean_dist_Hospital_updated": "hospital",
            "within_Public School_2": "school",
            "mean_dist_Public School_updated": "school",
            "within_Airport_30": "airport",
            "mean_dist_Airport_updated": "airport",
            "within_Active Superfund Site_10": "superfund",
            "mean_dist_Active Superfund Site_updated": "superfund",
        }

    def quiz_question_names(self):
        return {
            "park_percent_1km_v2": "!FULL Which has more access to parks (higher % of area within 1km of a park, population weighted)?",
            "mean_dist_Hospital_updated": "!FULL Which has less access to hospitals (higher population-weighted mean distance)?",
            "mean_dist_Active Superfund Site_updated": "!FULL Which has less exposure to active EPA superfund sites (higher population-weighted mean distance)?"
            "!TOOLTIP EPA superfund sites are hazardous waste sites identified by the Environmental Protection Agency.",
            "mean_dist_Airport_updated": "!FULL Which has less access to airports (higher population-weighted mean distance)?",
            "mean_dist_Public School_updated": "!FULL Which has less access to public schools (higher population-weighted mean distance)?",
        }

    def quiz_question_unused(self):
        return [
            # duplicates
            "within_Active Superfund Site_10",
            "within_Airport_30",
            "within_Public School_2",
            "within_Hospital_10",
        ]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        for feat in feature_columns:
            statistics_table[feat] = (
                statistics_table[feat] / statistics_table["population"]
            )

        statistics_table["park_percent_1km_v2"] /= statistics_table["population"]
