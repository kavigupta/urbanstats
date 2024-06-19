import json

import numpy as np
import shapely
import tqdm.auto as tqdm

from produce_html_page import create_filename
from shapefiles import shapefiles
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip


def round_floats(obj):
    if isinstance(obj, float):
        return round(obj, 6)
    elif isinstance(obj, dict):
        return dict((k, round_floats(v)) for k, v in obj.items())
    elif isinstance(obj, (list, tuple)):
        return list(map(round_floats, obj))
    return obj


def produce_geometry_json(folder, r):
    fname = create_filename(r.longname, "gz")
    res = shapely.geometry.mapping(r.geometry)
    res = convert_to_protobuf(res)
    write_gzip(res, f"{folder}/{fname}")


def produce_all_geometry_json(path, valid_names):
    for k in shapefiles:
        print(k)
        table = shapefiles[k].load_file()
        for i in tqdm.trange(table.shape[0]):
            if table.iloc[i].longname in valid_names:
                produce_geometry_json(path, table.iloc[i])


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
    f = data_files_pb2.Feature()
    assert isinstance(f_python, dict)
    assert f_python.keys() == {"type", "coordinates"}
    if f_python["type"] == "Polygon":
        f.polygon.CopyFrom(to_protobuf_polygon(f_python))
    elif f_python["type"] == "MultiPolygon":
        f.multipolygon.CopyFrom(to_protobuf_multipolygon(f_python))
    else:
        raise ValueError(f_python["type"])
    return f
