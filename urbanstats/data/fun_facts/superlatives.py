"""
Fun facts of the form X is the Kth Y-est T with population over P in U
where X is a place, Y is a statistic, (U, T) is a universe-type pair, and P is a population threshold.
"""

from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict

import numpy as np
import tqdm.auto as tqdm

from urbanstats.data.fun_facts.fun_fact import FunFact
from urbanstats.data.fun_facts.info import FunFactInformation
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)
from urbanstats.universe.universe_list import is_sub_universe

pop_thresholds = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000]
#: The minimum number of places that must be in the collection of possibilities
#: for a superlative to be considered valid.
min_count = 10
#: We harvest 1 superlative by default in each direction,
#: but can go up to 1% of the count
max_k_frac = 0.01


@dataclass
class SuperlativeFunFact(FunFact):
    """
    A superlative fun fact of the form X is the Kth Y-est T with population over P in U
    where X is a place, Y is a statistic, (U, T) is a universe-type pair, and P is a population threshold.
    """

    highest: bool
    k: int
    statistic: str
    universe_type: tuple[str, str]
    pop_threshold: int

    def debug_render(self) -> str:
        """
        Render the superlative fun fact in a human-readable format for debugging.
        """
        rendered_stat = statistic_internal_to_display_name()[self.statistic]
        return (
            f"{self.longname} is the {self.k}{'st' if self.k == 1 else 'th'} "
            f"{'highest' if self.highest else 'lowest'} {rendered_stat} "
            f"with population over {self.pop_threshold} in {self.universe_type[0]} ({self.universe_type[1]})"
        )

    def subsumes_same_type(self, other: "SuperlativeFunFact") -> bool:
        """
        Check if self is more impressive than other.
        """
        if self.statistic != other.statistic:
            return False
        if self.highest != other.highest:
            return False
        assert (
            self.universe_type[1] == other.universe_type[1]
        ), "Same longname means same type"
        self_universe, other_universe = self.universe_type[0], other.universe_type[0]
        if not is_sub_universe(self_universe, other_universe):
            return False
        if not (self.pop_threshold <= other.pop_threshold):
            return False
        if not (self.k <= other.k):
            return False
        # at this point, we have the same statistic, same direction, and are looking at
        # a strictly larger set of possibilities, so self is more impressive than other
        return True


def all_superlatives(ffd: FunFactInformation) -> Dict[str, List[SuperlativeFunFact]]:
    """
    Harvest all superlatives for all universe-types and population thresholds.

    :param ffd: The fun fact data.
    """
    results = defaultdict(list)
    for pop_threshold in pop_thresholds:
        for universe_type in tqdm.tqdm(
            ffd.universe_types,
            desc=f"Harvesting superlatives for pop threshold {pop_threshold}",
        ):
            superlatives = harvest_superlatives(ffd, universe_type, pop_threshold)
            for longname, superlative_list in superlatives.items():
                results[longname].extend(superlative_list)
    return dict(results.items())


def harvest_superlatives(
    ffd: FunFactInformation, universe_type: tuple[str, str], pop_threshold: int
) -> dict[str, list[SuperlativeFunFact]]:
    """
    Harvest superlatives for a given universe-type and population threshold.

    :param ffd: The fun fact data.
    :param universe_type: The universe-type pair (U, T).
    :param pop_threshold: The population threshold P.
    """
    ffd = ffd.subset_longnames(ffd.ut_mask[:, ffd.universe_types.index(universe_type)])
    results = {longname: [] for longname in ffd.longnames}
    for i, stat in enumerate(ffd.statistic_internal_names):
        col = ffd.table_arr[:, i]
        mask = ~np.isnan(col) & (ffd.pop_arr >= pop_threshold)
        count = np.sum(mask)
        if count < min_count:
            continue
        k = max(int(max_k_frac * count), 1)
        sorted_indices = np.argsort(col[mask])
        top_k_idx = sorted_indices[-k:][::-1]
        bottom_k_idx = sorted_indices[:k]
        # top_k_idx = np.argpartition(-col[mask], k)[: int(k)]
        # bottom_k_idx = np.argpartition(col[mask], k)[: int(k)]
        for idxs, is_top in [(top_k_idx, True), (bottom_k_idx, False)]:
            for ord, idx in enumerate(idxs):
                longname = ffd.longnames[mask][idx]
                results[longname].append(
                    SuperlativeFunFact(
                        longname=longname,
                        highest=is_top,
                        k=ord + 1,
                        statistic=stat,
                        universe_type=universe_type,
                        pop_threshold=pop_threshold,
                    )
                )
    return results
