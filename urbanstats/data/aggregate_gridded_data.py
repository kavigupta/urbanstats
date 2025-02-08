from abc import ABC, abstractmethod
from permacache import permacache
import numpy as np
import pandas as pd

from urbanstats.data.census_blocks import load_raw_census
from urbanstats.geometry.census_aggregation import aggregate_by_census_block


class GriddedDataSource(ABC):
    @abstractmethod
    def load_gridded_data(self, resolution: int | str = "most_detailed"):
        """
        Load the gridded data at the given resolution.

        :param resolution: The resolution of the data to load. This can be an integer or a string.
            If it is an integer, it is the number of grid cells per degree. If it is a string, it
            is 'most_detailed'; the most detailed resolution available.
        """


@permacache(
    "urbanstats/data/aggregated_gridded_data/elevation_statistics_for_american_shapefile",
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


@permacache("urbanstats/data/aggregate_gridded_data/stats_by_blocks")
def stats_by_blocks(gridded_data_sources, year):
    _, _, _, _, coordinates = load_raw_census(year)
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
