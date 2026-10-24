from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.australia.mesh_blocks import australia_mesh_blocks_with_densities
from urbanstats.geometry.census_aggregation import (
    Crosswalk,
    aggregate_by_mesh_block_australia,
)


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_australia/compute_census_stats_2",
)
def compute_census_stats(geometry):
    blocks = australia_mesh_blocks_with_densities()
    return aggregate_by_mesh_block_australia(
        geometry,
        blocks[
            [k for k in blocks if k.startswith("australia_density")] + ["population"]
        ],
    )


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_australia/compute_census_median_point_2",
)
def compute_census_median_point(geometry):
    blocks = australia_mesh_blocks_with_densities()
    return Crosswalk.compute_australia(geometry).compute_geometric_median_dataframe(
        geometry, blocks.population, blocks.geometry.y, blocks.geometry.x
    )
