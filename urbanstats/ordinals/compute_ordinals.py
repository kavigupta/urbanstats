from dataclasses import dataclass
from cached_property import cached_property
from typing import Dict, List
import numpy as np
import pandas as pd

from permacache import permacache

import tqdm.auto as tqdm

from urbanstats.universe.annotate_universes import all_universes
from urbanstats.utils import hash_full_table


population_column = "best_population_estimate"
stable_sort_column = "longname"


@dataclass
class OrdinalsForTypeAndColumnInUniverse:
    values: pd.Series
    ordinals: pd.Series
    percentiles_by_population: pd.Series

    @cached_property
    def ordered_longnames(self):
        return list(self.ordinals.sort_values(0).index)

    @property
    def ordered_values(self):
        return np.array(self.values.loc[self.ordered_longnames][0])

    @property
    def ordered_percentiles_by_population(self):
        return np.array(self.percentiles_by_population.loc[self.ordered_longnames])


@dataclass
class OrdinalsForTypeInUniverse:
    # key_column -> OrdinalsForColumnInUniverse
    ordinals_by_stat: Dict[str, OrdinalsForTypeAndColumnInUniverse]
    all_names: List[str]


@dataclass
class OrdinalsInUniverse:
    overall_ordinal: OrdinalsForTypeInUniverse
    ordinal_by_type: Dict[str, OrdinalsForTypeInUniverse]


def compute_ordinals_and_percentiles(frame, key_column, *, just_ordinal):
    key_column_name = key_column
    ordering = (
        frame[[stable_sort_column, key_column_name]]
        .fillna(-float("inf"))
        .sort_values(stable_sort_column)
        .sort_values(key_column_name, ascending=False, kind="stable")
        .index
    )
    # ordinals: index -> ordinal
    ordinals = np.array(
        pd.Series(np.arange(1, frame.shape[0] + 1), index=ordering).loc[frame.index]
    )
    values_series = pd.DataFrame(np.array(frame[key_column_name]), index=frame.longname)
    ordinals_series = pd.DataFrame(ordinals, index=frame.longname)
    if just_ordinal:
        return OrdinalsForTypeAndColumnInUniverse(values_series, ordinals_series, None)
    total_pop = frame[population_column].sum()
    # arranged_pop: ordinal - 1 -> population
    arranged_pop = np.array(frame[population_column][ordering])
    # cum_pop: ordinal - 1 -> population of all prior
    cum_pop = np.cumsum(arranged_pop)
    # percentiles_by_population: index -> percentile
    percentiles_by_population = 1 - cum_pop[ordinals - 1] / total_pop
    return OrdinalsForTypeAndColumnInUniverse(
        values_series,
        ordinals_series,
        pd.Series(percentiles_by_population, index=frame.longname),
    )


def compute_all_ordinals_for_frame(frame, keys, *, just_ordinal):
    return OrdinalsForTypeInUniverse(
        {
            k: compute_ordinals_and_percentiles(frame, k, just_ordinal=just_ordinal)
            for k in keys
        },
        list(frame.longname),
    )


def compute_all_ordinals_for_universe(full, universe, keys) -> OrdinalsInUniverse:
    full = full.copy()
    full = full.reset_index(drop=True)

    ordinal_by_type = {}
    for x in tqdm.tqdm(sorted(set(full.type)), desc=f"adding ordinals {universe!r}"):
        ordinal_by_type[x] = compute_all_ordinals_for_frame(
            full[full.type == x], keys, just_ordinal=False
        )
    return OrdinalsInUniverse(
        overall_ordinal=compute_all_ordinals_for_frame(full, keys, just_ordinal=True),
        ordinal_by_type=ordinal_by_type,
    )


@permacache(
    "urbanstats/ordinals/compute_all_ordinals_4",
    key_function=dict(full=hash_full_table),
)
def compute_all_ordinals(full, keys):
    return {
        universe: compute_all_ordinals_for_universe(
            full[full.universes.apply(lambda x: universe in x)], universe, keys
        )
        for universe in all_universes()
    }


def add_ordinals(frame, keys, ordinals_for_type, *, overall_ordinal):
    assert len(set(keys)) == len(keys)
    frame = frame.copy()
    frame = frame.reset_index(drop=True)
    for k in keys:
        ord_and_pctile = ordinals_for_type[k]
        ordinals, percentiles_by_population = (
            ord_and_pctile.ordinals,
            ord_and_pctile.percentiles_by_population,
        )
        frame[k, "overall_ordinal" if overall_ordinal else "ordinal"] = ordinals.loc[
            frame.longname
        ].values
        if overall_ordinal:
            continue
        frame[k, "total"] = frame[k].shape[0]
        frame[k, "percentile_by_population"] = percentiles_by_population.loc[
            frame.longname
        ].values
    return frame
