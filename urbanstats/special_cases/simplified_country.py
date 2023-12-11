import copy
from functools import lru_cache
from permacache import permacache
import geopandas as gpd
from output_geometry import produce_geometry_json

from shapefiles import shapefiles

@lru_cache(None)
def counties():
    return shapefiles["countries"].load_file()

@permacache("urbanstats/special_cases/simplified_country/row_for_country")
def row_for_country(name):
    c = counties()
    row = c[c.longname == name].iloc[0]
    return row


@permacache("urbanstats/special_cases/simplified_country/get_simplified_country")
def get_simplified_country(name):
    r = row_for_country(name)
    r = filter_small_islands(r)
    return r

def filter_small_islands(r):
    r = copy.deepcopy(r)
    g = gpd.GeoDataFrame([r]).simplify(1/120 * 3)
    polys = gpd.GeoSeries(g.geometry.apply(lambda g: 
                                           g.geoms if g.geom_type == "MultiPolygon" else [g]
                                           ).explode())
    if len(polys) < 100:
        return r
    a = polys.set_crs("epsg:4326").to_crs({"proj": "cea"}).area
    min_area = 10 * 1000**2
    if a.max() < min_area:
        min_area = a.max() / 10
    r.geometry = (
        polys[a > min_area]
        .buffer(0)
        .unary_union
    )
    return r

def all_simplified_countries(full, path):
    names = set(full.longname)
    for name in counties().longname:
        if name not in names:
            continue
        print(name)
        produce_geometry_json(path, get_simplified_country(name))
