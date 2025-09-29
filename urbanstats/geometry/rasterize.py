import numpy as np
import shapely
from permacache import permacache, stable_hash


def to_col_idx(lon, resolution):
    """
    Convert a longitude to a column index in a grid.

    :param lon: Longitude value.
    :param resolution: Resolution of the grid, as pixels per degree.
    :return: Column index corresponding to the given longitude.
    """
    return (lon + 180) * resolution


def to_row_idx(lat, resolution):
    """
    Convert a latitude to a row index in a grid.

    :param lat: Latitude value.
    :param resolution: Resolution of the grid, as pixels per degree.
    :return: Row index corresponding to the given latitude.
    """
    return (90 - lat) * resolution


def from_row_idx(row, resolution):
    """
    Convert a row index to a latitude value.

    :param row: Row index.
    :param resolution: Resolution of the grid, as pixels per degree.
    :return: Latitude value corresponding to the given row index.
    """
    return 90 - row / resolution


@permacache(
    "urbanstats/geometry/rasterize/rasterize_using_lines_6",
    key_function=dict(
        shape=lambda x: stable_hash(shapely.to_geojson(x)),
    ),
)
def rasterize_using_lines(shape, resolution):
    """
    Rasterize a shape onto a grid, using intersections with lines.

    :param shape: The shape to rasterize, as a shapely geometry object.
    :param resolution: The resolution of the grid, as pixels per degree.
    :return: (lat_start, lon_start, lon_end): 3 arrays representing the
        rasterized shape. I.e.,
            (y, x) in shape
                iff
            exists i st lat_start[i] == to_row_idx(y, res) and lon_start[i] <= to_col_idx(x, res) <= lon_end[i]
    """
    multilines = compute_multilines(shape, resolution)
    intersections = multilines.intersection(shape)
    if isinstance(intersections, shapely.geometry.LineString):
        intersections = [intersections]
    elif isinstance(
        intersections,
        (shapely.geometry.MultiLineString, shapely.geometry.GeometryCollection),
    ):
        intersections = list(intersections.geoms)
    else:
        print(type(intersections))
        return [], [], []
    coordinates = [np.array(list(line.coords)) for line in intersections]
    coordinates = [xy for xy in coordinates if len(xy) > 1]
    coordinates = np.array(coordinates)
    if len(coordinates) == 0:
        return [], [], []
    latitudes = coordinates[:, 0, 1]
    longitudes = coordinates[:, :, 0]
    rows = to_row_idx(latitudes, resolution) - 0.5
    rows = np.round(rows).astype(np.int32)
    cols = to_col_idx(longitudes, resolution) - 0.5
    lon_start = np.ceil(cols[:, 0]).astype(np.int32)
    lon_start = np.clip(lon_start, 0, 360 * resolution - 1)
    lon_end = np.floor(cols[:, 1]).astype(np.int32)
    lon_end = np.clip(lon_end, 0, 360 * resolution - 1)
    mask = lon_start <= lon_end
    rows = rows[mask]
    lon_start = lon_start[mask]
    lon_end = lon_end[mask]
    # see notebooks/gpw-alignment.ipynb to confirm these are correct.
    if resolution == 1200:
        # 60 * 60 * 180 // 3 - global_map.shape[0] = 2178, half of this is 1089
        rows = rows - 1089
    elif resolution == 120:
        rows = rows - 1
    return rows, lon_start, lon_end


def compute_multilines(shape, resolution):
    # Get the bounds of the shape
    minx, miny, maxx, maxy = shape.bounds
    minx -= 1 / resolution
    miny -= 1 / resolution
    maxx += 1 / resolution
    maxy += 1 / resolution

    # flipped because the grid is flipped
    yidxs = np.arange(
        min(to_row_idx(miny, resolution) + 1, 180 * resolution - 1),
        max(to_row_idx(maxy, resolution), 0) - 1,
        -1,
        dtype=np.int32,
    )

    # place the lines in the middle of the pixels
    ys = from_row_idx(yidxs + 0.5, resolution)
    lines = [shapely.geometry.LineString([(minx, y), (maxx, y)]) for y in ys]
    multilines = shapely.geometry.MultiLineString(lines)
    return multilines


def exract_raster_points(
    lats, lon_starts, lon_ends, require_positive_in, *, chunk_size=100
):
    if len(lats) == 0:
        return np.array([], dtype=np.int32), np.array([], dtype=np.int32)
    row_selected_all, col_selected_all = [], []
    for i in range(0, len(lats), chunk_size):
        row_selected = np.concatenate(
            [
                np.repeat(np.int32(row_idx), lon_end - lon_start + 1)
                for row_idx, lon_start, lon_end in zip(
                    lats[i : i + chunk_size],
                    lon_starts[i : i + chunk_size],
                    lon_ends[i : i + chunk_size],
                )
            ]
        )
        col_selected = np.concatenate(
            [
                np.arange(lon_start, lon_end + 1, dtype=np.int32)
                for lon_start, lon_end in zip(
                    lon_starts[i : i + chunk_size], lon_ends[i : i + chunk_size]
                )
            ]
        )
        mask = require_positive_in[row_selected, col_selected] > 0
        row_selected = row_selected[mask]
        col_selected = col_selected[mask]
        row_selected_all.append(row_selected)
        col_selected_all.append(col_selected)
    row_selected_all, col_selected_all = np.concatenate(
        row_selected_all
    ), np.concatenate(col_selected_all)
    return row_selected_all, col_selected_all
