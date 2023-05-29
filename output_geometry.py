import json
import numpy as np
import shapely
import tqdm.auto as tqdm

from produce_html_page import create_filename
from shapefiles import shapefiles


def convert(geo):
    if isinstance(geo, shapely.geometry.polygon.Polygon):
        x, y = geo.exterior.coords.xy
        coords = np.array([y, x]).T.tolist()
        return [coords]
    assert isinstance(geo, shapely.geometry.multipolygon.MultiPolygon)
    return [x for g in geo for x in convert(g)]


def produce_geometry_json(folder, r):
    fname = create_filename(r.longname)
    with open(f"{folder}/{fname}", "w") as f:
        json.dump(convert(r.geometry), f)


def produce_all_geometry_json(path, valid_names):
    for k in shapefiles:
        print(k)
        table = shapefiles[k].load_file()
        for i in tqdm.trange(table.shape[0]):
            if table.iloc[i].longname in valid_names:
                produce_geometry_json(path, table.iloc[i])
