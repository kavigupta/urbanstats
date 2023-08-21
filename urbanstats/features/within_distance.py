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


def census_block_coordinates():
    _, _, _, _, coordinates = load_raw_census()
    census_blocks = gpd.GeoDataFrame(
        geometry=gpd.points_from_xy(
            coordinates[:, 1], coordinates[:, 0], crs="epsg:4326"
        )
    )
    return census_blocks


@permacache(
    "urbanstats/features/within_distance_by_block",
    key_function=dict(feature=lambda x: x.hash_key),
)
def features_within_distance_by_block(feature):
    census_blocks = census_block_coordinates()
    feature = feature.load_as_shapefile()
    per_feature = census_blocks.sjoin(feature, how="left")
    index = np.array(
        per_feature[per_feature.index_right == per_feature.index_right].index
    )
    by_each = np.zeros(census_blocks.shape[0], dtype=np.int)
    np.add.at(by_each, index, 1)
    return by_each


@permacache(
    "urbanstats/features/minimum_distance_by_block",
    key_function=dict(feature=lambda x: x.hash_key),
)
def minimum_distance_by_block(feature):
    census_blocks = census_block_coordinates()
    feature_pts = feature.load_fn()
    distance = np.zeros(census_blocks.shape[0]) + np.nan
    rad = feature.radius_km / 2
    while True:
        mask = np.isnan(distance)
        print(mask.sum())
        if not mask.any():
            break
        distance_within_k = nearest_haversine(census_blocks[mask], feature_pts, rad)
        distance[distance_within_k.index] = distance_within_k
        rad *= 2
    return distance


def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians
    # haversine formula
    lat1, lon1, lat2, lon2 = map(np.array, [lat1, lon1, lat2, lon2])
    dlon = np.radians(lon2) - np.radians(lon1)
    dlat = np.radians(lat2) - np.radians(lat1)
    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2) ** 2
    )
    c = 2 * np.arcsin(np.sqrt(a))
    km = 6371 * c
    return km


def haversine_geometries(geo1, geo2):
    return haversine(geo1.y, geo1.x, geo2.y, geo2.x)


def nearest_haversine(census_blocks, feature_pts, max_distance):
    joined = census_blocks.sjoin(
        shapefile_points_to_radius(max_distance, feature_pts.copy()), how="inner"
    )
    joined["distance"] = haversine_geometries(
        joined.geometry, feature_pts.loc[joined.index_right].geometry
    )
    min_distance = joined["distance"].groupby(joined.index).min()
    return min_distance
