from permacache import permacache

import shapely
import geopandas as gpd
import numpy as np

from census_blocks import load_raw_census
from urbanstats.geometry.ellipse import Ellipse


def point_to_radius(r, p):
    """
    Convert the given point to a circle (in real space) with the given radius.
    """
    ell = Ellipse(r, p.y, p.x)
    shape = shapely.affinity.scale(p.buffer(1), ell.lon_radius, ell.lat_radius)
    return shape


def shapefile_points_to_radius(r, shapefile):
    """
    Convert the given shapefile of points to a shapefile of circles (in real space) with the given radius.
    does so non destructively.
    """
    return gpd.GeoDataFrame(
        shapefile,
        geometry=shapefile.geometry.apply(lambda p: point_to_radius(r, p)),
        crs=shapefile.crs,
    )


@permacache(
    "urbanstats/features/within_distance_by_block",
    key_function=dict(feature=lambda x: x.hash_key),
)
def features_within_distance_by_block(feature):
    _, _, _, _, coordinates = load_raw_census()
    census_blocks = gpd.GeoDataFrame(
        geometry=gpd.points_from_xy(
            coordinates[:, 1], coordinates[:, 0], crs="epsg:4326"
        )
    )
    feature = feature.load_as_shapefile()
    per_feature = census_blocks.sjoin(feature, how="left")
    index = np.array(
        per_feature[per_feature.index_right == per_feature.index_right].index
    )
    by_each = np.zeros(census_blocks.shape[0], dtype=np.int)
    np.add.at(by_each, index, 1)
    return by_each
