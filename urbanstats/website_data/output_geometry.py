import shapely
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.geometry.classify_coordinate_zone import classify_coordinate_zone
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.protobuf import data_files_pb2
from urbanstats.website_data.sharding import build_shards_from_callback


# @permacache(
#     "urbanstats/output_geometry/produce_geometry_json_cached_4",
#     key_function=dict(
#         r=lambda row: stable_hash(
#             [row[x] for x in row.index if x != "geometry"]
#             + [shapely.geometry.mapping(row.geometry)]
#         )
#     ),
# )
def produce_shape_gzip_cached(r):
    """Return Feature proto for row; no disk write."""
    return convert_to_protobuf(r.geometry)


def produce_all_geometry_json(path, valid_names):
    longnames = []
    longname_to_loc = {}  # longname -> (shapefile_key, iloc_idx)
    for k, sf_k in shapefiles.items():
        print(k)
        table = sf_k.load_file()
        for i in tqdm.trange(table.shape[0]):
            row = table.iloc[i]
            if row.longname in valid_names:
                longnames.append(row.longname)
                longname_to_loc[row.longname] = (k, i)

    def get_feature(longname):
        k, i = longname_to_loc[longname]
        table = shapefiles[k].load_file()
        return produce_shape_gzip_cached(table.iloc[i])

    return build_shards_from_callback(path, "shape", longnames, get_feature)


def to_protobuf_polygon(f_python):
    f = data_files_pb2.Polygon()
    assert isinstance(f_python, dict)
    assert f_python.keys() == {"type", "coordinates"}, f_python.keys()
    assert f_python["type"] == "Polygon"
    assert isinstance(f_python["coordinates"], (list, tuple)), f_python
    for ring_python in f_python["coordinates"]:
        assert isinstance(ring_python, (list, tuple))
        ring = f.rings.add()
        for coord_python in ring_python:
            coord = ring.coords.add()
            assert isinstance(coord_python, (list, tuple)) and len(coord_python) == 2
            coord.lon, coord.lat = coord_python
    return f


def to_protobuf_multipolygon(f_python):
    f = data_files_pb2.MultiPolygon()
    assert isinstance(f_python, dict)
    assert f_python.keys() == {"type", "coordinates"}
    assert f_python["type"] == "MultiPolygon"
    for polygon_python in f_python["coordinates"]:
        f.polygons.append(
            to_protobuf_polygon({"type": "Polygon", "coordinates": polygon_python})
        )
    return f


def convert_to_protobuf(f_python):
    zones, f_python = classify_coordinate_zone(f_python)
    center_lon = f_python.centroid.x
    f_python = shapely.geometry.mapping(f_python)

    f = data_files_pb2.Feature()
    assert isinstance(f_python, dict)
    f.zones.extend(zones)
    f.center_lon = center_lon
    assert f_python.keys() == {"type", "coordinates"}
    if f_python["type"] == "Polygon":
        f.polygon.CopyFrom(to_protobuf_polygon(f_python))
    elif f_python["type"] == "MultiPolygon":
        f.multipolygon.CopyFrom(to_protobuf_multipolygon(f_python))
    else:
        raise ValueError(f_python["type"])
    return f
