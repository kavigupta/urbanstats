from collections import Counter
from functools import lru_cache
from typing import Any, Dict, Sequence

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from permacache import stable_hash

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.wikipedia.wikidata_sourcer import compute_wikidata_and_wikipedia
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles as shapefiles_list
from urbanstats.metadata.metadata_columns_list import (
    metadata_column_providers as default_metadata_column_providers,
)
from urbanstats.statistics.collections_list import (
    statistic_collections as default_statistic_collections,
)
from urbanstats.universe.universe_constants import ZERO_POPULATION_UNIVERSES
from urbanstats.universe.universe_list import all_universes
from urbanstats.universe.universe_provider.compute_universes import (
    compute_universes_for_shapefile,
)
from urbanstats.universe.universe_provider.contained_within import compute_contained_in


@permacache_with_remapping_pickle(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_52",
    key_function=dict(
        sf=lambda x: x.hash_key,
        shapefiles=lambda x: {
            k: (v.hash_key, v.universe_provider) for k, v in x.items()
        },
        metadata_providers=stable_hash,
        statistic_collections=stable_hash,
    ),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(
    sf: Any,
    shapefiles: Dict[str, Any],
    metadata_providers: Any = default_metadata_column_providers,
    statistic_collections: Any = default_statistic_collections,
) -> pd.DataFrame:
    # pylint: disable=too-many-locals
    print("Computing statistics for", sf.hash_key)
    sf_fr = sf.load_file()
    result = sf_fr[sf.available_columns(include_intermediates=False)].copy()

    longname_to_universes = compute_universes_for_shapefile(shapefiles, sf)
    result["universes"] = [
        longname_to_universes[longname] for longname in result.longname
    ]
    if sf.wikidata_sourcer is not None:
        wikidata, wikipedia = compute_wikidata_and_wikipedia(sf, sf.wikidata_sourcer)
        result["wikidata"] = wikidata
        result["wikipedia_page"] = wikipedia

    for metadata_column_provider in metadata_providers:
        computed_columns = metadata_column_provider.compute_metadata_columns(
            shapefile=sf,
            shapefiles=shapefiles,
            shapefile_table=result,
        )
        for computed_column in computed_columns:
            assert len(computed_column.values) == len(result)
            result[computed_column.key] = computed_column.values

    for k in sf.meta:
        result[k] = sf.meta[k]

    statistics: Dict[str, Any] = {}

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
    full = []
    for k in tqdm.tqdm(shapefiles_list, desc="computing statistics"):
        t = compute_statistics_for_shapefile(shapefiles_list[k], shapefiles_list)

        full.append(t)

    full_df = pd.concat(full)
    full_df = full_df.reset_index(drop=True)
    # Simply abolish local government tbh. How is this a thing.
    # https://www.openstreetmap.org/user/Minh%20Nguyen/diary/398893#:~:text=An%20administrative%20area%E2%80%99s%20name%20is%20unique%20within%20its%20immediate%20containing%20area%20%E2%80%93%20false
    # Ban both of these from the database
    full_df = full_df[
        full_df.longname != "Washington township [CCD], Union County, Ohio, USA"
    ]
    # duplicates = {k: v for k, v in Counter(full.longname).items() if v > 1}
    # assert not duplicates, str(duplicates)
    del full_df["type_category"]
    return full_df


def _check_universes(full_df: pd.DataFrame) -> None:
    _check_no_bad_universes(full_df)
    _check_self_contain_universes(full_df)


def _check_self_contain_universes(full_df: pd.DataFrame) -> None:
    by_longname = full_df.set_index("longname")
    for universe in all_universes():
        if universe not in by_longname.index:
            continue
        universes = by_longname.loc[universe].universes
        assert universe in universes, f"{universe} not in {universes}"


def _check_no_bad_universes(full_df: pd.DataFrame) -> None:
    bad_universes_to_longnames = {u: [] for u in ZERO_POPULATION_UNIVERSES}
    for longname, universes in zip(full_df.longname, full_df.universes):
        for universe in universes:
            if universe in bad_universes_to_longnames:
                bad_universes_to_longnames[universe].append(longname)
    bad_universes_to_longnames = {
        k: v for k, v in bad_universes_to_longnames.items() if v
    }
    if bad_universes_to_longnames:
        print("Bad universes found:")
        for universe, longnames in bad_universes_to_longnames.items():
            print(f"Universe: {universe}")
            for longname in longnames:
                print(f"  {longname}")
        raise ValueError("Bad universes found. See output above for details.")


def merge_population_estimates(full: pd.DataFrame) -> pd.DataFrame:
    popu = np.array(full.population)
    popu[np.isnan(popu)] = full.population_2021_canada[np.isnan(popu)]
    popu[np.isnan(popu)] = full.gpw_population[np.isnan(popu)]
    full["best_population_estimate"] = popu
    return full


def sort_shapefile(full: pd.DataFrame) -> pd.DataFrame:
    full = full.sort_values("longname")
    full = full.sort_values("best_population_estimate", ascending=False, kind="stable")
    full = full[full.best_population_estimate > 0].reset_index(drop=True)
    return full


@lru_cache(maxsize=None)
def shapefile_without_ordinals() -> pd.DataFrame:
    full = combined_shapefile()
    full = merge_population_estimates(full)
    full = sort_shapefile(full)
    check(full.longname)
    _check_universes(full)
    return full


def check(names: Sequence[str]) -> None:
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
