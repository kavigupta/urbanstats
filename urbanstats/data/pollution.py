from dataclasses import dataclass
from functools import lru_cache

import numpy as np
from permacache import permacache

from urbanstats.data.aggregate_gridded_data import GriddedDataSource
from urbanstats.data.gpw import lat_from_row_idx, lon_from_col_idx

deg_2_ghs_index = 60 * 2  # 30 arcseconds


@dataclass(frozen=True)
class HillinessGriddedData(GriddedDataSource):
    # pylint: disable=method-cache-max-size-none
    @lru_cache(maxsize=None)
    def load_gridded_data(self, resolution: int | str = "most_detailed"):
        assert resolution in {"most_detailed", 60 * 2}
        return pollution_in_ghs_coordinates()


pollution_gds = {
    "pm_25_2018_2022": HillinessGriddedData(),
}


@permacache("urbanstats/data/pollution/pollution_in_ghs_coordinates")
def pollution_in_ghs_coordinates():
    f = np.load("named_region_shapefiles/pollution/annual_mean.npz")
    latitudes = f["latitudes"]
    longitudes = f["longitudes"]
    pollution_data = f["mean_pollution"]
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
        for dj in range(2):
            _modify_values(
                pollution_data,
                result,
                frac_y=lat_frac if di == 0 else 1 - lat_frac,
                frac_x=lon_frac if dj == 0 else 1 - lon_frac,
                y_idx=top_left_lat + di,
                x_idx=top_left_lon + dj,
            )

    return result


def _modify_values(inp_data, out_data, *, frac_y, frac_x, y_idx, x_idx):
    mask_y = (y_idx >= 0) & (y_idx < inp_data.shape[0])
    mask_x = (x_idx >= 0) & (x_idx < inp_data.shape[1])
    [yidxs] = np.where(mask_y)
    min_y, max_y = yidxs[0], yidxs[-1]
    [xidxs] = np.where(mask_x)
    min_x, max_x = xidxs[0], xidxs[-1]

    pollution_pulled = (
        inp_data[
            y_idx[mask_y][:, None],
            x_idx[mask_x][None, :],
        ]
        * frac_y[mask_y][:, None]
        * frac_x[mask_x][None, :]
    )

    out_data[min_y : max_y + 1, min_x : max_x + 1] += pollution_pulled
