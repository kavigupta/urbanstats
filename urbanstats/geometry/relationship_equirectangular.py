from dataclasses import dataclass

from permacache import permacache
import tqdm.auto as tqdm

"""
Containment and basic utilities for polygons in equirectangular (RLE) space.

RelationshipComputer provides:
- clip_to_land(rle) -> rle: intersect RLE with land mask
- population_of(rle): sum of population grid cells in the RLE
- area_of(rle): area in m² of cells in the RLE (equirectangular)
- contains(a_rle, b_rle): True iff intersection(a, b) has both area and
  population >= 95% of b's (after clipping both to land).

This module also includes helpers to turn an RLE into polygons for plotting.
"""

import math

import geopandas as gpd
import numpy as np
import shapely.geometry as geom

from urbanstats.data.gpw import load_full_ghs_zarr, lon_from_col_idx
from urbanstats.geometry.rasterize import (
    exract_raster_points,
    from_row_idx,
    rasterize_using_lines,
)
from urbanstats.geometry.rle import (
    RESOLUTION_3ARCSEC,
    intersect_rle_runs,
    pad_rle,
    rle_arrays_from_dict,
    rle_bounds,
    rle_dict_from_arrays,
)
from urbanstats.features.within_distance import haversine
from urbanstats.special_cases.coastlines import coastlines_rle

# Approx m per degree at equator; cell side at 3 arcsec = 1/1200 deg
_M_PER_DEG_AT_EQUATOR = 111320
_CELL_SIDE_M = _M_PER_DEG_AT_EQUATOR / RESOLUTION_3ARCSEC
_KM_PER_DEG_LAT = _M_PER_DEG_AT_EQUATOR / 1000.0
BUFFER_PCT = 0.01


def _lat_deg_from_rle_row(row):
    """Latitude (degrees) at center of this RLE row (3 arcsec grid)."""
    return from_row_idx(row + 0.5, RESOLUTION_3ARCSEC)


def _cell_area_m2(row):
    """Area in m² of one cell in this row (equirectangular)."""
    lat_deg = _lat_deg_from_rle_row(row)
    lat_rad = math.radians(lat_deg)
    return _CELL_SIDE_M * _CELL_SIDE_M * math.cos(lat_rad)


def rle_to_polygons(rle, *, resolution=RESOLUTION_3ARCSEC):
    """
    Convert an RLE into a list of shapely Polygons in lon/lat space.

    :param rle: dict {row: [(lon_start, lon_end), ...]} or (rows, lon_starts, lon_ends)
    :param resolution: pixels per degree, defaults to 3 arcsec grid.
    :return: list of shapely.geometry.Polygon
    """
    if not isinstance(rle, dict):
        rle = rle_dict_from_arrays(*rle)

    polygons = []
    half_cell = 0.5 / resolution
    for row, intervals in rle.items():
        lat_center = _lat_deg_from_rle_row(row)
        lat_top = lat_center + half_cell
        lat_bottom = lat_center - half_cell
        for start, end in intervals:
            lon_left = lon_from_col_idx(start, resolution)
            lon_right = lon_from_col_idx(end + 1, resolution)
            polygons.append(geom.box(lon_left, lat_bottom, lon_right, lat_top))
    return polygons


def rle_to_geodataframe(rle, *, resolution=RESOLUTION_3ARCSEC):
    """
    Convert an RLE into a GeoDataFrame (EPSG:4326) for plotting.

    :param rle: dict {row: [(lon_start, lon_end), ...]} or (rows, lon_starts, lon_ends)
    :param resolution: pixels per degree, defaults to 3 arcsec grid.
    :return: GeoDataFrame with one row per RLE interval rectangle.
    """
    polys = rle_to_polygons(rle, resolution=resolution)
    if not polys:
        return gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")
    return gpd.GeoDataFrame(geometry=polys, crs="EPSG:4326")


def plot_rle(rle, ax=None, *, resolution=RESOLUTION_3ARCSEC, **plot_kwargs):
    """
    Quick helper to plot an RLE using matplotlib via GeoPandas.

    Example:
        land = coastlines_rle()[\"rle\"]
        from urbanstats.geometry.relationship_equirectangular import plot_rle
        plot_rle(land)

    :param rle: dict or (rows, lon_starts, lon_ends)
    :param ax: optional matplotlib axis
    :param resolution: pixels per degree
    :param plot_kwargs: forwarded to GeoDataFrame.plot
    :return: axis with the plot
    """
    gdf = rle_to_geodataframe(rle, resolution=resolution)
    default_kwargs = {"linewidth": 0, "alpha": 1, "edgecolor": "none"}
    default_kwargs.update(plot_kwargs)
    if ax is None:
        ax = gdf.plot(**default_kwargs)
    else:
        gdf.plot(ax=ax, **default_kwargs)
    ax.set_aspect("equal")
    return ax


@dataclass
class LandRleSummary:
    land_rle: dict
    buffered_land_rle: dict
    area: float
    population: float
    buffered_bounds: tuple[int, int, int, int]


@permacache(
    "population_density/relationship_equirectangular/land_rle_summaries_for_shapefile_2",
    key_function=dict(shapefile=lambda s: s.hash_key),
)
def land_rle_summaries_for_shapefile(shapefile):
    """
    Compute LandRleSummary for every geometry in a Shapefile object.

    Returns a dict mapping longname to LandRleSummary.
    """
    rc = RelationshipComputer()
    table = shapefile.load_file()
    result = {}
    for _, row in tqdm.tqdm(
        table.iterrows(), total=len(table), desc="compute land RLE summaries"
    ):
        print(row.longname)
        geom = row.geometry
        rows, lon_starts, lon_ends = rasterize_using_lines(
            geom, resolution=RESOLUTION_3ARCSEC
        )
        rle = rle_dict_from_arrays(rows, lon_starts, lon_ends)
        summary = rc.land_rle_summary(rle)
        result[row["longname"]] = summary
    return result


@permacache(
    "population_density/relationship_equirectangular/compute_population_for_rle",
)
def compute_population_for_rle(rle, resolution):
    zarr = load_full_ghs_zarr(resolution)
    rows, lon_starts, lon_ends = rle_arrays_from_dict(rle)
    row_sel, col_sel = exract_raster_points(
        rows, lon_starts, lon_ends, require_positive_in=zarr
    )
    return float(np.nansum(zarr[row_sel, col_sel]))


class RelationshipComputer:
    """
    Computes containment between polygons represented as RLEs at 3 arcsecond
    resolution, clipped to land. Uses area and population of intersection;
    a contains b iff both are >= 95% of b's.
    """

    def __init__(self):
        raw_rle = coastlines_rle()
        # Filter out extreme latitudes where the equirectangular approximation and
        # population raster are not intended to be used.
        filtered_rle = {}
        for row, intervals in raw_rle.items():
            lat = _lat_deg_from_rle_row(row)
            if -85 <= lat <= 85:
                filtered_rle[row] = intervals
        self._land_rle = filtered_rle
        self._resolution = RESOLUTION_3ARCSEC
        assert self._resolution == RESOLUTION_3ARCSEC

    def _to_dict(self, rle):
        """Convert RLE to dict format. Accepts dict or (rows, lon_starts, lon_ends)."""
        if isinstance(rle, dict):
            return rle.get("rle", rle)
        return rle_dict_from_arrays(*rle)

    def clip_to_land(self, rle):
        """Intersect RLE with land mask; returns dict format."""
        return intersect_rle_runs(rle, self._land_rle)

    def population_of(self, rle):
        """Sum population in grid cells covered by the RLE."""
        return compute_population_for_rle(rle, self._resolution)

    def area_of(self, rle):
        """Area in m² of cells covered by the RLE (equirectangular)."""
        d = self._to_dict(rle)
        total = 0.0
        for row, intervals in d.items():
            for s, e in intervals:
                total += (e - s + 1) * _cell_area_m2(row)
        return total

    def intersection_population_and_area(self, a_rle, b_rle):
        """
        Compute population and area for a, b, and their intersection.

        All RLEs are clipped to land before computing metrics.

        :param a_rle: dict {row: [(lon_start, lon_end), ...]} or (rows, lon_starts, lon_ends)
        :param b_rle: dict or arrays
        :return: dict with keys
            - area_a, area_b, area_inter (m²)
            - pop_a, pop_b, pop_inter
        """
        a_land = self.clip_to_land(a_rle)
        b_land = self.clip_to_land(b_rle)
        inter = intersect_rle_runs(a_land, b_land)

        area_inter = self.area_of(inter)
        pop_inter = self.population_of(inter)

        return dict(
            area_inter=area_inter,
            pop_inter=pop_inter,
        )

    def land_rle_summary(self, rle, *, shape=None):
        """
        Compute summary information for an RLE relative to land:

        - land-clipped dict RLE
        - buffered land-clipped dict RLE (using an ellipse radius derived from
          the great-circle diagonal of the unbuffered land-clipped bounding box)
        - population and area of the land-clipped RLE
        - bounding box of the buffered land-clipped RLE
        """
        land_rle = self.clip_to_land(rle)
        area = self.area_of(land_rle)
        population = self.population_of(land_rle)
        min_row, max_row, min_col, max_col = rle_bounds(land_rle)
        # Corner coordinates in degrees (approximate cell centers)
        lat_north = _lat_deg_from_rle_row(min_row)
        lat_south = _lat_deg_from_rle_row(max_row)
        lon_west = lon_from_col_idx(min_col, RESOLUTION_3ARCSEC)
        lon_east = lon_from_col_idx(max_col + 1, RESOLUTION_3ARCSEC)
        # Use NW and SE corners for the diagonal
        buffer_km = haversine(lat_north, lon_west, lat_south, lon_east) * BUFFER_PCT
        # print("buffering with radius (km)", buffer_km)

        # Convert this physical radius back into cell radii in rows/cols.
        # Row spacing (lat) is uniform in degrees, but km per degree of lon
        # depends on latitude, so let the radius depend on y.
        km_per_row = _KM_PER_DEG_LAT / RESOLUTION_3ARCSEC
        ry = buffer_km / km_per_row
        # print("buffering with radius (rows)", ry)

        def radius_fn(y):
            lat_here = _lat_deg_from_rle_row(y)
            cos_lat = math.cos(math.radians(lat_here))
            return ry / cos_lat

        buffered_land_rle = pad_rle(land_rle, radius_fn, ry, shape=shape)
        buffered_bounds = rle_bounds(buffered_land_rle)
        return LandRleSummary(
            land_rle=land_rle,
            buffered_land_rle=buffered_land_rle,
            area=area,
            population=population,
            buffered_bounds=buffered_bounds,
        )
