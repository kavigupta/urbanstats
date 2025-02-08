import numpy as np
import shapely
import tqdm.auto as tqdm
from permacache import permacache, stable_hash
from urbanstats.data.gpw import (
    compute_gpw_weighted_for_shape,
    lat_from_row_idx,
    load_full_ghs,
    lon_from_col_idx,
)

deg_2_ghs_index = 60 * 2  # 30 arcseconds


@permacache("urbanstats/data/pollution/pollution_in_ghs_coordinates")
def pollution_in_ghs_coordinates(pollution_data, latitudes, longitudes):
    ghs_lat_deg = lat_from_row_idx(np.arange(180 * deg_2_ghs_index))
    ghs_lon_deg = lon_from_col_idx(np.arange(360 * deg_2_ghs_index))

    ghs_lat_pol_idx = (
        (ghs_lat_deg - latitudes[0])
        / (latitudes[-1] - latitudes[0])
        * (len(latitudes) - 1)
    )

    ghs_lon_pol_idx = (
        (ghs_lon_deg - longitudes[0])
        / (longitudes[-1] - longitudes[0])
        * (len(longitudes) - 1)
    )

    top_left_lat = np.floor(ghs_lat_pol_idx).astype(int)
    lat_frac = ghs_lat_pol_idx - top_left_lat
    top_left_lon = np.floor(ghs_lon_pol_idx).astype(int)
    lon_frac = ghs_lon_pol_idx - top_left_lon

    result = np.zeros((180 * deg_2_ghs_index, 360 * deg_2_ghs_index), dtype=np.float32)

    for di in range(2):
        lat_frac_specific = lat_frac if di == 0 else 1 - lat_frac
        for dj in range(2):
            lon_frac_specific = lon_frac if dj == 0 else 1 - lon_frac
            y = top_left_lat + di
            x = top_left_lon + dj
            mask_y = (y >= 0) & (y < pollution_data.shape[0])
            mask_x = (x >= 0) & (x < pollution_data.shape[1])
            [yidxs] = np.where(mask_y)
            min_y, max_y = yidxs[0], yidxs[-1]
            [xidxs] = np.where(mask_x)
            min_x, max_x = xidxs[0], xidxs[-1]

            pollution_pulled = (
                pollution_data[
                    y[mask_y][:, None],
                    x[mask_x][None, :],
                ]
                * lat_frac_specific[mask_y][:, None]
                * lon_frac_specific[mask_x][None, :]
            )

            result[min_y : max_y + 1, min_x : max_x + 1] += pollution_pulled

    return result


@permacache(
    "urbanstats/data/pollution/pollution_statistics_for_shape",
    key_function=dict(
        shape=lambda x: stable_hash(shapely.to_geojson(x)),
    ),
)
def pollution_statistics_for_shape(shape):
    return compute_gpw_weighted_for_shape(
        shape,
        load_full_ghs(),
        {"pm_2point5_2018_2022": (pollution_in_ghs_coordinates(), True)},
        do_histograms=False,
    )


@permacache(
    "urbanstats/data/pollution/pollution_statistics_for_shapefile",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def pollution_statistics_for_shapefile(shapefile):
    sf = shapefile.load_file()
    result = {"pm_2point5_2018_2022": []}
    for shape in tqdm.tqdm(sf.geometry):
        stats, _ = pollution_statistics_for_shape(shape)
        result["pm_2point5_2018_2022"].append(stats["pm_2point5_2018_2022"])
    return result
