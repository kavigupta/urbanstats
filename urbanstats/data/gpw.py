import os
from typing import Any, cast

import dask.array
import numpy as np
import shapely
import tqdm.auto as tqdm
import zarr
from geotiff import GeoTiff
from numpy.typing import NDArray
from permacache import drop_if_equal, permacache, stable_hash
from scipy.interpolate import RegularGridInterpolator

from urbanstats.data.census_blocks import RADII
from urbanstats.geometry.ellipse import Ellipse
from urbanstats.geometry.rasterize import exract_raster_points, rasterize_using_lines
from urbanstats.utils import cached_zarr_array, compute_bins

GPW_RADII = [k for k in RADII if k >= 1]


@permacache("urbanstats/data/gpw/load_full_ghs_2")
def load_full_ghs_30_arcsec() -> NDArray[np.float32]:
    path = "named_region_shapefiles/gpw/GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0.tif"
    return load_ghs_from_path(path, resolution=60 * 60 // 30)


def load_full_ghs_3arcsec_zarr() -> NDArray[np.float32]:
    result = GeoTiff(
        "named_region_shapefiles/gpw/GHS_POP_E2020_GLOBE_R2023A_4326_3ss_V1_0/GHS_POP_E2020_GLOBE_R2023A_4326_3ss_V1_0.tif"
    )
    return cast(NDArray[np.float32], result.read())


def load_full_ghs_30arcsec_zarr() -> Any:
    return cached_zarr_array(
        "named_region_shapefiles/gpw/zarr/ghs_population", load_full_ghs_30_arcsec
    )


def load_full_ghs_zarr(resolution: int) -> Any:
    if resolution == 1200:
        return load_full_ghs_3arcsec_zarr()
    if resolution == 120:
        return load_full_ghs_30arcsec_zarr()
    raise ValueError(f"Resolution must be 1200 or 120, not {resolution}")


def load_ghs_from_path(path: str, resolution: int) -> NDArray[np.float32]:
    gt = GeoTiff(path)
    ghs = np.array(gt.read())
    popu: NDArray[np.float32] = np.zeros(
        (180 * resolution, 360 * resolution), dtype=np.float32
    )
    min_lon, max_lat = gt.get_coords(0, 0)
    j_off = round((min_lon - (-180)) * resolution)
    i_off = round((90 - max_lat) * resolution)
    assert j_off == -1
    popu[i_off : i_off + ghs.shape[0]] = ghs[:, 1:-1]
    return popu


def lat_from_row_idx(row_idx: float, resolution: int) -> float:
    return 90 - row_idx * 1 / resolution


def lon_from_col_idx(col_idx: float, resolution: int) -> float:
    return -180 + col_idx * 1 / resolution


def compute_cell_overlaps_with_circle_grid_array(
    radius: float,
    row_idx: int,
    *,
    grid_size: int,
    resolution: int,
) -> tuple[
    NDArray[np.intp],
    NDArray[np.intp],
    NDArray[np.floating[Any]],
]:
    # pylint: disable=too-many-locals
    ell = Ellipse(
        radius,
        lat_from_row_idx(row_idx + 0.5, resolution),
        lon_from_col_idx(0.5, resolution),
    )
    yr, xr = ell.lat_radius, ell.lon_radius
    xr_idxs, yr_idxs = [int(np.ceil(radius * resolution + 2)) for radius in (xr, yr)]
    xs, ys = [np.arange(-radius, radius + 1) for radius in (xr_idxs, yr_idxs)]
    # placing a grid off-index, e.g., if grid size is 3, we do 1/6, 3/6, 5/6.
    within_cell_grid = np.linspace(1 / grid_size / 2, 1 - 1 / grid_size / 2, grid_size)
    xs_specific, ys_specific = [
        (np.repeat(seq[:, None], grid_size, axis=1) + within_cell_grid)
        for seq in (xs, ys)
    ]
    xs_specific, ys_specific = [
        (seq - 0.5) / resolution for seq in (xs_specific, ys_specific)
    ]
    dist_from_center = (xs_specific[..., None, None] / xr) ** 2 + (
        ys_specific[None, None] / yr
    ) ** 2
    attributable_to_each = (dist_from_center <= 1).mean((1, 3))
    return xs, ys, attributable_to_each


def compute_cell_overlaps_with_circle(
    radius: float,
    row_idx: int,
    grid_size: int = 100,
    *,
    resolution: int,
) -> dict[tuple[int, int], float]:
    xs, ys, b_arr = compute_cell_overlaps_with_circle_grid_array(
        radius, row_idx, grid_size=grid_size, resolution=resolution
    )
    x_idxs, y_idxs = np.where(b_arr)
    return {
        (int(y) + row_idx, int(x)): float(amount)
        for (x, y, amount) in zip(xs[x_idxs], ys[y_idxs], b_arr[x_idxs, y_idxs])
    }


def compute_circle_density_per_cell_zarr(radius: int, resolution: int) -> Any:
    path = (
        f"named_region_shapefiles/gpw/zarr/ghs_gpw_radius_{radius}km_res_{resolution}"
    )
    if os.path.exists(path):
        return zarr.open(path, mode="r")["data"]
    print("Computing density for radius", radius)
    glo = load_full_ghs_zarr(resolution)
    glo_dask = dask.array.from_zarr(glo)
    [row_idxs] = np.where(np.array(glo_dask.any(axis=1)))
    with zarr.open(path, mode="w") as z:
        z.create_dataset("data", shape=glo.shape)
        sum_in_radius(
            radius,
            glo_dask,
            row_idxs,
            z["data"],
            multiplier=1 / (np.pi * radius**2),
            resolution=resolution,
        )
    return compute_circle_density_per_cell_zarr(radius, resolution)


class ChunkedAssigner:
    def __init__(self, out: Any, chunk_size: int) -> None:
        self.out = out
        self.chunk_size = chunk_size
        self.current_start: int = 0
        self.cache: NDArray[np.floating[Any]] = np.zeros(
            (chunk_size, *out.shape[1:]), dtype=out.dtype
        )

    def assign(self, row_idx: int, value: NDArray[np.floating[Any]]) -> None:
        if row_idx >= self.current_start + self.chunk_size:
            self.flush()
            self.current_start = row_idx
        self.cache[row_idx - self.current_start] = value

    def flush(self) -> None:
        if self.current_start >= 0:
            start = self.current_start
            self.out[start : start + self.chunk_size] = self.cache
        self.current_start = -self.chunk_size - 1
        self.cache = np.zeros_like(self.cache, dtype=self.out.dtype)


def sum_in_radius(
    radius: int,
    global_map: Any,
    row_idxs: NDArray[np.intp],
    out: Any,
    multiplier: float = 1,
    *,
    resolution: int,
    loading_chunk: int = 1000,
    saving_chunk: int = 1000,
) -> Any:
    # pylint: disable=too-many-locals
    assigner = ChunkedAssigner(out, saving_chunk)
    loading_start: int = -1
    local_array: NDArray[np.floating[Any]] | None = None
    local_array_cumsum: NDArray[np.floating[Any]] | None = None

    def fetch_chunk_for(start: int, end: int) -> None:
        nonlocal loading_start, local_array, local_array_cumsum
        assert start >= loading_start
        if end >= loading_start + loading_chunk:
            loading_start = start
            assert end < loading_start + loading_chunk
            local_array = np.array(
                global_map[loading_start : loading_start + loading_chunk]
            )
            local_array_cumsum = np.cumsum(local_array, axis=1)

    fetch_chunk_for(0, 0)
    for row_idx in tqdm.tqdm(row_idxs, desc=f"Computing gpw density for {radius} km"):
        overlaps = compute_cell_overlaps_with_circle(
            radius, row_idx, grid_size=40, resolution=resolution
        )
        rows = [row for row, _ in overlaps.keys()]
        fetch_chunk_for(min(rows), max(rows))
        assert local_array is not None and local_array_cumsum is not None
        result_for_row = compute_convolution(
            loading_start, local_array, local_array_cumsum, overlaps
        )

        assigner.assign(row_idx, result_for_row * multiplier)
    assigner.flush()
    return out


def compute_convolution(
    array_row_idx_base: int,
    local_array: NDArray[np.floating[Any]],
    local_array_cumsum: NDArray[np.floating[Any]],
    filter_to_convolve: dict[tuple[int, int], float],
) -> NDArray[np.floating[Any]]:
    source_rows = {source_row for source_row, _ in filter_to_convolve.keys()}
    result_for_row: NDArray[np.floating[Any]] = np.array(0.0)
    for source_row in source_rows:
        local_row = local_array[source_row - array_row_idx_base]
        local_row_cumsum = local_array_cumsum[source_row - array_row_idx_base]
        columns = [off for sr, off in filter_to_convolve.keys() if sr == source_row]
        consecutives = []
        for off in range(-max(columns), max(columns) + 1):
            if filter_to_convolve[source_row, off] > 1 - 1e-5:
                consecutives.append(off)
                continue
            result_for_row += (
                np.roll(local_row, -off) * filter_to_convolve[(source_row, off)]
            )
        if not consecutives:
            continue
        lo, hi = min(consecutives), max(consecutives)
        assert len(consecutives) == hi - lo + 1
        delta = (
            np.roll(local_row_cumsum, -hi) - np.roll(local_row_cumsum, -lo + 1)
        ) % local_row_cumsum[-1]
        result_for_row += delta
    return result_for_row


def produce_histogram(
    density_data: NDArray[np.floating[Any]],
    population_data: NDArray[np.floating[Any]],
) -> NDArray[np.floating[Any]]:
    """
    Produce a histogram of population data with the given density data.
    """
    density_data = np.log(density_data) / np.log(10)
    density_data = density_data.flatten()
    population_data = population_data.flatten()

    return compute_bins(density_data, population_data, bin_size=0.1)


def compute_gpw_weighted_for_shape(
    shape: Any,
    glo_pop: NDArray[np.floating[Any]],
    gridded_statistics: dict[str, tuple[NDArray[np.floating[Any]], bool]],
    *,
    do_histograms: bool,
    resolution: int,
) -> tuple[dict[str, float], dict[str, NDArray[np.floating[Any]]]]:
    row_selected, col_selected = select_points_in_shape(
        shape, glo_pop, resolution=resolution
    )
    pop = glo_pop[row_selected, col_selected]
    result: dict[str, float] = {}
    hists: dict[str, NDArray[np.floating[Any]]] = {}
    for name, (data, pop_weight) in gridded_statistics.items():
        data_selected = _compute_gridded_statistics_for_coordinates(
            row_selected, col_selected, glo_pop.shape[0], glo_pop.shape[1], data
        )
        if pop_weight:
            result[name] = float(
                np.nansum(pop * data_selected) / np.nansum(pop)
            )
        else:
            result[name] = float(np.nansum(data_selected))
        if do_histograms:
            assert pop_weight, "pop_weight is required for histograms"
            hists[name] = produce_histogram(data_selected, pop)
    return result, hists


def _compute_gridded_statistics_for_coordinates(
    row_selected: NDArray[np.intp],
    col_selected: NDArray[np.intp],
    height: int,
    width: int,
    data: NDArray[np.floating[Any]],
) -> NDArray[np.floating[Any]]:
    if data.shape == (height, width):
        return data[row_selected, col_selected]
    scale = data.shape[0] / height
    assert np.isclose(
        data.shape[1] / width, scale
    ), f"data shape {data.shape} not compatible with {height}x{width}"

    # add 0.5 before scaling to center the points in the cells
    return _compute_bilinear_subinterpolation(
        data, (row_selected + 0.5) * scale, (col_selected + 0.5) * scale
    )


def _compute_bilinear_subinterpolation(
    data: NDArray[np.floating[Any]],
    fractional_rows: NDArray[np.floating[Any]],
    fractional_cols: NDArray[np.floating[Any]],
) -> NDArray[np.floating[Any]]:
    """
    Does a bilinear interpolation of the data at the given fractional rows and columns. Treat the first data point as being at (0.5, 0.5).
    """
    # add 0.5 to center these. e.g., row 0 is centered at 0.5
    row_coords = np.arange(data.shape[0]) + 0.5
    col_coords = np.arange(data.shape[1]) + 0.5
    interp = RegularGridInterpolator(
        (row_coords, col_coords), data, bounds_error=True, fill_value=None
    )
    fractional_rows = np.clip(fractional_rows, 0.5, data.shape[0] - 0.5)
    fractional_cols = np.clip(fractional_cols, 0.5, data.shape[1] - 0.5)
    points = np.array([fractional_rows, fractional_cols]).T
    return cast(NDArray[np.floating[Any]], interp(points))


@permacache(
    "urbanstats/data/gpw/compute_gpw_for_shape_raster_7",
    key_function=dict(shape=lambda x: stable_hash(shapely.to_geojson(x))),
)
def compute_gpw_for_shape_raster(
    shape: Any,
    collect_density: bool = True,
    *,
    resolution_by_radius: dict[int | float, int],
) -> tuple[dict[str, float], dict[str, NDArray[np.floating[Any]]]]:
    glo_by_resolution = {
        resolution: load_full_ghs_zarr(resolution)
        for resolution in set(resolution_by_radius.values())
    }
    if collect_density:
        dens_by_radius = {
            k: compute_circle_density_per_cell_zarr(k, resolution)
            for k, resolution in resolution_by_radius.items()
        }
    row_col_selected_by_resolution = {
        resolution: select_points_in_shape(shape, glo, resolution=resolution)
        for resolution, glo in glo_by_resolution.items()
    }
    pop_by_resolution = {
        resolution: glo[row_col_selected_by_resolution[resolution]]
        for resolution, glo in glo_by_resolution.items()
    }

    # pop_sum = np.nansum(pop)
    pop_sum_by_resolution = {
        resolution: np.nansum(pop) for resolution, pop in pop_by_resolution.items()
    }
    if collect_density:
        dens_selected = {
            k: np.nan_to_num(
                dens_by_radius[k][
                    row_col_selected_by_resolution[resolution_by_radius[k]]
                ],
                nan=0,
            )
            for k in GPW_RADII
        }
        hists = {
            f"gpw_pw_density_histogram_{k}": produce_histogram(
                dens, pop_by_resolution[resolution_by_radius[k]]
            )
            for k, dens in dens_selected.items()
        }
        density = {
            f"gpw_pw_density_{k}": np.nansum(
                pop_by_resolution[resolution_by_radius[k]] * dens
            )
            / pop_sum_by_resolution[resolution_by_radius[k]]
            for k, dens in dens_selected.items()
        }
    else:
        hists = {}
        density = {}

    return (
        dict(gpw_population=pop_sum_by_resolution[max(glo_by_resolution)], **density),
        hists,
    )


def select_points_in_shape(
    shape: Any,
    glo: NDArray[np.floating[Any]],
    *,
    resolution: int,
) -> tuple[NDArray[np.intp], NDArray[np.intp]]:
    lats, lon_starts, lon_ends = rasterize_using_lines(shape, resolution=resolution)
    row_selected, col_selected = exract_raster_points(lats, lon_starts, lon_ends, glo)
    return row_selected, col_selected


@permacache(
    "urbanstats/data/gpw/compute_gpw_data_for_shapefile_7",
    key_function=dict(
        shapefile=lambda x: x.hash_key,
        collect_density=drop_if_equal(True),
        log=drop_if_equal(True),
    ),
)
def compute_gpw_data_for_shapefile(
    shapefile: Any,
    collect_density: bool = True,
    log: bool = True,
    *,
    resolution_by_radius: dict[int | float, int],
) -> tuple[dict[str, list[float]], dict[str, list[NDArray[np.floating[Any]]]]]:
    """
    Compute the GHS-POP data for a shapefile.
    """

    shapes = shapefile.load_file()

    result: dict[str, list[float]] = {
        "gpw_population": [],
        **{f"gpw_pw_density_{k}": [] for k in GPW_RADII},
    }

    result_hists: dict[str, list[NDArray[np.floating[Any]]]] = {
        f"gpw_pw_density_histogram_{k}": [] for k in GPW_RADII
    }

    for longname, shape in tqdm.tqdm(
        zip(shapes.longname, shapes.geometry),
        desc=f"gpw for {shapefile.hash_key}",
        total=len(shapes),
    ):
        if log:
            print(longname)
        res, hists = compute_gpw_for_shape_raster(
            shape,
            collect_density=collect_density,
            resolution_by_radius=resolution_by_radius,
        )
        if log:
            print(res)
        for k, v in res.items():
            result[k].append(v)
        for k, v in hists.items():
            result_hists[k].append(v)

    return result, result_hists
