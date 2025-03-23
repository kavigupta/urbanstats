import os

import pandas as pd
import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip


@permacache(
    "urbanstats/website_data/centroids/compute_centroids_2",
    key_function=dict(sf=lambda x: x.hash_key),
    multiprocess_safe=True,
)
def compute_centroids(sf):
    sf_fr = sf.load_file()
    sf_fr = sf_fr.set_index("longname")
    centroids = sf_fr.centroid
    return centroids


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
        cs = centroids.loc[longnames_for_ut]
        path = os.path.join(folder, f"centroids/{universe}_{typ}.gz")
        series = data_files_pb2.PointSeries()
        series.coords.extend([data_files_pb2.Coordinate(lon=c.x, lat=c.y) for c in cs])
        write_gzip(series, path)
