import pandas as pd

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.features.extract_data import feature_data
from urbanstats.features.feature import feature_columns
from urbanstats.games.quiz_question_metadata import (
    FEATURE_DIST,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.osm.parks import park_overlap_percentages_all
from urbanstats.statistics.statistic_collection import USAStatistics


class USFeatureDistanceStatistics(USAStatistics):
    version = 2

    def name_for_each_statistic(self):
        return {
            "park_percent_1km_v2": "PW Mean % of parkland within 1km",
            **feature_columns,
        }

    def varname_for_each_statistic(self):
        return {
            "park_percent_1km_v2": "park_1km",
            "within_Hospital_10": "hospital_within_10km",
            "mean_dist_Hospital_updated": "hospital_mean_dist",
            "within_Public School_2": "school_within_2km",
            "mean_dist_Public School_updated": "school_mean_dist",
            "within_Airport_30": "airport_within_30km",
            "mean_dist_Airport_updated": "airport_mean_dist",
            "within_Active Superfund Site_10": "superfund_within_10km",
            "mean_dist_Active Superfund Site_updated": "superfund_mean_dist",
        }

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

    def quiz_question_descriptors(self):
        # pylint: disable=line-too-long
        return {
            **QuizQuestionDescriptor.several(
                FEATURE_DIST,
                {
                    "park_percent_1km_v2": "!FULL Which has more access to parks (higher % of area within 1km of a park, population weighted)?",
                    "mean_dist_Hospital_updated": "!FULL Which has less access to hospitals (higher population-weighted mean distance)?",
                    "mean_dist_Active Superfund Site_updated": "!FULL Which has less exposure to active EPA superfund sites (higher population-weighted mean distance)?"
                    "!TOOLTIP EPA superfund sites are hazardous waste sites identified by the Environmental Protection Agency.",
                    "mean_dist_Airport_updated": "!FULL Which has less access to airports (higher population-weighted mean distance)?",
                    "mean_dist_Public School_updated": "!FULL Which has less access to public schools (higher population-weighted mean distance)?",
                },
            ),
            **QuizQuestionSkip.several(
                "within_Active Superfund Site_10",
                "within_Airport_30",
                "within_Public School_2",
                "within_Hospital_10",
            ),
        }

    def dependencies(self):
        return ["population"]

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        statistics_table = {}
        feats = features_by_region(shapefile)
        for feat in feature_columns:
            statistics_table[feat] = feats[feat]

        statistics_table["park_percent_1km_v2"] = feats["park_percent_1km_v2"]

        for feat in feature_columns:
            statistics_table[feat] = (
                statistics_table[feat] / existing_statistics["population"]
            )

        statistics_table["park_percent_1km_v2"] /= existing_statistics["population"]

        return statistics_table


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/feature/features_by_region",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def features_by_region(shapefile):
    feats = feature_data()
    blocks_gdf = all_densities_gpd()
    return aggregate_by_census_block(
        2020,
        shapefile,
        pd.DataFrame(
            {
                **feats,
                "park_percent_1km_v2": park_overlap_percentages_all(r=1)
                * blocks_gdf.population,
            }
        ),
    )
