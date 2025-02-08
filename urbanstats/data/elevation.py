from dataclasses import dataclass
import tempfile
from functools import lru_cache
from urllib.error import HTTPError

import netCDF4
import numpy as np
import pandas as pd
import shapely
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.data.canada.canada_blocks import load_canada_db_shapefile
from urbanstats.data.census_blocks import load_raw_census
from urbanstats.data.gpw import compute_gpw_weighted_for_shape, load_full_ghs
from urbanstats.data.nasa import get_nasa_data
from urbanstats.geometry.census_aggregation import (
    aggregate_by_census_block,
    aggregate_by_census_block_canada,
)

PER_CELL = 3600
CHUNK = 15  # double GPW's 30 arcsecond resolution
reduced_cell = PER_CELL // CHUNK

r_earth = 6371
hilliness_dist = 0.1
angles = np.linspace(0, 2 * np.pi, 12, endpoint=False)


def compute_url(lat_min, lon_min):
    root = "https://e4ftl01.cr.usgs.gov/ASTT/ASTGTM_NC.003/2000.03.01/"
    assert isinstance(lat_min, int) and isinstance(lon_min, int)
    lat_render = f"N{lat_min:02d}" if lat_min >= 0 else f"S{-lat_min:02d}"
    lon_render = f"E{lon_min:03d}" if lon_min >= 0 else f"W{-lon_min:03d}"
    return f"{root}ASTGTMV003_{lat_render}{lon_render}_dem.nc"


@lru_cache(maxsize=180 * 3)  # 3 columns
def load_elevation_data(lat_min, lon_min):
    url = compute_url(lat_min, lon_min)
    try:
        content = get_nasa_data(url)
    except HTTPError as e:
        assert e.code == 404
        return None
    with tempfile.NamedTemporaryFile(suffix=".nc") as t:
        with open(t.name, "wb") as f:
            f.write(content)
        # The member exists, but pylint doesn't know about it.
        # pylint: disable=no-member
        d = netCDF4.Dataset(t.name, "r")
        d = np.array(d["ASTER_GDEM_DEM"][:])
        # trim off the highest-lat row and easternmost column
        # these are duplicates of the next cell.
        res = d[1:, :-1]
    assert res.shape == (PER_CELL, PER_CELL)
    return res


def load_elevation_data_with_surrounding(lat_min, lon_min):
    result = np.zeros((3 * PER_CELL, 3 * PER_CELL))
    for i in range(3):
        for j in range(3):
            data = load_elevation_data(lat_min + i - 1, lon_min + j - 1)
            if data is not None:
                result[
                    (2 - i) * PER_CELL : ((2 - i) + 1) * PER_CELL,
                    j * PER_CELL : (j + 1) * PER_CELL,
                ] = data
    return result


def compute_grade_aligned(y_min, x_min):
    # pylint: disable=too-many-locals
    cell = load_elevation_data(y_min, x_min)
    if cell is None:
        return None
    neighborhood = load_elevation_data_with_surrounding(y_min, x_min)
    rad_x_blocks = PER_CELL * np.rad2deg(
        hilliness_dist / (r_earth * np.cos(np.deg2rad(y_min + 0.5)))
    )
    rad_y_blocks = PER_CELL * np.rad2deg(hilliness_dist / r_earth)

    rad_x_blocks_low = int(rad_x_blocks)
    rad_x_blocks_frac = rad_x_blocks - rad_x_blocks_low

    rad_y_blocks_low = int(rad_y_blocks)
    rad_y_blocks_frac = rad_y_blocks - rad_y_blocks_low

    results = []
    for xdir in (1, -1):
        near = neighborhood[
            PER_CELL : 2 * PER_CELL,
            PER_CELL + xdir * rad_x_blocks_low : 2 * PER_CELL + xdir * rad_x_blocks_low,
        ]
        far = neighborhood[
            PER_CELL : 2 * PER_CELL,
            PER_CELL
            + xdir * (rad_x_blocks_low + 1) : 2 * PER_CELL
            + xdir * (rad_x_blocks_low + 1),
        ]
        results.append(near * (1 - rad_x_blocks_frac) + far * rad_x_blocks_frac)

    for ydir in (1, -1):
        near = neighborhood[
            PER_CELL + ydir * rad_y_blocks_low : 2 * PER_CELL + ydir * rad_y_blocks_low,
            PER_CELL : 2 * PER_CELL,
        ]
        far = neighborhood[
            PER_CELL
            + ydir * (rad_y_blocks_low + 1) : 2 * PER_CELL
            + ydir * (rad_y_blocks_low + 1),
            PER_CELL : 2 * PER_CELL,
        ]
        results.append(near * (1 - rad_y_blocks_frac) + far * rad_y_blocks_frac)

    results = np.array(results)
    delta_ratio = np.abs(results - cell) / (1000 * hilliness_dist)
    grade = delta_ratio / (delta_ratio**2 + 1) ** 0.5
    return grade.mean(axis=0)


def chunk_mean(arr):
    if arr is None:
        return None
    return arr.reshape(
        arr.shape[1] // CHUNK, CHUNK, arr.shape[1] // CHUNK, CHUNK, *arr.shape[2:]
    ).mean((1, 3))


@permacache("urbanstats/data/elevation/aggregated_elevation")
def aggregated_elevation(lat_min, lon_min):
    data = load_elevation_data(lat_min, lon_min)
    return chunk_mean(data)


@permacache("urbanstats/data/elevation/aggregated_hilliness")
def aggregated_hilliness(lat_min, lon_min):
    data = compute_grade_aligned(lat_min, lon_min)
    return chunk_mean(data)


def create_full_image(function, chunk_reduction):
    size = PER_CELL // (CHUNK * chunk_reduction)
    full_image = np.zeros((180 * size, 360 * size), dtype=np.float32)
    for i in tqdm.tqdm(range(-90, 90)):
        for j in range(-180, 180):
            result = function(i, j)
            if result is None:
                continue
            result = result.reshape(
                result.shape[0] // chunk_reduction,
                chunk_reduction,
                result.shape[1] // chunk_reduction,
                chunk_reduction,
            ).mean((1, 3))
            sr = (89 - i) * size
            sc = (j + 180) * size
            full_image[sr : sr + size, sc : sc + size] = result
    return full_image


from .aggregate_gridded_data import GriddedDataSource


@dataclass
class ElevationGriddedData(GriddedDataSource):
    @lru_cache(maxsize=None)
    def load_gridded_data(self, resolution: int | str = "most_detailed"):
        if resolution == "most_detailed":
            return create_full_image(aggregated_elevation, 1)
        assert resolution == 60 * 2
        return create_full_image(aggregated_elevation, 2)


@dataclass
class HillinessGriddedData(GriddedDataSource):
    @lru_cache(maxsize=None)
    def load_gridded_data(self, resolution: int | str = "most_detailed"):
        if resolution == "most_detailed":
            return create_full_image(aggregated_hilliness, 1)
        assert resolution == 60 * 2
        return create_full_image(aggregated_hilliness, 2)


# def disaggregate_to_blocks(function, coordinates):
#     lat, lon = coordinates.T
#     full_img = create_full_image(function, 1)
#     by_block = look_up(full_img, lat, lon)
#     return by_block


# def disaggregate_both_to_blocks(coordinates):
#     elevation = disaggregate_to_blocks(aggregated_elevation, coordinates)
#     hilliness = disaggregate_to_blocks(aggregated_hilliness, coordinates)
#     return pd.DataFrame(dict(elevation=elevation, hilliness=hilliness))


@lru_cache(maxsize=1)
def full_elevation():
    return create_full_image(aggregated_elevation, 2)


@lru_cache(maxsize=1)
def full_hilliness():
    return create_full_image(aggregated_hilliness, 2)


# @permacache("urbanstats/data/elevation/stats_by_blocks")
# def stats_by_blocks(year):
#     _, _, _, _, coordinates = load_raw_census(year)
#     return disaggregate_both_to_blocks(coordinates)


@permacache("urbanstats/data/elevation/stats_by_canada_blocks_2")
def stats_by_canada_blocks(year):
    geos = load_canada_db_shapefile(year).geometry
    coordinates = np.array([geos.y, geos.x]).T
    return disaggregate_both_to_blocks(coordinates)


# @permacache(
#     "urbanstats/data/elevation/elevation_statistics_for_american_shapefile_2",
#     key_function=dict(sf=lambda x: x.hash_key),
# )
# def elevation_statistics_for_american_shapefile(sf):
#     _, population_2020, *_ = load_raw_census(2020)
#     stats_times_population = stats_by_blocks(2020) * population_2020
#     stats_times_population["population"] = population_2020[:, 0]
#     result = aggregate_by_census_block(2020, sf, stats_times_population)
#     for k in result.columns[:-1]:
#         result[k] = result[k] / result.population
#     del result["population"]
#     return result


@permacache(
    "urbanstats/data/elevation/elevation_statistics_for_canada_shapefile",
    key_function=dict(sf=lambda x: x.hash_key),
)
def elevation_statistics_for_canada_shapefile(sf, year=2021):
    canada_db = load_canada_db_shapefile(year)
    stats_times_population = (
        stats_by_canada_blocks(year) * np.array(canada_db.population)[:, None]
    )
    stats_times_population["population"] = canada_db.population
    agg = aggregate_by_census_block_canada(
        year,
        sf,
        stats_times_population,
    )
    for k in agg.columns[:-1]:
        agg[k] = agg[k] / agg.population
    del agg["population"]
    return agg


@permacache(
    "urbanstats/data/elevation/elevation_statistics_for_shape_2",
    key_function=dict(
        shape=lambda x: stable_hash(shapely.to_geojson(x)),
    ),
)
def elevation_statistics_for_shape(shape):
    return compute_gpw_weighted_for_shape(
        shape,
        load_full_ghs(),
        {"elevation": (full_elevation(), True), "hilliness": (full_hilliness(), True)},
        do_histograms=False,
    )


@permacache(
    "urbanstats/data/elevation/elevation_statistics_for_shapefile_2",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def elevation_statistics_for_shapefile(shapefile):
    sf = shapefile.load_file()
    result = {"elevation": [], "hilliness": []}
    for shape in tqdm.tqdm(sf.geometry):
        stats, _ = elevation_statistics_for_shape(shape)
        result["elevation"].append(stats["elevation"])
        result["hilliness"].append(stats["hilliness"])
    return result
