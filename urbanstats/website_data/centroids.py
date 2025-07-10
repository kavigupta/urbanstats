import os

import pandas as pd
import tqdm.auto as tqdm

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip


def compute_internal_point(geo):
    geo = geo.buffer(0)
    centroid = geo.centroid
    if geo.contains(centroid):
        return centroid
    if geo.geom_type == "MultiPolygon":
        # If the geometry is a MultiPolygon, we want to find the largest
        # polygon and compute the centroid of that one
        geo = max(list(geo.geoms), key=lambda x: x.area)
        centroid = geo.centroid
        if geo.contains(centroid):
            return centroid
    return geo.representative_point()


@permacache_with_remapping_pickle(
    "urbanstats/website_data/centroids/compute_centroids_4",
    key_function=dict(sf=lambda x: x.hash_key),
    multiprocess_safe=True,
)
def compute_centroids(sf):
    sf_fr = sf.load_file()
    sf_fr = sf_fr.set_index("longname")
    centroids = [
        compute_internal_point(geo)
        for geo in tqdm.tqdm(sf_fr.geometry.values, desc=f"centroids for {sf.hash_key}")
    ]
    return pd.Series(centroids, index=sf_fr.index)


def compute_all_centroids(shapefiles):
    return pd.concat(
        [compute_centroids(sf) for sf in tqdm.tqdm(shapefiles.values())], axis=0
    )


def export_centroids(folder, shapefiles, ordering_info):
    centroids = compute_all_centroids(shapefiles)
    for (universe, typ), idx in tqdm.tqdm(ordering_info.universe_type_to_idx.items()):
        longnames_for_ut = ordering_info.longnames[
            ordering_info.universe_type_masks[:, idx].toarray()[:, 0]
        ]
        longnames_for_ut = sorted(longnames_for_ut)
        cs = centroids.loc[longnames_for_ut]
        path = os.path.join(folder, f"centroids/{universe}_{typ}.gz")
        series = data_files_pb2.PointSeries()
        series.coords.extend([data_files_pb2.Coordinate(lon=c.x, lat=c.y) for c in cs])
        write_gzip(series, path)
