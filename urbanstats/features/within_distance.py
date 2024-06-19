import geopandas as gpd
import numpy as np
import shapely
import tqdm
from permacache import permacache
from scipy.spatial import cKDTree

from census_blocks import load_raw_census
from urbanstats.geometry.ellipse import Ellipse


def xy_to_radius(r, x, y):
    return point_to_radius(r, shapely.geometry.Point(x, y))


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
    "urbanstats/features/minimum_distance_by_block_3",
    key_function=dict(feature=lambda x: x.hash_key),
)
def minimum_distance_by_block(feature):
    print("Computing minimum distance by block", feature.name)
    census_blocks = census_block_coordinates()
    feats = feature.load_fn()
    x1 = census_blocks.geometry.x
    y1 = census_blocks.geometry.y
    x2 = feats.geometry.x
    y2 = feats.geometry.y
    x1, x2, y1, y2 = [np.array(u) for u in (x1, x2, y1, y2)]
    xy1 = np.array([x1, y1]).T
    xy2 = np.array([x2, y2]).T
    tree = cKDTree(xy2)
    _, est_feat_idx = tree.query(xy1, k=1)
    est_feat_pos = xy2[est_feat_idx]
    computed_dist = haversine(y1, x1, *est_feat_pos.T[::-1])
    # maximum radius in degrees possible while covering less than x km
    # clearly this is in the east-west direction
    # x = r * cos(lat) * lon
    # lon = (x / (r * cos(lat)))
    radius_degrees = np.degrees(computed_dist / (rad_earth * np.cos(np.radians(y1))))
    radius_degrees *= 1.1  # safety factor
    bins = np.geomspace(radius_degrees.min(), radius_degrees.max(), 100)
    bins[0] = 0
    bins[-1] = float("inf")
    out = np.zeros(xy1.shape[0]) + np.nan
    pbar = tqdm.tqdm(total=out.shape[0])
    for bin_idx in range(len(bins) - 1):
        in_bin = (bins[bin_idx] <= radius_degrees) & (
            radius_degrees < bins[bin_idx + 1]
        )
        neighbors = tree.query_ball_point(xy1[in_bin], bins[bin_idx + 1])

        def nearest(idx, neighbors):
            d = haversine(y1[idx], x1[idx], *xy2[neighbors].T[::-1])
            return d.min()

        for idx, neigh in zip(np.where(in_bin)[0], neighbors):
            out[idx] = nearest(idx, neigh)
            pbar.update()
    pbar.close()
    return out


rad_earth = 6371


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
    km = rad_earth * c
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
