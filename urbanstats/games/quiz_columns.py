from functools import lru_cache
from typing import Any, Dict, List, Tuple

from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.statistics_tree import statistics_tree


@lru_cache(maxsize=None)
def get_quiz_stats() -> List[Tuple[str, Any, List[str]]]:
    all_descriptors: Dict[str, Any] = {}

    for collection in statistic_collections:
        for name, desc in collection.quiz_question_descriptors().items():
            all_descriptors[name] = desc
    statistics_grouped_by_source: List[Tuple[str, Any, List[str]]] = []
    for cat in statistics_tree.categories.values():
        for group in cat.contents.values():
            for for_year in group.by_year.values():
                for by_source in for_year:
                    stat_list = list(by_source.by_source.items())
                    stat_filtered = [
                        (source, col)
                        for source, col in stat_list
                        if col in all_descriptors
                        and not isinstance(all_descriptors[col], QuizQuestionSkip)
                    ]
                    if not stat_filtered:
                        continue
                    if len(stat_filtered) > 1:
                        stat_filtered = sorted(
                            stat_filtered, key=lambda sc: sc[0].priority
                        )
                    stat_cols = [c for _, c in stat_filtered]
                    descriptors = {all_descriptors[c] for c in stat_cols}
                    assert len(descriptors) == 1, descriptors
                    [descriptor] = descriptors
                    statistics_grouped_by_source += [
                        (by_source.canonical_column(), descriptor, stat_cols)
                    ]
    return statistics_grouped_by_source


@lru_cache(maxsize=None)
def stat_to_quiz_name() -> Dict[str, str]:
    existing_stats = {k: d.name for k, d, _ in get_quiz_stats()}
    old_stats = {"transportation_means_car": "higher % of people who commute by car"}
    assert set(existing_stats.keys()).isdisjoint(old_stats.keys())
    return {**existing_stats, **old_stats}


def stat_to_difficulty() -> Dict[str, float]:
    return {k: d.difficulty_multiplier() for k, d, _ in get_quiz_stats()}
