from functools import lru_cache
import tempfile
from urllib.error import HTTPError

from permacache import permacache
import netCDF4
import numpy as np
import tqdm
from urbanstats.data.nasa import get_nasa_data

PER_CELL = 3600
CHUNK = 15  # double GPW's 30 arcsecond resolution

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
    t = tempfile.NamedTemporaryFile(suffix=".nc")
    with open(t.name, "wb") as f:
        f.write(content)
    d = netCDF4.Dataset(f.name, "r")
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


def compute_grade(y_min, x_min):
    cell = load_elevation_data(y_min, x_min)
    neighborhood = load_elevation_data_with_surrounding(y_min, x_min)
    ys_deg = y_min + np.linspace(0, 1, PER_CELL + 1)[:-1][::-1]
    # r_earth_x = r_earth * np.cos(latitude)
    rad_x_blocks = PER_CELL * np.rad2deg(
        hilliness_dist / (r_earth * np.cos(np.deg2rad(ys_deg)))
    )
    rad_y_blocks = PER_CELL * np.rad2deg(hilliness_dist / r_earth)
    x_loc = (
        np.arange(PER_CELL)[None, :, None]
        + rad_x_blocks[None, :, None] * np.cos(angles)[None, None, :]
    )
    y_loc = (
        np.arange(PER_CELL)[:, None, None]
        + rad_y_blocks * np.sin(angles)[None, None, :]
    )
    at_radius = interpolate(neighborhood, x_loc + PER_CELL, y_loc + PER_CELL)
    # delta_ratio = tan(theta) = rise / baseline
    # grade = rise / run = rise / sqrt(rise ** 2 + baseline ** 2)
    #       = (rise / baseline) / sqrt(1 + (rise / baseline)**2)
    delta_ratio = np.abs(at_radius - cell[:, :, None]) / (1000 * hilliness_dist)
    grade = delta_ratio / (delta_ratio**2 + 1) ** 0.5
    grade = np.mean(grade, axis=-1)
    return grade


def compute_grade_aligned(y_min, x_min):
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


def interpolate(arr, xidx, yidx):
    """
    Compute the value of the array at the given points.

    :param arr: The array to interpolate. This should be a 2D array.
    :param xidx: The x indices of the points. This can be an arbitrary shape.
    :param yidx: The y indices of the points. This must have the same shape as xidx.

    :return: The interpolated values.
    """

    assert (xidx >= 0).all() and (xidx <= arr.shape[1] - 1).all()
    assert (yidx >= 0).all() and (yidx <= arr.shape[0] - 1).all()

    xidx_floor = np.floor(xidx).astype(np.uint32)
    xidx_ceil = np.ceil(xidx).astype(np.uint32)
    yidx_floor = np.floor(yidx).astype(np.uint32)
    yidx_ceil = np.ceil(yidx).astype(np.uint32)

    xfrac = xidx - xidx_floor
    yfrac = yidx - yidx_floor

    # bilinear interpolation

    # first, interpolate in the x direction
    a = arr[yidx_floor, xidx_floor] * (1 - xfrac) + arr[yidx_floor, xidx_ceil] * xfrac
    b = arr[yidx_ceil, xidx_floor] * (1 - xfrac) + arr[yidx_ceil, xidx_ceil] * xfrac

    # then, interpolate in the y direction
    return a * (1 - yfrac) + b * yfrac


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


if __name__ == "__main__":
    lat_lons = [(lat, lon) for lon in range(-180, 180) for lat in range(-90, 90)]
    for lat, lon in tqdm.tqdm(lat_lons):
        aggregated_elevation(lat, lon)
        aggregated_hilliness(lat, lon)
