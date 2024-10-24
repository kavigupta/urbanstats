import os
import subprocess
from functools import lru_cache

import geopandas as gpd
import numpy as np
import pandas as pd

from urbanstats.geometry.ellipse import locate_blocks

RADII = (0.25, 0.5, 1, 2, 4)

racial_demographics = {
    "hispanic": "P0020002",
    "white": "P0020005",
    "black": "P0020006",
    "native": "P0020007",
    "asian": "P0020008",
    "hawaiian_pi": "P0020009",
    "other": "P0020010",
    "mixed": "P0020011",
}

housing_units = {
    "total": "H0010001",
    "occupied": "H0010002",
    "vacant": "H0010003",
}


@lru_cache(None)
def load_raw_census(year=2020, filter_zero_pop=True):
    census_blocks = f"outputs/census_blocks/raw_census_{year}.csv"

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
                "P0030001",
                *racial_demographics.values(),
                *housing_units.values(),
                "SUMLEV",
                "GEOID",
                "--filter-level",
                "750",
                "--year",
                str(year),
            ]
        )
    raw_census = pd.read_csv(census_blocks)
    if filter_zero_pop:
        raw_census = raw_census[raw_census.POP100 != 0].copy()
    population = np.array(raw_census[["POP100"]])
    stats = {k: np.array(raw_census[v]) for k, v in racial_demographics.items()}
    stats.update({k: np.array(raw_census[v]) for k, v in housing_units.items()})
    coordinates = np.array([raw_census.INTPTLAT, raw_census.INTPTLON]).T
    pop_18 = np.array(raw_census["P0030001"])
    geoid = np.array(raw_census["GEOID"])
    return geoid, population, pop_18, stats, coordinates


def density_in_radius(radius, year):
    _, population, _, _, coordinates = load_raw_census(year)
    return locate_blocks(
        coordinates=coordinates, population=population, radius=radius
    ) / (np.pi * radius**2)


def all_densities(year):
    return {radius: density_in_radius(radius, year)[:, 0] for radius in RADII}


@lru_cache(None)
def all_densities_gpd(year=2020):
    geoid, population, pop_18, stats, coordinates = load_raw_census(year)
    densities = all_densities(year)
    density_metrics = {f"ad_{k}": densities[k] * population[:, 0] for k in densities}
    return gpd.GeoDataFrame(
        dict(
            geoid=geoid,
            **density_metrics,
            population=population[:, 0],
            population_18=pop_18,
            **stats,
        ),
        index=np.arange(len(population)),
        geometry=gpd.points_from_xy(coordinates[:, 1], coordinates[:, 0]),
        crs="EPSG:4326",
    )
