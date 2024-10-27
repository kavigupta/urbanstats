from collections import Counter
from functools import lru_cache

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.data.census_blocks import RADII
from urbanstats.data.census_histogram import census_histogram
from urbanstats.data.gpw import compute_gpw_data_for_shapefile
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles_for_stats
from urbanstats.special_cases.merge_international import (
    merge_international_and_domestic,
)
from urbanstats.statistics.collections_list import (
    statistic_collections as statistic_collections_list,
)
from urbanstats.universe.annotate_universes import (
    attach_intl_universes,
    attach_usa_universes,
)


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_24",
    key_function=dict(sf=lambda x: x.hash_key, statistic_collections=stable_hash),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(
    sf, statistic_collections=statistic_collections_list
):
    sf_fr = sf.load_file()
    print(sf)
    result = sf_fr[["shortname", "longname"]].copy()
    result["area"] = sf_fr["geometry"].to_crs({"proj": "cea"}).area / 1e6
    assert (result.longname == sf_fr.longname).all()
    for k in sf.meta:
        result[k] = sf.meta[k]

    for collection in statistic_collections:
        if collection.for_america():
            collection.compute_statistics(sf, result, sf_fr)

    return result


def american_shapefile():
    full = []
    for k in tqdm.tqdm(shapefiles_for_stats, desc="computing statistics"):
        if not shapefiles_for_stats[k].american:
            continue

        t = compute_statistics_for_shapefile(shapefiles_for_stats[k])

        hists = census_histogram(shapefiles_for_stats[k], 2020)
        for dens in RADII:
            t[f"pw_density_histogram_{dens}"] = [
                hists[x][f"ad_{dens}"] if x in hists else np.nan for x in t.longname
            ]

        full.append(t)

    full = pd.concat(full)
    full = full.reset_index(drop=True)
    # Simply abolish local government tbh. How is this a thing.
    # https://www.openstreetmap.org/user/Minh%20Nguyen/diary/398893#:~:text=An%20administrative%20area%E2%80%99s%20name%20is%20unique%20within%20its%20immediate%20containing%20area%20%E2%80%93%20false
    # Ban both of these from the database
    full = full[full.longname != "Washington township [CCD], Union County, Ohio, USA"]
    full = full[full.population > 0].copy()
    duplicates = {k: v for k, v in Counter(full.longname).items() if v > 1}
    assert not duplicates, str(duplicates)
    return full


@permacache(
    "urbanstats/data/gpw/compute_gpw_data_for_shapefile_table_8",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_gpw_data_for_shapefile_table(shapefile):
    # TODO statistic_collections_list as an argument
    shapes = shapefile.load_file()
    result, hists = compute_gpw_data_for_shapefile(shapefile)
    result = pd.DataFrame(result)
    print(shapefile.hash_key, len(result), len(shapes))
    result.index = shapes.index
    result["area"] = shapes.to_crs({"proj": "cea"}).area / 1e6
    for collection in statistic_collections_list:
        if collection.for_international():
            collection.compute_statistics(shapefile, result, shapes)

    result["longname"] = shapes.longname
    result["shortname"] = shapes.shortname

    return result, hists


def international_shapefile():
    ts = []
    for s in shapefiles_for_stats.values():
        if s.include_in_gpw:
            t, hist = compute_gpw_data_for_shapefile_table(s)
            for k in s.meta:
                t[k] = s.meta[k]
            for k, hist_k in hist.items():
                t[k] = hist_k
            ts.append(t)
    intl = pd.concat(ts)
    # intl = intl[intl.area > 10].copy()
    intl = intl[intl.gpw_population > 0].copy()
    intl = intl.reset_index(drop=True)
    return intl


@lru_cache(maxsize=None)
def shapefile_without_ordinals():
    usa = american_shapefile()
    attach_usa_universes(usa)
    intl = international_shapefile()
    attach_intl_universes(intl)
    full = merge_international_and_domestic(intl, usa)
    return full
