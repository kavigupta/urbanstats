from typing import Any, Dict, Set

import shapely
import tqdm.auto as tqdm

from urbanstats.geometry.classify_coordinate_zone import classify_coordinate_zone
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.protobuf import data_files_pb2
from urbanstats.website_data.sharding import build_shards_from_callback


def produce_all_geometry_json(
    path: str, valid_names: Set[str], symlinks: Dict[str, str]
) -> None:
    geos = {}
    for sf_k in tqdm.tqdm(shapefiles.values(), desc="Loading shapefiles"):
        table = sf_k.load_file()
        geos.update(dict(zip(table.longname, table.geometry)))

    def get_feature(longname: str) -> data_files_pb2.Feature:
        return convert_to_protobuf(geos[longname])

    missing = set(valid_names) - set(geos.keys())
    if missing:
        raise ValueError(f"Missing geometries for {missing}")

    build_shards_from_callback(
        path, "shape", list(valid_names), get_feature, symlinks=symlinks
    )


def to_protobuf_polygon(f_python: Dict[str, Any]) -> data_files_pb2.Polygon:
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


def to_protobuf_multipolygon(f_python: Dict[str, Any]) -> data_files_pb2.MultiPolygon:
    f = data_files_pb2.MultiPolygon()
    assert isinstance(f_python, dict)
    assert f_python.keys() == {"type", "coordinates"}
    assert f_python["type"] == "MultiPolygon"
    for polygon_python in f_python["coordinates"]:
        f.polygons.append(
            to_protobuf_polygon({"type": "Polygon", "coordinates": polygon_python})
        )
    return f


def convert_to_protobuf(f_python: Any) -> data_files_pb2.Feature:
    zones, f_python_sh = classify_coordinate_zone(f_python)
    center_lon = f_python_sh.centroid.x
    f_python_map = shapely.geometry.mapping(f_python_sh)

    f = data_files_pb2.Feature()
    assert isinstance(f_python_map, dict)
    f.zones.extend(zones)
    f.center_lon = center_lon
    assert f_python_map.keys() == {"type", "coordinates"}
    if f_python_map["type"] == "Polygon":
        f.polygon.CopyFrom(to_protobuf_polygon(f_python_map))
    elif f_python_map["type"] == "MultiPolygon":
        f.multipolygon.CopyFrom(to_protobuf_multipolygon(f_python_map))
    else:
        raise ValueError(f_python_map["type"])
    return f
