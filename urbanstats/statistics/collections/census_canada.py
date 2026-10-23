from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.canada.canada_density import canada_shapefile_with_densities
from urbanstats.geometry.census_aggregation import (
    Crosswalk,
    aggregate_by_census_block_canada,
)


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_canada/compute_census_stats_2",
)
def compute_census_stats(year, geometry):
    dens = canada_shapefile_with_densities(year)
    return aggregate_by_census_block_canada(
        year,
        geometry,
        dens[[k for k in dens if k.startswith("canada_density")] + ["population"]],
    )


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_canada/compute_census_median_point_2",
)
def compute_census_median_point(year, geometry):
    dens = canada_shapefile_with_densities(year)
    return Crosswalk.compute_canada(year, geometry).compute_geometric_median_dataframe(
        geometry, dens.population, dens.geometry.y, dens.geometry.x
    )
