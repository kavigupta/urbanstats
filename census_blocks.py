from functools import lru_cache
import os
import subprocess
import numpy as np

import pandas as pd
import geopandas as gpd

from geometry import locate_blocks

RADII = (0.25, 0.5, 1, 2, 4)


@lru_cache(None)
def load_raw_census():
    census_blocks = "outputs/census_blocks/raw_census.csv"

    if not os.path.exists(census_blocks):
        subprocess.run(
            [
                "census-downloader",
                "--output",
                census_blocks,
                "--columns",
                "INTPTLAT",
                "INTPTLON",
                "POP100",
                "SUMLEV",
                "GEOID",
                "--filter-level",
                "750",
            ]
        )
    raw_census = pd.read_csv(census_blocks)
    raw_census = raw_census[raw_census.POP100 != 0].copy()
    population = np.array(raw_census[["POP100"]])
    coordinates = np.array([raw_census.INTPTLAT, raw_census.INTPTLON]).T
    return population, coordinates


def density_in_radius(radius):
    population, coordinates = load_raw_census()
    return locate_blocks(
        coordinates=coordinates, population=population, radius=radius
    ) / (np.pi * radius**2)


def all_densities():
    return {radius: density_in_radius(radius)[:, 0] for radius in RADII}


@lru_cache(None)
def all_densities_gpd():
    population, coordinates = load_raw_census()
    densities = all_densities()
    density_metrics = {f"ad_{k}": densities[k] * population[:, 0] for k in densities}
    population, coordinates = load_raw_census()
    return gpd.GeoDataFrame(
        dict(**density_metrics, population=population[:, 0]),
        index=np.arange(len(population)),
        geometry=gpd.points_from_xy(coordinates[:, 1], coordinates[:, 0]),
        crs="EPSG:4326",
    )
