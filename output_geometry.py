import json
import gzip

import numpy as np
import shapely
import tqdm.auto as tqdm

from produce_html_page import create_filename
from shapefiles import shapefiles

from urbanstats.protobuf import data_files_pb2

def round_floats(obj):
    if isinstance(obj, float):
        return round(obj, 6)
    elif isinstance(obj, dict):
        return dict((k, round_floats(v)) for k, v in obj.items())
    elif isinstance(obj, (list, tuple)):
        return list(map(round_floats, obj))
    return obj


def convert(geo):
    # convert to geojson
    if isinstance(geo, shapely.geometry.polygon.Polygon):
        geo = [geo]
    if isinstance(geo, shapely.geometry.multipolygon.MultiPolygon):
        geo = list(geo.geoms)
    return [shapely.geometry.mapping(g) for g in geo]


def produce_geometry_json(folder, r):
    fname = create_filename(r.longname, "gz")
    res = convert(r.geometry)
    res = convert_to_protobuf(res)
    with gzip.open(f"{folder}/{fname}", "wb") as f:
        f.write(res.SerializeToString())

def produce_all_geometry_json(path, valid_names):
    for k in shapefiles:
        print(k)
        table = shapefiles[k].load_file()
        for i in tqdm.trange(table.shape[0]):
            if table.iloc[i].longname in valid_names:
                produce_geometry_json(path, table.iloc[i])

def convert_to_protobuf(fc_python):
    assert isinstance(fc_python, list)
    fc = data_files_pb2.FeatureCollection()
    for f_python in fc_python:
        assert isinstance(f_python, dict)
        assert f_python.keys() == {"type", "coordinates"}
        f = fc.features.add()
        f.type = f_python["type"]
        assert isinstance(f_python["coordinates"], (list, tuple)), f_python
        for ring_python in f_python["coordinates"]:
            assert isinstance(ring_python, (list, tuple))
            ring = f.rings.add()
            for coord_python in ring_python:
                coord = ring.coords.add()
                assert isinstance(coord_python, (list, tuple)) and len(coord_python) == 2
                coord.lon, coord.lat = coord_python
    return fc