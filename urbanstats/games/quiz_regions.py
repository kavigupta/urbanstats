from dataclasses import dataclass
from typing import Callable, List

import numpy as np
import pandas as pd
from permacache import stable_hash

from urbanstats.games.quiz_columns import get_quiz_stats


@dataclass
class QuizTable:
    data: pd.DataFrame
    universes: pd.Series
    local_region_mask: pd.Series
    weight_internal: pd.Series

    def __permacache_hash__(self):
        return stable_hash(
            dict(
                data=[list(self.data.columns), list(self.data.index), self.data.values],
                universes=self.universes,
                local_region_mask=self.local_region_mask,
                weight_internal=self.weight_internal,
            )
        )


@dataclass
class QuizRegion:
    regions: List[str]
    internal_weighting_function: Callable[[pd.Series], float] = lambda _: 1.0

    def load_quiz_table(self, filtered_for_pop):
        result = filtered_for_pop[filtered_for_pop.type.isin(self.regions)].set_index(
            "longname"
        )
        assert set(result.type) == set(self.regions)

        data_table = {}
        for column, _, prioritized_cols in get_quiz_stats():
            data = np.array(result[prioritized_cols])
            data = data[np.arange(len(data)), np.isnan(data).argmin(1)]
            data_table[column] = data
        data_table = pd.DataFrame(data_table, index=result.index)
        return QuizTable(
            data_table,
            result["universes"],
            result["local_region_mask"],
            result.apply(self.internal_weighting_function, axis=1),
        )


region_map = {
    "city": QuizRegion(["City", "CA Census Subdivision"]),
    "county": QuizRegion(["County", "CA Census Division"]),
    "msa_equiv": QuizRegion(["Metropolitan Statistical Area", "CA CMA"]),
    "uc": QuizRegion(["Urban Center"]),
    "state": QuizRegion(["Subnational Region"], lambda x: x.local_region_mask * 6 + 1),
    "ua": QuizRegion(["Urban Area", "CA Population Center"]),
    "cd": QuizRegion(["Congressional District"]),
    "mm": QuizRegion(["Media Market"]),
    "country": QuizRegion(["Country"]),
}
