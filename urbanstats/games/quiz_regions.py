from dataclasses import dataclass
from typing import Callable, List

import numpy as np
import pandas as pd
from permacache import stable_hash

from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.statistics.statistics_tree import statistics_tree
from .quiz_columns import all_descriptors


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
        # TODO unequal sharing
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


def get_quiz_stats():
    statistics_grouped_by_source = []
    for cat in statistics_tree.categories.values():
        for group in cat.contents.values():
            for for_year in group.by_year.values():
                for by_source in for_year:
                    stat = list(by_source.by_source.items())
                    stat = [
                        (source, col)
                        for source, col in stat
                        if not isinstance(all_descriptors[col], QuizQuestionSkip)
                    ]
                    if not stat:
                        continue
                    if len(stat) > 1:
                        stat = sorted(stat, key=lambda sc: sc[0].priority)
                    stat = [c for _, c in stat]
                    descriptors = {all_descriptors[c] for c in stat}
                    assert len(descriptors) == 1, descriptors
                    [descriptor] = descriptors
                    statistics_grouped_by_source += [
                        (by_source.canonical_column(), descriptor, stat)
                    ]
    return statistics_grouped_by_source


region_map = {
    "city": QuizRegion(["City", "CA Census Subdivision"]),
    "county": QuizRegion(["County", "CA Census Division"]),
    "msa_equiv": QuizRegion(["MSA", "CA CMA"]),
    "uc": QuizRegion(["Urban Center"]),
    "state": QuizRegion(["Subnational Region"], lambda x: x.local_region_mask * 6 + 1),
    "ua": QuizRegion(["Urban Area", "CA Population Center"]),
    "cd": QuizRegion(["Congressional District"]),
    "mm": QuizRegion(["Media Market"]),
    "country": QuizRegion(["Country"]),
}
