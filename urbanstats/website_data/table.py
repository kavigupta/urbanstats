from collections import Counter
from functools import lru_cache

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.geometry.shapefiles.shapefiles import shapefiles as shapefiles_list
from urbanstats.statistics.collections_list import (
    statistic_collections as statistic_collections_list,
)
from urbanstats.universe.universe_provider.compute_universes import (
    compute_universes_for_shapefile,
)


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_30",
    key_function=dict(
        sf=lambda x: x.hash_key,
        shapefiles=lambda x: {k: v.hash_key for k, v in x.items()},
        statistic_collections=stable_hash,
    ),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(
    sf, shapefiles, statistic_collections=statistic_collections_list
):
    print("Computing statistics for", sf.hash_key)
    sf_fr = sf.load_file()
    result = sf_fr[["shortname", "longname"] + sf.subset_mask_keys].copy()

    longname_to_universes = compute_universes_for_shapefile(shapefiles, sf)
    result["universes"] = [
        longname_to_universes[longname] for longname in result.longname
    ]

    for k in sf.meta:
        result[k] = sf.meta[k]

    statistics = {}

    for collection in statistic_collections:
        statistics.update(
            collection.compute_statistics_dictionary(
                shapefile=sf,
                existing_statistics={
                    k: statistics.get(k, None) for k in collection.dependencies()
                },
                shapefile_table=sf_fr,
            )
        )

    statistics = pd.DataFrame(statistics)
    result = pd.concat([result, statistics], axis=1)
    return result


def combined_shapefile():
    full = []
    for k in tqdm.tqdm(shapefiles_list, desc="computing statistics"):
        t = compute_statistics_for_shapefile(shapefiles_list[k], shapefiles_list)

        full.append(t)

    full = pd.concat(full)
    full = full.reset_index(drop=True)
    # Simply abolish local government tbh. How is this a thing.
    # https://www.openstreetmap.org/user/Minh%20Nguyen/diary/398893#:~:text=An%20administrative%20area%E2%80%99s%20name%20is%20unique%20within%20its%20immediate%20containing%20area%20%E2%80%93%20false
    # Ban both of these from the database
    full = full[full.longname != "Washington township [CCD], Union County, Ohio, USA"]
    # duplicates = {k: v for k, v in Counter(full.longname).items() if v > 1}
    # assert not duplicates, str(duplicates)
    del full["type_category"]
    return full


def merge_population_estimates(full):
    popu = np.array(full.population)
    popu[np.isnan(popu)] = full.gpw_population[np.isnan(popu)]
    full["best_population_estimate"] = popu
    return full


def sort_shapefile(full):
    full = full.sort_values("longname")
    full = full.sort_values("best_population_estimate", ascending=False, kind="stable")
    full = full[full.best_population_estimate > 0].reset_index(drop=True)
    return full


@lru_cache(maxsize=None)
def shapefile_without_ordinals():
    full = combined_shapefile()
    full = merge_population_estimates(full)
    full = sort_shapefile(full)

    counted = Counter(full.longname)
    duplicates = [name for name, count in counted.items() if count > 1]
    assert not duplicates, f"Duplicate names: {duplicates}"
    return full
