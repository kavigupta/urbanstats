import json
from functools import lru_cache

from urbanstats.statistics.stat_path import get_statistic_column_path

from .collections_list import statistic_collections
from .statistics_tree import statistics_tree


@lru_cache(maxsize=1)
def statistic_internal_to_display_name():
    """
    An ordered dictionary mapping internal statistic names to display names. The order used here is the order in which
    the statistics are stored in each row of the database.
    """
    internal_to_display = {}

    for statistic_collection in statistic_collections:
        internal_to_display.update(statistic_collection.name_for_each_statistic())

    all_stats = set(internal_to_display.keys())
    extra_in_this_list = all_stats - set(internal_statistic_names())
    if extra_in_this_list:
        raise ValueError(f"Missing stats in tree: {extra_in_this_list}")
    extra_in_tree = set(internal_statistic_names()) - all_stats
    if extra_in_tree:
        raise ValueError(
            f"Extra stats in tree: {[x for x in internal_statistic_names() if x in extra_in_tree]}"
        )
    return {k: internal_to_display[k] for k in internal_statistic_names()}


@lru_cache(maxsize=1)
def internal_statistic_names():
    """
    List of internal statistic names in the order they are stored in the database. This is designed to be a
    stable order that does not change when you reorder the statistics in computation or display.

    As such, we just sort lexicographically. This will only ever change if we add or remove statistics,
    which requires rebuilding the database anyway.
    """
    return sorted(statistics_tree.internal_statistics(), key=str)


def get_statistic_categories():
    """
    Map from internal statistic names to categories.
    """
    return statistics_tree.name_to_category()


def get_explanation_page():
    """
    Map from internal statistic names to explanation pages.
    """
    result = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.explanation_page_for_each_statistic())

    result = {k: result[k] for k in statistic_internal_to_display_name()}
    return result


def output_statistics_metadata():
    with open("react/src/data/statistic_name_list.json", "w") as f:
        json.dump(list(statistic_internal_to_display_name().values()), f)
    with open("react/src/data/statistic_path_list.json", "w") as f:
        json.dump(
            [
                get_statistic_column_path(name)
                for name in statistic_internal_to_display_name()
            ],
            f,
        )
    with open("react/src/data/statistic_list.json", "w") as f:
        json.dump(list(internal_statistic_names()), f)

    with open("react/src/data/explanation_page.json", "w") as f:
        json.dump(list(get_explanation_page().values()), f)

    export_statistics_tree("react/src/data/statistics_tree.ts")


def export_statistics_tree(path):
    fst = statistics_tree.flatten(statistic_internal_to_display_name())
    fst = json.dumps(fst, indent=4)
    with open(path, "w") as f:
        f.write(f"export const rawStatsTree = {fst} as const\n")
