import copy
from functools import lru_cache

import geopandas as gpd
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


@lru_cache(None)
def countries():
    return shapefiles["countries"].load_file()


@permacache("urbanstats/special_cases/simplified_country/row_for_country_2")
def row_for_country(name):
    c = countries()
    row = c[c.longname == name].iloc[0]
    return row


@permacache("urbanstats/special_cases/simplified_country/get_simplified_country_2")
def get_simplified_country(name):
    r = row_for_country(name)
    r = copy.deepcopy(r)
    r.geometry = r.geometry.buffer(1 / 120 * 3)
    return r


def all_simplified_countries(full):
    results = []
    names = set(full.longname)
    for name in countries().longname:
        if name not in names:
            continue
        results.append(get_simplified_country(name))
    return results
