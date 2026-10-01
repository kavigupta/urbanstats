from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
import pandas as pd

from urbanstats.ordinals.ordinal_info import OrdinalInfo
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)


@dataclass
class FunFactInformation:
    """
    Information needed to compute fun facts. This reflects
    only some of the geographies, universes, and types
    that are available in the full website, specificlaly
    the ones that are relevant for fun facts.

    :param longnames: The longnames of the places in the fun facts universe. (L,)
    :param statistic_internal_names: The internal names of the statistics in the fun facts universe. (S,)
    :param universe_types: The types of universes in the fun facts universe. (UT,)
    :param pop_arr: The populations of the places in the fun facts universe. (L,)
    :param table_arr: The table of statistics for the places in the fun facts universe. (L, S)
    :param ut_mask: A boolean mask indicating which rows of table_arr correspond to
        the universe-types in universe_types. (L, UT)
    """

    longnames: np.ndarray
    statistic_internal_names: List[str]
    universe_types: List[Tuple[str, str]]
    pop_arr: np.ndarray
    table_arr: np.ndarray
    ut_mask: np.ndarray

    @classmethod
    def create(
        cls, table: pd.DataFrame, ordinal_info: OrdinalInfo, *, min_population
    ) -> "FunFactInformation":
        # TODO fix this to merge different sources
        longnames = table["longname"].to_numpy()
        longnames_in_ordinal_info_order = ordinal_info.longnames
        longname_to_ordinal_info_order = {
            name: i for i, name in enumerate(longnames_in_ordinal_info_order)
        }
        stats = list(statistic_internal_to_display_name())
        universe_types = list(ordinal_info.universe_type)
        relevant_uts_mask = [is_valid_ut(u, t) for u, t in universe_types]
        universe_types = [
            ut for ut, valid in zip(universe_types, relevant_uts_mask) if valid
        ]
        pop_arr = table["best_population_estimate"].to_numpy()
        table_arr = table[stats].to_numpy()
        population_mask = pop_arr >= min_population
        ut_mask = np.array(ordinal_info.universe_type_masks.todense())
        longname_idxs = [longname_to_ordinal_info_order[name] for name in longnames]
        ut_mask = ut_mask[longname_idxs][:, relevant_uts_mask]
        longnames, pop_arr, table_arr, ut_mask = (
            longnames[population_mask],
            pop_arr[population_mask],
            table_arr[population_mask],
            ut_mask[population_mask],
        )
        return cls(
            longnames=longnames,
            statistic_internal_names=stats,
            universe_types=universe_types,
            pop_arr=pop_arr,
            table_arr=table_arr,
            ut_mask=ut_mask,
        )

    def subset_longnames(self, longname_mask: np.ndarray) -> "FunFactInformation":
        """
        Return a new FunFactInformation object that is a subset of the current one,
        filtered by the given longname mask.

        :param longname_mask: A boolean mask indicating which longnames to keep. (L,)
        :return: A new FunFactInformation object with the filtered data.
        """
        return FunFactInformation(
            longnames=self.longnames[longname_mask],
            statistic_internal_names=self.statistic_internal_names,
            universe_types=self.universe_types,
            pop_arr=self.pop_arr[longname_mask],
            table_arr=self.table_arr[longname_mask],
            ut_mask=self.ut_mask[longname_mask],
        )


def is_valid_ut(universe: str, typ: str) -> bool:
    # TODO add more filters
    if typ == "overall":
        return False
    if typ.endswith("Person Circle"):
        return False
    if typ.startswith("Congressional District ("):
        return False
    return True
