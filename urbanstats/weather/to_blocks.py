import numpy as np

from permacache import permacache, stable_hash

from census_blocks import load_raw_census

from urbanstats.weather.era5 import bounding_boxes
from urbanstats.weather.weather_statistic import compute_statistics
from urbanstats.weather.stats import era5_statistics

weather_stat_names = {k: stat.display_name for k, stat in era5_statistics.items()}


def classify_which_box(bounding_box_l, coordinates):
    which_box = np.zeros(coordinates.shape[0], dtype=np.int8) - 1
    y, x = coordinates.T
    for i, (_, (low_x, low_y, high_x, high_y)) in enumerate(bounding_box_l):
        which_box[(x >= low_x) & (x <= high_x) & (y >= low_y) & (y <= high_y)] = i
    assert (which_box != -1).all()
    return which_box


def coord_to_index_and_fraction(bounding_box, coordinates):
    """
    Outputs:

    idx_lat: index of the latitude of the bounding box. 0 is the lowest latitude,
        1 is the next lowest, at 0.25 degree increments.

        Should always refer to the bottom left corner of the cell.

    idx_lon: index of the longitude of the bounding box. 0 is the lowest longitude,
        1 is the next lowest, at 0.25 degree increments.

        Should always refer to the bottom left corner of the cell.

    fraction_lat: fraction of the current cell that the point is in, in the
        latitude direction. 0 is the bottom of the cell, 1 is the top.

    fraction_lon: fraction of the current cell that the point is in, in the
        longitude direction. 0 is the left of the cell, 1 is the right.
    """

    y, x = coordinates.T

    low_x, low_y, _, _ = bounding_box

    idx_lat_real = (y - low_y) / 0.25
    idx_lon_real = (x - low_x) / 0.25

    idx_lat = np.floor(idx_lat_real).astype(np.int32)
    idx_lon = np.floor(idx_lon_real).astype(np.int32)

    fraction_lat = idx_lat_real - idx_lat
    fraction_lon = idx_lon_real - idx_lon

    return dict(
        idx_lat=idx_lat,
        idx_lon=idx_lon,
        fraction_lat=fraction_lat,
        fraction_lon=fraction_lon,
    )


def interpolate(index_fraction, data):
    """
    data[lat_idx][lon_idx] -> float

    Use bilinear interpolation to get the value of the data at the given
    coordinates.
    """

    data = data[::-1]

    bot_left = data[index_fraction["idx_lat"], index_fraction["idx_lon"]]
    bot_right = data[index_fraction["idx_lat"], index_fraction["idx_lon"] + 1]
    top_left = data[index_fraction["idx_lat"] + 1, index_fraction["idx_lon"]]
    top_right = data[index_fraction["idx_lat"] + 1, index_fraction["idx_lon"] + 1]

    frac_lon = index_fraction["fraction_lon"]
    frac_lat = index_fraction["fraction_lat"]

    bot = bot_left * (1 - frac_lon) + bot_right * frac_lon
    top = top_left * (1 - frac_lon) + top_right * frac_lon

    return bot * (1 - frac_lat) + top * frac_lat


def compute_weather_by_block(
    bounding_box_l, coordinates, which_box, index_fractions, data
):
    result = np.zeros(coordinates.shape[0]) + np.nan
    for i in range(len(index_fractions)):
        result[which_box == i] = interpolate(
            index_fractions[i], data[bounding_box_l[i][0]]
        )
    assert not np.isnan(result).any()
    return result


def compute_all_weather_by_block(bounding_box_list, coordinates, data):
    which_box = classify_which_box(bounding_box_list, coordinates)
    index_fractions = {
        i: coord_to_index_and_fraction(
            bounding_box_list[i][1], coordinates[which_box == i]
        )
        for i in range(len(bounding_box_list))
    }
    result = {}
    for stat in list(list(data.values())[0]):
        result[stat] = compute_weather_by_block(
            bounding_box_list,
            coordinates,
            which_box,
            index_fractions,
            {k: v[stat] for k, v in data.items()},
        )
    return result


@permacache(
    "urbanstats/weather/era5/block_statistics",
    key_function=dict(era5_statistics=stable_hash),
)
def weather_block_statistics(era5_statistics=era5_statistics):
    cstats = compute_statistics(era5_statistics, 1991)
    *_, coordinates = load_raw_census()
    bounding_box_l = list(bounding_boxes().items())
    weather_by_block = compute_all_weather_by_block(bounding_box_l, coordinates, cstats)
    return weather_by_block
