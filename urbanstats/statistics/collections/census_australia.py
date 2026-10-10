from permacache import permacache

from urbanstats.data.australia.mesh_blocks import australia_mesh_blocks_with_densities
from urbanstats.data.census_histogram import census_histogram_australia
from urbanstats.geometry.census_aggregation import (
    Crosswalk,
    aggregate_by_mesh_block_australia,
)
from urbanstats.statistics.collections.census_basics import CensusBasicsMixin
from urbanstats.statistics.statistic_collection import AustraliaStatistics


class CensusAustralia(CensusBasicsMixin, AustraliaStatistics):
    version = 1

    suffix = "australia"
    source_name = "AuBS"
    explanation_page = "australian-census"
    census_years = (2021,)
    varname_year_suffix = {2021: ""}

    def census_stats(self, year, shapefile):
        return compute_census_stats(shapefile)

    def census_histograms(self, year, shapefile):
        return census_histogram_australia(shapefile)

    def census_median_point(self, shapefile):
        return compute_census_median_point(shapefile)

    def compute_statistics_dictionary_australia(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        return self.compute_census_basics(
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )


@permacache(
    "urbanstats/statistics/collections/census_australia/compute_census_stats",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_census_stats(shapefile):
    blocks = australia_mesh_blocks_with_densities()
    return aggregate_by_mesh_block_australia(
        shapefile,
        blocks[
            [k for k in blocks if k.startswith("australia_density")] + ["population"]
        ],
    )


@permacache(
    "urbanstats/statistics/collections/census_australia/compute_census_median_point",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_census_median_point(shapefile):
    blocks = australia_mesh_blocks_with_densities()
    return Crosswalk.compute_australia(shapefile).compute_geometric_median_dataframe(
        shapefile, blocks.population, blocks.geometry.y, blocks.geometry.x
    )
