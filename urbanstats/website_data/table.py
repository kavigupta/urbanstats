from collections import Counter
from functools import lru_cache

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from permacache import stable_hash

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.wikipedia.wikidata_sourcer import compute_wikidata_and_wikipedia
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles as shapefiles_list
from urbanstats.statistics.collections_list import (
    statistic_collections as statistic_collections_list,
)
from urbanstats.statistics.statistic_collection import StatisticCollection
from urbanstats.universe.universe_provider.compute_universes import (
    compute_universes_for_shapefile,
)


@permacache_with_remapping_pickle(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_39",
    key_function=dict(
        sf=lambda x: x.hash_key,
        shapefiles=lambda x: {
            k: (v.hash_key, v.universe_provider) for k, v in x.items()
        },
        statistic_collections=stable_hash,
    ),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(
    sf: Shapefile,
    shapefiles: dict[str, Shapefile],
    statistic_collections: tuple[StatisticCollection, ...] = statistic_collections_list,
) -> pd.DataFrame:
    print("Computing statistics for", sf.hash_key)
    sf_fr = sf.load_file()
    result = sf_fr[
        ["shortname", "longname", "longname_sans_date", "start_date", "end_date"]
        + sf.subset_mask_keys
        + list(sf.metadata_columns)
    ].copy()

    longname_to_universes = compute_universes_for_shapefile(shapefiles, sf)
    result["universes"] = [
        longname_to_universes[longname] for longname in result.longname
    ]
    if sf.wikidata_sourcer is not None:
        wikidata, wikipedia = compute_wikidata_and_wikipedia(sf, sf.wikidata_sourcer)
        result["wikidata"] = wikidata
        result["wikipedia_page"] = wikipedia

    for k in sf.meta:
        result[k] = sf.meta[k]

    statistics: dict[str, object] = {}

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

    statistics_df = pd.DataFrame(statistics)
    result = pd.concat([result, statistics_df], axis=1)
    return result


def combined_shapefile() -> pd.DataFrame:
    full: list[pd.DataFrame] = []
    for k in tqdm.tqdm(shapefiles_list, desc="computing statistics"):
        t = compute_statistics_for_shapefile(shapefiles_list[k], shapefiles_list)

        full.append(t)

    result_df = pd.concat(full)
    result_df = result_df.reset_index(drop=True)
    # Simply abolish local government tbh. How is this a thing.
    # https://www.openstreetmap.org/user/Minh%20Nguyen/diary/398893#:~:text=An%20administrative%20area%E2%80%99s%20name%20is%20unique%20within%20its%20immediate%20containing%20area%20%E2%80%93%20false
    # Ban both of these from the database
    result_df = result_df[
        result_df.longname != "Washington township [CCD], Union County, Ohio, USA"
    ]
    # duplicates = {k: v for k, v in Counter(result_df.longname).items() if v > 1}
    # assert not duplicates, str(duplicates)
    del result_df["type_category"]
    return result_df


def merge_population_estimates(full):
    popu = np.array(full.population)
    popu[np.isnan(popu)] = full.population_2021_canada[np.isnan(popu)]
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
    check(full.longname)
    return full


def check(names):
    counted = Counter(names)
    duplicates = [name for name, count in counted.items() if count > 1]
    assert not duplicates, f"Duplicate names: {duplicates}"
    allowed_bad_names = {
        # tbh I don't think this is a unicode issue; I think it might just be the annotator being confused.
        # The underlying name is I think "Umm Siado"
        "Umm Siado?? Urban Center, Sudan"
    }
    bad_names = [x for x in names if "?" in x and x not in allowed_bad_names]
    assert not bad_names, f"Possible unicode errors?: {bad_names}"
