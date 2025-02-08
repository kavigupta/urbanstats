from abc import ABC, abstractmethod
from permacache import permacache, stable_hash
import numpy as np
import pandas as pd
import shapely
import tqdm.auto as tqdm

from urbanstats.data.canada.canada_blocks import load_canada_db_shapefile
from urbanstats.data.census_blocks import load_raw_census
from urbanstats.data.gpw import compute_gpw_weighted_for_shape, load_full_ghs
from urbanstats.geometry.census_aggregation import (
    aggregate_by_census_block,
    aggregate_by_census_block_canada,
)
from urbanstats.statistics.statistic_collection import compute_subset_statistics


class GriddedDataSource(ABC):
    @abstractmethod
    def load_gridded_data(self, resolution: int | str = "most_detailed"):
        """
        Load the gridded data at the given resolution.

        :param resolution: The resolution of the data to load. This can be an integer or a string.
            If it is an integer, it is the number of grid cells per degree. If it is a string, it
            is 'most_detailed'; the most detailed resolution available.
        """


def disaggregate_gridded_data(
    *,
    gridded_data_sources,
    shapefile,
    existing_statistics,
    shapefile_table,
):
    subsets = []
    for subset_name, subset_fn in [
        ("USA", statistics_for_american_shapefile),
        ("Canada", statistics_for_canada_shapefile),
    ]:
        just_subset, subset_stats = compute_subset_statistics(
            shapefile,
            existing_statistics,
            shapefile_table,
            subset=subset_name,
            compute_function=lambda shapefile, existing_statistics, shapefile_table: subset_fn(
                gridded_data_sources, shapefile
            ),
        )
        if just_subset:
            return subset_stats
        if subset_stats:
            subsets.append(subset_stats)

    intl_stats = (
        statistics_for_shapefile(gridded_data_sources, shapefile)
        if "international_gridded_data" in shapefile.special_data_sources
        else {}
    )
    if not subsets:
        return intl_stats

    for subset_stats in subsets:
        assert set(subset_stats.keys()) == set(intl_stats.keys())

    intl_stats = {k: np.array(v) for k, v in intl_stats.items()}

    for subset_stats in subsets:
        for k, v in subset_stats.items():
            intl_stats[k][~np.isnan(v)] = v[~np.isnan(v)]

    return intl_stats


@permacache(
    "urbanstats/data/aggregate_gridded_data/statistics_for_shape",
    key_function=dict(
        shape=lambda x: stable_hash(shapely.to_geojson(x)),
    ),
)
def statistics_for_shape(gridded_data_sources, shape):
    return compute_gpw_weighted_for_shape(
        shape,
        load_full_ghs(),
        {
            k: (v.load_gridded_data(60 * 2), True)
            for k, v in gridded_data_sources.items()
        },
        do_histograms=False,
    )


@permacache(
    "urbanstats/data/aggregate_gridded_data/statistics_for_shapefile",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def statistics_for_shapefile(gridded_data_sources, shapefile):
    sf = shapefile.load_file()
    result = {k: [] for k in gridded_data_sources}
    for shape in tqdm.tqdm(sf.geometry):
        stats, _ = statistics_for_shape(gridded_data_sources, shape)
        for k, v in stats.items():
            result[k].append(v)
    return result


@permacache(
    "urbanstats/data/aggregate_gridded_data/statistics_for_american_shapefile",
    key_function=dict(sf=lambda x: x.hash_key),
)
def statistics_for_american_shapefile(gridded_data_sources, sf):
    _, population_2020, *_ = load_raw_census(2020)
    stats_times_population = (
        stats_by_blocks(gridded_data_sources, 2020) * population_2020
    )
    stats_times_population["population"] = population_2020[:, 0]
    result = aggregate_by_census_block(2020, sf, stats_times_population)
    for k in result.columns[:-1]:
        result[k] = result[k] / result.population
    del result["population"]
    return result


@permacache(
    "urbanstats/data/aggregate_gridded_data/statistics_for_canada_shapefile",
    key_function=dict(sf=lambda x: x.hash_key),
)
def statistics_for_canada_shapefile(gridded_data_sources, sf, year=2021):
    canada_db = load_canada_db_shapefile(year)
    stats_times_population = (
        stats_by_canada_blocks(gridded_data_sources, year)
        * np.array(canada_db.population)[:, None]
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


@permacache("urbanstats/data/aggregate_gridded_data/stats_by_blocks")
def stats_by_blocks(gridded_data_sources, year):
    _, _, _, _, coordinates = load_raw_census(year)
    return disaggregate_both_to_blocks(gridded_data_sources, coordinates)


@permacache("urbanstats/data/aggregate_gridded_data/stats_by_canada_blocks")
def stats_by_canada_blocks(gridded_data_sources, year):
    geos = load_canada_db_shapefile(year).geometry
    coordinates = np.array([geos.y, geos.x]).T
    return disaggregate_both_to_blocks(gridded_data_sources, coordinates)


def disaggregate_both_to_blocks(gridded_data_sources, coordinates):
    return pd.DataFrame(
        {
            k: disaggregate_to_blocks(v, coordinates)
            for k, v in gridded_data_sources.items()
        }
    )


def disaggregate_to_blocks(gds, coordinates):
    lat, lon = coordinates.T
    full_img = gds.load_gridded_data("most_detailed")
    by_block = look_up(full_img, lat, lon)
    return by_block


def look_up(full_image, lat, lon):
    chunk_size = full_image.shape[0] // 180
    assert full_image.shape == (180 * chunk_size, 360 * chunk_size)
    y = (90 - lat) * chunk_size
    x = (lon + 180) * chunk_size
    # bilinear interpolation. Lat and lon are arrays.

    y0 = np.floor(y).astype(int)
    y1 = y0 + 1
    x0 = np.floor(x).astype(int)
    x1 = x0 + 1

    y0 = np.clip(y0, 0, full_image.shape[0] - 1)
    y1 = np.clip(y1, 0, full_image.shape[0] - 1)
    x0 = np.clip(x0, 0, full_image.shape[1] - 1)
    x1 = np.clip(x1, 0, full_image.shape[1] - 1)

    y_frac = y - y0
    x_frac = x - x0

    top = full_image[y0, x0] * (1 - x_frac) + full_image[y0, x1] * x_frac
    bottom = full_image[y1, x0] * (1 - x_frac) + full_image[y1, x1] * x_frac
    return top * (1 - y_frac) + bottom * y_frac
