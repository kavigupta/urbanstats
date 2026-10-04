from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.canada.canada_density import canada_shapefile_with_densities
from urbanstats.data.census_histogram import census_histogram_canada
from urbanstats.geometry.census_aggregation import (
    Crosswalk,
    aggregate_by_census_block_canada,
)
from urbanstats.statistics.collections.census_basics import CensusBasicsMixin
from urbanstats.statistics.statistic_collection import CanadaStatistics


class CensusCanada(CensusBasicsMixin, CanadaStatistics):
    version = 10

    suffix = "canada"
    source_name = "StatCan"
    explanation_page = "canadian-census"
    census_years = (2021, 2011)
    # for compatibility
    varname_year_suffix = {2021: "", 2011: "_2010"}

    def census_stats(self, year, shapefile):
        return compute_census_stats(year, shapefile)

    def census_histograms(self, year, shapefile):
        return census_histogram_canada(shapefile, year)

    def census_median_point(self, shapefile):
        return compute_census_median_point(2021, shapefile)

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        return self.compute_census_basics(
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_canada/compute_census_stats_2",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_census_stats(year, shapefile):
    dens = canada_shapefile_with_densities(year)
    return aggregate_by_census_block_canada(
        year,
        shapefile,
        dens[[k for k in dens if k.startswith("canada_density")] + ["population"]],
    )


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_canada/compute_census_median_point_2",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_census_median_point(year, shapefile):
    dens = canada_shapefile_with_densities(year)
    return Crosswalk.compute_canada(year, shapefile).compute_geometric_median_dataframe(
        shapefile, dens.population, dens.geometry.y, dens.geometry.x
    )
