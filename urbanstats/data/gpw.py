
from collections import defaultdict
from functools import lru_cache
import zipfile
import pandas as pd
import tqdm.auto as tqdm

from permacache import permacache
import numpy as np

import shapely

from urbanstats.features.within_distance import xy_to_radius


GPW_PATH = "named_region_shapefiles/gpw/gpw-v4-population-count-rev11_2020_30_sec_asc.zip"

@lru_cache(maxsize=None)
def load_file(tag):
    with zipfile.ZipFile(GPW_PATH) as f:
        x = f.open(f"gpw_v4_population_count_rev11_2020_30_sec_{tag}.asc").read().decode("utf-8")
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

def load():
    tag = 1
    result = []
    for row in 0, -90:
        result.append([])
        for col in -180, -90, 0, 90:
            f = load_file(tag)
            print(f["xllcorner"], col)
            print(f["yllcorner"], row)
            assert abs(f["xllcorner"] - col) < 0.1
            assert abs(f["yllcorner"] - row) < 0.1

            result[-1].append(f["data"])
            tag += 1
    
    return result

@permacache("urbanstats/data/gpw/load_full")
def load_full():
    result = load()
    result = np.concatenate(result, axis=1)
    result = np.concatenate(result, axis=1)
    assert result.shape == (21600, 43200)
    return result

def lat_from_row_idx(row_idx):
    return 90 - row_idx * 1/120

def lon_from_col_idx(col_idx):
    return -180 + col_idx * 1/120

def col_idx_from_lon(lon):
    return (lon + 180) * 120

def row_idx_from_lat(lat):
    return (90 - lat) * 120

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

            cell = shapely.geometry.box(cell_lon_min, cell_lat_min, cell_lon_max, cell_lat_max)
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

@permacache("urbanstats/data/gpw/compute_circle_density_per_cell")
def compute_circle_density_per_cell(radius, longitude_start=0, longitude_end=None, latitude_start=0, latitude_end=None):
    glo = load_full()
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

def lattice_cells_contained(polygon):
    """
    Return a list of (row, col) tuples of lattice cells that are contained in the polygon.
    """

    lon_min, lat_min, lon_max, lat_max = polygon.bounds
    # pad by 1/120 to make sure we get all cells that are even slightly contained
    lon_min -= 1/120
    lat_min -= 1/120
    lon_max += 1/120
    lat_max += 1/120
    row_min = row_idx_from_lat(lat_max)
    row_max = row_idx_from_lat(lat_min)

    col_min = col_idx_from_lon(lon_min)
    col_max = col_idx_from_lon(lon_max)

    # produce full arrays of row and col indices
    row_idxs = np.arange(int(row_min), int(row_max) + 1)
    col_idxs = np.arange(int(col_min), int(col_max) + 1)
    # product
    row_idxs, col_idxs = np.meshgrid(row_idxs, col_idxs)
    # flatten
    row_idxs = row_idxs.flatten()
    col_idxs = col_idxs.flatten()

    # convert back to lat/lon
    lats = lat_from_row_idx(row_idxs + 0.5)
    lons = lon_from_col_idx(col_idxs + 0.5)

    # convert to shapely points
    points = shapely.geometry.MultiPoint(np.stack([lons, lats], axis=1))

    # check containment
    intersect = polygon.intersection(points)

    lon_selected = np.array([p.x for p in intersect.geoms])
    lat_selected = np.array([p.y for p in intersect.geoms])

    # convert back to row/col indices
    row_selected = row_idx_from_lat(lat_selected) - 0.5
    col_selected = col_idx_from_lon(lon_selected) - 0.5

    row_selected = row_selected.astype(np.int32)
    col_selected = col_selected.astype(np.int32)

    return row_selected, col_selected

@permacache("urbanstats/data/gpw/compute_gpw_data_for_shapefile", key_function=dict(shapefile=lambda x: x.hash_key))
def compute_gpw_data_for_shapefile(shapefile):
    """
    Compute the GPW data for a shapefile.
    """
    glo = load_full()
    dens_2 = compute_circle_density_per_cell(2)
    dens_4 = compute_circle_density_per_cell(4)

    shapes = shapefile.load_file()

    result = {
        "gpw_population": [],
        "gpw_pw_density_2": [],
        "gpw_pw_density_4": [],
    }

    for longname, shape in tqdm.tqdm(zip(shapes.longname, shapes.geometry), desc=f"gpw for {shapefile.hash_key}"):
        print(longname)
        row_selected, col_selected = lattice_cells_contained(shape)
        pop = glo[row_selected, col_selected]
        result["gpw_population"].append(np.nansum(pop))
        result["gpw_pw_density_2"].append(np.nansum(pop * dens_2[row_selected, col_selected]))
        result["gpw_pw_density_4"].append(np.nansum(pop * dens_4[row_selected, col_selected]))
    
    result = pd.DataFrame(result)
    result.index = shapes.index
    result["area"] = shapes.to_crs({"proj": "cea"}).area / 1e6
    result["perimeter"] = shapes.to_crs({"proj": "cea"}).length / 1e3
    result["compactness"] = 4 * np.pi * result.area / result.perimiter**2
    result["gpw_aw_density"] = result["gpw_population"] / result["area"]
    result["gpw_pw_density_2"] = result["gpw_pw_density_2"] / result["gpw_population"]
    result["gpw_pw_density_4"] = result["gpw_pw_density_4"] / result["gpw_population"]

    return result