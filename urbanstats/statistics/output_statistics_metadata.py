import json
from functools import lru_cache
from typing import Counter

from urbanstats.statistics.stat_path import get_statistic_column_path

from ..utils import output_typescript
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


def statistic_variables_info():
    """
    Create the metadata files for the statistics.
    This is used to generate the TypeScript files that are used in the frontend.
    """
    internal_to_variable = {}
    for statistic_collection in statistic_collections:
        internal_to_variable.update(statistic_collection.varname_for_each_statistic())
    assert set(internal_to_variable.keys()) == set(internal_statistic_names())
    internal_to_actual_variable = internal_to_variable.copy()
    multi_source = {}
    for stat in multi_source_statistics():
        ms_name = [internal_to_variable[s] for s in stat.by_source.values()]
        assert len(set(ms_name)) == 1, f"Multiple variable names for {stat}: {ms_name}"
        ms_name = ms_name[0]
        combo = []
        for source, s in sorted(stat.by_source.items(), key=lambda x: x[0].priority):
            variable = ms_name + "_" + source.variable_suffix
            assert s in internal_to_actual_variable
            internal_to_actual_variable[s] = variable
            combo.append(variable)
        multi_source[ms_name] = dict(
            individualVariables=combo,
            humanReadableName=stat.compute_name(statistic_internal_to_display_name()),
        )
    internal_to_actual_list = [
        internal_to_actual_variable[stat] for stat in internal_statistic_names()
    ]
    duplicated = [
        item for item, count in Counter(internal_to_actual_list).items() if count > 1
    ]
    if duplicated:
        raise ValueError(
            f"Duplicated variable names in statistics: {duplicated}. "
            "This is likely due to multiple statistics having the same variable name."
        )
    result = {
        "variableNames": internal_to_actual_list,
        "multiSourceVariables": list(multi_source.items()),
    }
    return result


def multi_source_statistics():
    for cat in statistics_tree.categories.values():
        for group in cat.contents.values():
            for by_year in group.by_year.values():
                for stat in by_year:
                    if len(stat.by_source) == 1:
                        continue
                    yield stat


def output_statistics_metadata():
    with open("react/src/data/statistic_name_list.ts", "w") as f:
        output_typescript(list(statistic_internal_to_display_name().values()), f)
    with open("react/src/data/statistic_path_list.ts", "w") as f:
        output_typescript(
            [
                get_statistic_column_path(name)
                for name in statistic_internal_to_display_name()
            ],
            f,
        )
    with open("react/src/data/statistic_list.ts", "w") as f:
        output_typescript(list(internal_statistic_names()), f)

    with open("react/src/data/explanation_page.ts", "w") as f:
        output_typescript(list(get_explanation_page().values()), f)

    export_statistics_tree("react/src/data/statistics_tree.ts")

    with open("react/src/data/statistic_variables_info.ts", "w") as f:
        output_typescript(statistic_variables_info(), f)


def export_statistics_tree(path):
    fst = statistics_tree.flatten(statistic_internal_to_display_name())
    sources = statistics_tree.all_sources()
    source_categories = list(dict.fromkeys([source.category for source in sources]))
    result = [
        {
            "category": category,
            "sources": [
                dict(source=source.name, is_default=source.is_default)
                for source in sources
                if source.category == category
            ],
        }
        for category in source_categories
    ]
    fst = json.dumps(fst, indent=4)
    with open(path, "w") as f:
        f.write(
            f"export const dataSources = {json.dumps(result, indent=4)} as const\n\n"
        )
        f.write(f"export const rawStatsTree = {fst} as const\n")


# Just ensuring that the columns have no errors
statistic_internal_to_display_name()
