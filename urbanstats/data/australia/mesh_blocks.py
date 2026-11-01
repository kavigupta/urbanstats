from functools import lru_cache

import geopandas as gpd
import numpy as np

from urbanstats.data.census_blocks import RADII
from urbanstats.geometry.ellipse import compute_density_for_radius

MESH_BLOCKS = "named_region_shapefiles/australia/data/processed/mb_blocks.npz"
# the data repository stores points in int32 microdegrees
LATLON_SCALE = 1_000_000


@lru_cache(None)
def australia_mesh_blocks():
    """One row per populated mesh block, as its representative point."""
    data = np.load(MESH_BLOCKS)
    return gpd.GeoDataFrame(
        {
            "mb_code": data["mb_code"],
            "sa1_code": data["sa1_code"],
            "population": data["population"].astype(np.float64),
            "dwellings": data["dwellings"].astype(np.float64),
        },
        geometry=gpd.points_from_xy(
            data["lon"] / LATLON_SCALE, data["lat"] / LATLON_SCALE
        ),
        crs="EPSG:4326",
    )


@lru_cache(None)
def australia_mesh_blocks_with_densities():
    """Adds, for each radius, the density around each block times its population, which sums."""
    blocks = australia_mesh_blocks().copy()
    coords = np.array([blocks.geometry.y, blocks.geometry.x]).T
    for r in RADII:
        blocks[f"australia_density_2021_{r}"] = (
            compute_density_for_radius(r, blocks.population, coords) * blocks.population
        )
    return blocks
