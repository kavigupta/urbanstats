import json
import numpy as np
import shapely
import tqdm.auto as tqdm

from produce_html_page import create_filename
from shapefiles import shapefiles


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
    fname = create_filename(r.longname, "json")
    res = convert(r.geometry)
    res = round_floats(res)
    res = json.dumps(res)
    res = res.replace(", ", ",")
    with open(f"{folder}/{fname}", "w") as f:
        f.write(res)


def produce_all_geometry_json(path, valid_names):
    for k in shapefiles:
        print(k)
        table = shapefiles[k].load_file()
        for i in tqdm.trange(table.shape[0]):
            if table.iloc[i].longname in valid_names:
                produce_geometry_json(path, table.iloc[i])
