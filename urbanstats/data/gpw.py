import numpy as np
import shapely
import tqdm.auto as tqdm
from geotiff import GeoTiff
from permacache import drop_if_equal, permacache, stable_hash

from urbanstats.data.census_blocks import RADII
from urbanstats.geometry.ellipse import Ellipse
from urbanstats.utils import compute_bins

GPW_RADII = [k for k in RADII if k >= 1]

GPW_PATH = (
    "gpw_v4_population_count_rev11_2020_30_sec_",
    "named_region_shapefiles/gpw/gpw-v4-population-count-rev11_2020_30_sec_asc.zip",
)

GPW_LAND_PATH = (
    "gpw_v4_land_water_area_rev11_landareakm_30_sec_",
    "named_region_shapefiles/gpw/gpw-v4-land-water-area-rev11_landareakm_30_sec_asc.zip",
)

CELLS_PER_DEGREE = 120


@permacache("urbanstats/data/gpw/load_full_ghs_2")
def load_full_ghs():
    path = "named_region_shapefiles/gpw/GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0.tif"
    return load_ghs_from_path(path)


def load_ghs_from_path(path):
    gt = GeoTiff(path)
    ghs = np.array(gt.read())
    popu = np.zeros((180 * 120, 360 * 120), dtype=np.float32)
    min_lon, max_lat = gt.get_coords(0, 0)
    j_off = round((min_lon - (-180)) * 120)
    i_off = round((90 - max_lat) * 120)
    assert j_off == -1
    popu[i_off : i_off + ghs.shape[0]] = ghs[:, 1:-1]
    return popu


def lat_from_row_idx(row_idx):
    return 90 - row_idx * 1 / 120


def lon_from_col_idx(col_idx):
    return -180 + col_idx * 1 / 120


def col_idx_from_lon(lon):
    return (lon + 180) * 120


def row_idx_from_lat(lat):
    return (90 - lat) * 120


def grid_area_km(lat):
    return 1 / 120 * 1 / 120 * 111**2 * np.cos(lat * np.pi / 180)


def compute_cell_overlaps_with_circle_grid_array(radius, row_idx, *, grid_size):
    x, y = lon_from_col_idx(0.5), lat_from_row_idx(row_idx + 0.5)
    ell = Ellipse(radius, y, x)
    yr, xr = ell.lat_radius, ell.lon_radius
    xr_idxs, yr_idxs = [
        int(np.ceil(radius * CELLS_PER_DEGREE + 2)) for radius in (xr, yr)
    ]
    xs, ys = [np.arange(-radius, radius + 1) for radius in (xr_idxs, yr_idxs)]
    # placing a grid off-index, e.g., if grid size is 3, we do 1/6, 3/6, 5/6.
    within_cell_grid = np.linspace(1 / grid_size / 2, 1 - 1 / grid_size / 2, grid_size)
    xs_specific, ys_specific = [
        (np.repeat(seq[:, None], grid_size, axis=1) + within_cell_grid)
        for seq in (xs, ys)
    ]
    xs_specific, ys_specific = [
        (seq - 0.5) / CELLS_PER_DEGREE for seq in (xs_specific, ys_specific)
    ]
    dist_from_center = (xs_specific[..., None, None] / xr) ** 2 + (
        ys_specific[None, None] / yr
    ) ** 2
    attributable_to_each = (dist_from_center <= 1).mean((1, 3))
    return xs, ys, attributable_to_each


def compute_cell_overlaps_with_circle(radius, row_idx, grid_size=100):
    xs, ys, b_arr = compute_cell_overlaps_with_circle_grid_array(
        radius, row_idx, grid_size=grid_size
    )
    x_idxs, y_idxs = np.where(b_arr)
    return {
        (y + row_idx, x): amount
        for (x, y, amount) in zip(xs[x_idxs], ys[y_idxs], b_arr[x_idxs, y_idxs])
    }


@permacache("urbanstats/data/gpw/compute_circle_density_per_cell_2.5")
def compute_circle_density_per_cell(
    radius, longitude_start=0, longitude_end=None, latitude_start=0, latitude_end=None
):
    glo = load_full_ghs()
    glo = glo[:, longitude_start:longitude_end]
    glo_zero = np.nan_to_num(glo, 0)
    [row_idxs] = np.where((glo_zero[latitude_start:latitude_end] != 0).any(axis=1))
    row_idxs += latitude_start
    out = np.zeros_like(glo_zero)
    out = sum_in_radius(radius, glo_zero, row_idxs, out)
    out = out / (np.pi * radius**2)
    return out


def sum_in_radius(radius, global_map, row_idxs, out):
    for row_idx in tqdm.tqdm(row_idxs, desc=f"Computing gpw density for {radius} km"):
        overlaps = compute_cell_overlaps_with_circle(radius, row_idx, grid_size=40)
        for (source_row, off), weight in overlaps.items():
            out[row_idx] += np.roll(global_map[source_row], -off) * weight
    return out


def filter_lat_lon_direct(polygon, row_idxs, col_idxs):
    # convert back to lat/lon
    lats = lat_from_row_idx(row_idxs + 0.5)
    lons = lon_from_col_idx(col_idxs + 0.5)

    # convert to shapely points
    points = shapely.geometry.MultiPoint(np.stack([lons, lats], axis=1))

    # check containment
    intersect = polygon.intersection(points)

    # check if empty point
    if intersect.is_empty:
        return np.array([], dtype=np.int32), np.array([], dtype=np.int32)

    pts = (
        list(intersect.geoms)
        if isinstance(intersect, shapely.geometry.MultiPoint)
        else [intersect]
    )

    lon_selected = np.array([p.x for p in pts])
    lat_selected = np.array([p.y for p in pts])

    # convert back to row/col indices
    row_selected = row_idx_from_lat(lat_selected) - 0.5
    col_selected = col_idx_from_lon(lon_selected) - 0.5

    row_selected = row_selected.astype(np.int32)
    col_selected = col_selected.astype(np.int32)

    return row_selected, col_selected


def filter_lat_lon(polygon, row_idxs, col_idxs, chunk_size=10**5):
    """
    Filter a list of row/col indices to only those that are contained in the polygon.
    """

    if len(row_idxs) < chunk_size:
        # just to avoid the progress bar
        return filter_lat_lon_direct(polygon, row_idxs, col_idxs)

    row_selected = []
    col_selected = []

    for i in tqdm.tqdm(range(0, len(row_idxs), chunk_size)):
        sl = slice(i, i + chunk_size)
        row_selected_chunk, col_selected_chunk = filter_lat_lon_direct(
            polygon, row_idxs[sl], col_idxs[sl]
        )
        row_selected.append(row_selected_chunk)
        col_selected.append(col_selected_chunk)

    row_selected = np.concatenate(row_selected)
    col_selected = np.concatenate(col_selected)

    return row_selected, col_selected


def lattice_cells_contained(glo, polygon):
    """
    Return a list of (row, col) tuples of lattice cells that are contained in the polygon.
    """

    row_min, row_max, col_min, col_max = get_cell_bounds(polygon)

    # produce full arrays of row and col indices
    row_idxs = np.arange(max(0, int(row_min)), min(int(row_max) + 1, glo.shape[0]))
    col_idxs = np.arange(max(0, int(col_min)), min(int(col_max) + 1, glo.shape[1]))
    # product
    # no idea why this is necessary
    # pylint: disable=unpacking-non-sequence
    row_idxs, col_idxs = np.meshgrid(row_idxs, col_idxs)
    # filter
    glo_vals = glo[row_idxs, col_idxs]
    mask = ~np.isnan(glo_vals) & (glo_vals > 0)
    row_idxs = row_idxs[mask]
    col_idxs = col_idxs[mask]
    # flatten
    row_idxs = row_idxs.flatten()
    col_idxs = col_idxs.flatten()

    row_selected, col_selected = filter_lat_lon(polygon, row_idxs, col_idxs)

    return row_selected, col_selected


def get_cell_bounds(polygon):
    lon_min, lat_min, lon_max, lat_max = polygon.bounds
    # pad by 1/120 to make sure we get all cells that are even slightly contained
    lon_min -= 1 / 120
    lat_min -= 1 / 120
    lon_max += 1 / 120
    lat_max += 1 / 120
    row_min = row_idx_from_lat(lat_max)
    row_max = row_idx_from_lat(lat_min)

    col_min = col_idx_from_lon(lon_min)
    col_max = col_idx_from_lon(lon_max)
    return row_min, row_max, col_min, col_max


def produce_histogram(density_data, population_data):
    """
    Produce a histogram of population data with the given density data.
    """
    density_data = np.log(density_data) / np.log(10)
    density_data = density_data.flatten()
    population_data = population_data.flatten()

    return compute_bins(density_data, population_data, bin_size=0.1)


def compute_gpw_weighted_for_shape(
    shape, glo_pop, gridded_statistics, *, do_histograms
):
    row_selected, col_selected = lattice_cells_contained(glo_pop, shape)
    pop = glo_pop[row_selected, col_selected]
    result = {}
    hists = {}
    for name, (data, pop_weight) in gridded_statistics.items():
        data_selected = data[row_selected, col_selected]
        if pop_weight:
            result[name] = np.nansum(pop * data_selected) / np.nansum(pop)
        else:
            result[name] = np.nansum(data_selected)
        if do_histograms:
            assert pop_weight, "pop_weight is required for histograms"
            hists[name] = produce_histogram(data_selected, pop)
    return result, hists


@permacache(
    "urbanstats/data/gpw/compute_gpw_for_shape_4.6",
    key_function=dict(
        shape=lambda x: stable_hash(shapely.to_geojson(x)),
        collect_density=drop_if_equal(True),
    ),
)
def compute_gpw_for_shape(shape, collect_density=True):
    glo = load_full_ghs()
    if collect_density:
        dens_by_radius = {k: compute_circle_density_per_cell(k) for k in GPW_RADII}
    row_selected, col_selected = lattice_cells_contained(glo, shape)
    pop = glo[row_selected, col_selected]

    pop_sum = np.nansum(pop)
    if collect_density:
        dens_selected = {
            k: dens_by_radius[k][row_selected, col_selected] for k in GPW_RADII
        }
        hists = {
            f"gpw_pw_density_histogram_{k}": produce_histogram(dens, pop)
            for k, dens in dens_selected.items()
        }
        density = {
            f"gpw_pw_density_{k}": np.nansum(pop * dens) / pop_sum
            for k, dens in dens_selected.items()
        }
    else:
        hists = {}
        density = {}

    return dict(gpw_population=pop_sum, **density), hists


@permacache(
    "urbanstats/data/gpw/compute_gpw_data_for_shapefile_6.6",
    key_function=dict(
        shapefile=lambda x: x.hash_key,
        collect_density=drop_if_equal(True),
        log=drop_if_equal(True),
    ),
)
def compute_gpw_data_for_shapefile(shapefile, collect_density=True, log=True):
    """
    Compute the GHS-POP data for a shapefile.
    """

    shapes = shapefile.load_file()

    result = {"gpw_population": [], **{f"gpw_pw_density_{k}": [] for k in GPW_RADII}}

    result_hists = {f"gpw_pw_density_histogram_{k}": [] for k in GPW_RADII}

    for longname, shape in tqdm.tqdm(
        zip(shapes.longname, shapes.geometry),
        desc=f"gpw for {shapefile.hash_key}",
        total=len(shapes),
    ):
        if log:
            print(longname)
        res, hists = compute_gpw_for_shape(shape, collect_density=collect_density)
        if log:
            print(res)
        for k, v in res.items():
            result[k].append(v)
        for k, v in hists.items():
            result_hists[k].append(v)

    return result, result_hists
