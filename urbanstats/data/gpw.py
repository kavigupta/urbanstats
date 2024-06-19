import zipfile
from collections import defaultdict
from functools import lru_cache

import numpy as np
import pandas as pd
import shapely
import tqdm.auto as tqdm
from geotiff import GeoTiff
from permacache import permacache, stable_hash

from urbanstats.features.within_distance import xy_to_radius

GPW_PATH = (
    "gpw_v4_population_count_rev11_2020_30_sec_",
    "named_region_shapefiles/gpw/gpw-v4-population-count-rev11_2020_30_sec_asc.zip",
)

GPW_LAND_PATH = (
    "gpw_v4_land_water_area_rev11_landareakm_30_sec_",
    "named_region_shapefiles/gpw/gpw-v4-land-water-area-rev11_landareakm_30_sec_asc.zip",
)


@lru_cache(maxsize=None)
def load_file(prefix, path, tag):
    with zipfile.ZipFile(path) as f:
        x = f.open(f"{prefix}{tag}.asc").read().decode("utf-8")
        x = x.split("\r\n")

    assert x.pop(-1) == ""

    ncols = int(x[0].split(" ")[-1])
    nrows = int(x[1].split(" ")[-1])
    xllcorner = float(x[2].split(" ")[-1])
    yllcorner = float(x[3].split(" ")[-1])
    cellsize = float(x[4].split(" ")[-1])
    NODATA_value = float(x[5].split(" ")[-1])

    data_rows = x[6:]
    assert all(row[-1] == " " for row in data_rows)
    data_rows = [row[:-1] for row in data_rows]
    assert len(data_rows) == nrows, (len(data_rows), nrows)
    assert len(data_rows[0].split(" ")) == ncols, (len(data_rows[0].split(" ")), ncols)

    data = np.zeros((nrows, ncols), dtype=np.float32)
    for i, row in enumerate(tqdm.tqdm(data_rows)):
        data[i] = np.array(row.split(" ")).astype(np.float32)

    data[data == NODATA_value] = np.nan

    return dict(
        ncols=ncols,
        nrows=nrows,
        xllcorner=xllcorner,
        yllcorner=yllcorner,
        cellsize=cellsize,
        data=data,
    )


def load(prefix, path):
    tag = 1
    result = []
    for row in 0, -90:
        result.append([])
        for col in -180, -90, 0, 90:
            f = load_file(prefix, path, tag)
            print(f["xllcorner"], col)
            print(f["yllcorner"], row)
            assert abs(f["xllcorner"] - col) < 0.1
            assert abs(f["yllcorner"] - row) < 0.1

            result[-1].append(f["data"])
            tag += 1

    return result


def load_concatenated(prefix, path):
    result = load(prefix, path)
    result = np.concatenate(result, axis=1)
    result = np.concatenate(result, axis=1)
    assert result.shape == (21600, 43200)
    return result


@permacache("urbanstats/data/gpw/load_full_ghs_2")
def load_full_ghs():
    gt = GeoTiff(
        "named_region_shapefiles/gpw/GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0.tif"
    )
    ghs = np.array(gt.read())
    popu = np.zeros((180 * 120, 360 * 120), dtype=np.float32)
    min_lon, max_lat = gt.get_coords(0, 0)
    j_off = round((min_lon - (-180)) * 120)
    i_off = round((90 - max_lat) * 120)
    assert j_off == -1
    popu[i_off : i_off + ghs.shape[0]] = ghs[:, 1:-1]
    return popu


@permacache("urbanstats/data/gpw/load_full")
def load_full():
    return load_concatenated(*GPW_PATH)


@permacache("urbanstats/data/gpw/load_full_landarea")
def load_full_landarea():
    return load_concatenated(*GPW_LAND_PATH)


def lat_from_row_idx(row_idx):
    return 90 - row_idx * 1 / 120


def lon_from_col_idx(col_idx):
    return -180 + col_idx * 1 / 120


def col_idx_from_lon(lon):
    return (lon + 180) * 120


def row_idx_from_lat(lat):
    return (90 - lat) * 120


def grid_area_km(lat):
    return 1 / 120 * 1 / 120 * 111 ** 2 * np.cos(lat * np.pi / 180)


def cell_overlaps(shape):
    """
    Take a shape (in lat/lon coordinates) and return a dictionary from (row, col) to the fraction of the cell that overlaps the shape.
    """

    lon_min, lat_min, lon_max, lat_max = shape.bounds
    row_min = row_idx_from_lat(lat_max)
    row_max = row_idx_from_lat(lat_min)

    col_min = col_idx_from_lon(lon_min)
    col_max = col_idx_from_lon(lon_max)

    result = {}

    for row_idx in range(int(row_min), int(row_max) + 1):
        for col_idx in range(int(col_min), int(col_max) + 1):
            cell_lat_min = lat_from_row_idx(row_idx)
            cell_lat_max = lat_from_row_idx(row_idx + 1)
            cell_lon_min = lon_from_col_idx(col_idx)
            cell_lon_max = lon_from_col_idx(col_idx + 1)

            cell = shapely.geometry.box(
                cell_lon_min, cell_lat_min, cell_lon_max, cell_lat_max
            )
            intersection = cell.intersection(shape)
            if intersection.is_empty or cell.area == 0:
                continue
            result[(row_idx, col_idx)] = intersection.area / cell.area

    return result


def compute_full_cell_overlaps_with_circle(radius, row_idx, num_grid=10):
    result = defaultdict(float)
    for offx in np.linspace(0, 1, num_grid + 1)[:-1]:
        for offy in np.linspace(0, 1, num_grid + 1)[:-1]:
            lat = lat_from_row_idx(row_idx + offy)
            lon = lon_from_col_idx(offx)
            circle = xy_to_radius(radius, lon, lat)
            for (r, c), frac in cell_overlaps(circle).items():
                result[(r, c)] += frac / (num_grid ** 2)
    return result


@permacache("urbanstats/data/gpw/compute_circle_density_per_cell_2")
def compute_circle_density_per_cell(
    radius, longitude_start=0, longitude_end=None, latitude_start=0, latitude_end=None
):
    glo = load_full_ghs()
    glo = glo[:, longitude_start:longitude_end]
    glo_zero = np.nan_to_num(glo, 0)
    out = np.zeros_like(glo_zero)
    [row_idxs] = np.where((glo_zero[latitude_start:latitude_end] != 0).any(axis=1))
    row_idxs += latitude_start
    for row_idx in tqdm.tqdm(row_idxs):
        overlaps = compute_full_cell_overlaps_with_circle(radius, row_idx)
        for (source_row, off), weight in overlaps.items():
            out[row_idx] += np.roll(glo_zero[source_row], -off) * weight
    out = out / (np.pi * radius ** 2)
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


def filter_lat_lon(polygon, row_idxs, col_idxs, chunk_size=10 ** 5):
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

    # produce full arrays of row and col indices
    row_idxs = np.arange(max(0, int(row_min)), min(int(row_max) + 1, glo.shape[0]))
    col_idxs = np.arange(max(0, int(col_min)), min(int(col_max) + 1, glo.shape[1]))
    # product
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


@permacache(
    "urbanstats/data/gpw/compute_gpw_for_shape_2",
    key_function=dict(shape=lambda x: stable_hash(shapely.to_geojson(x))),
)
def compute_gpw_for_shape(shape):
    glo = load_full_ghs()
    dens_1 = compute_circle_density_per_cell(1)
    dens_2 = compute_circle_density_per_cell(2)
    dens_4 = compute_circle_density_per_cell(4)
    row_selected, col_selected = lattice_cells_contained(glo, shape)
    pop = glo[row_selected, col_selected]

    pop_sum = np.nansum(pop)
    dens_1_sum = np.nansum(pop * dens_1[row_selected, col_selected])
    dens_2_sum = np.nansum(pop * dens_2[row_selected, col_selected])
    dens_4_sum = np.nansum(pop * dens_4[row_selected, col_selected])

    return dict(
        gpw_population=pop_sum,
        gpw_pw_density_1=dens_1_sum / pop_sum,
        gpw_pw_density_2=dens_2_sum / pop_sum,
        gpw_pw_density_4=dens_4_sum / pop_sum,
    )


@permacache(
    "urbanstats/data/gpw/compute_gpw_data_for_shapefile_3",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_gpw_data_for_shapefile(shapefile):
    """
    Compute the GHS-POP data for a shapefile.
    """

    shapes = shapefile.load_file()

    result = {
        "gpw_population": [],
        "gpw_pw_density_1": [],
        "gpw_pw_density_2": [],
        "gpw_pw_density_4": [],
    }

    for longname, shape in tqdm.tqdm(
        zip(shapes.longname, shapes.geometry),
        desc=f"gpw for {shapefile.hash_key}",
        total=len(shapes),
    ):
        print(longname)
        res = compute_gpw_for_shape(shape)
        print(res)
        for k, v in res.items():
            result[k].append(v)

    return result


@permacache(
    "urbanstats/data/gpw/compute_gpw_data_for_shapefile_table_4",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_gpw_data_for_shapefile_table(shapefile):
    shapes = shapefile.load_file()
    result = compute_gpw_data_for_shapefile(shapefile)
    result = pd.DataFrame(result)
    print(len(result), len(shapes))
    result.index = shapes.index
    result["area"] = shapes.to_crs({"proj": "cea"}).area / 1e6
    result["perimeter"] = shapes.to_crs({"proj": "cea"}).length / 1e3
    result["compactness"] = 4 * np.pi * result.area / result.perimeter ** 2
    result["gpw_aw_density"] = result["gpw_population"] / result["area"]
    result["gpw_pw_density_2"] = result["gpw_pw_density_2"]
    result["gpw_pw_density_4"] = result["gpw_pw_density_4"]
    result["longname"] = shapes.longname
    result["shortname"] = shapes.shortname

    return result
