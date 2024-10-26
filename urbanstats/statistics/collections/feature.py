import pandas as pd
from permacache import permacache
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.features.extract_data import feature_data
from urbanstats.features.feature import feature_columns
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.osm.parks import park_overlap_percentages_all
from urbanstats.statistics.statistic_collection import (
    USFeatureDistanceStatisticsCollection,
)


class USFeatureDistanceStatistics(USFeatureDistanceStatisticsCollection):
    version = 2

    def name_for_each_statistic(self):
        return {
            "park_percent_1km_v2": "PW Mean % of parkland within 1km",
            **feature_columns,
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

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        feats = features_by_region(shapefile)
        for feat in feature_columns:
            statistics_table[feat] = feats[feat]

        statistics_table["park_percent_1km_v2"] = feats["park_percent_1km_v2"]

        self.mutate_statistic_table(statistics_table, shapefile_table)

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        for feat in feature_columns:
            statistics_table[feat] = (
                statistics_table[feat] / statistics_table["population"]
            )

        statistics_table["park_percent_1km_v2"] /= statistics_table["population"]


@permacache(
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
