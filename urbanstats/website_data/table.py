from collections import Counter
from functools import lru_cache

import pandas as pd
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles_for_stats
from urbanstats.special_cases.merge_international import (
    merge_international_and_domestic,
)
from urbanstats.statistics.collections_list import (
    statistic_collections as statistic_collections_list,
)
from urbanstats.universe.annotate_universes import (
    attach_intl_universes,
)


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_28",
    key_function=dict(sf=lambda x: x.hash_key, statistic_collections=stable_hash),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(
    sf, statistic_collections=statistic_collections_list
):
    print("Computing statistics for", sf.hash_key)
    sf_fr = sf.load_file()
    result = sf_fr[["shortname", "longname"]].copy()

    for k in sf.meta:
        result[k] = sf.meta[k]

    statistics = {}

    for collection in statistic_collections:
        passes = collection.for_america() and sf.american
        passes = passes or (collection.for_international() and sf.include_in_gpw)
        if passes:
            statistics.update(
                collection.compute_statistics_dictionary(
                    shapefile=sf,
                    existing_statistics={
                        k: statistics[k] for k in collection.dependencies()
                    },
                    shapefile_table=sf_fr,
                )
            )

    statistics = pd.DataFrame(statistics)
    result = pd.concat([result, statistics], axis=1)
    return result


def american_shapefile():
    full = []
    for k in tqdm.tqdm(shapefiles_for_stats, desc="computing statistics"):
        if not shapefiles_for_stats[k].american:
            continue

        t = compute_statistics_for_shapefile(shapefiles_for_stats[k])

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


def international_shapefile():
    ts = []
    for s in shapefiles_for_stats.values():
        if s.include_in_gpw:
            t = compute_statistics_for_shapefile(s)
            ts.append(t)
    intl = pd.concat(ts)
    # intl = intl[intl.area > 10].copy()
    intl = intl[intl.gpw_population > 0].copy()
    intl = intl.reset_index(drop=True)
    return intl


@lru_cache(maxsize=None)
def shapefile_without_ordinals():
    usa = american_shapefile()
    attach_intl_universes(usa)
    intl = international_shapefile()
    attach_intl_universes(intl)
    full = merge_international_and_domestic(intl, usa)
    return full
