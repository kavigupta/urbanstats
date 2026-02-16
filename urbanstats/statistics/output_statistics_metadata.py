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
    extra_in_tree = set(internal_statistic_names()) - all_stats
    if extra_in_this_list or extra_in_tree:
        if extra_in_this_list:
            print("Statistics in collections but not in tree:")
            for stat in extra_in_this_list:
                print(f"  {stat}")
        if extra_in_tree:
            print("Statistics in tree but not in collections:")
            for stat in extra_in_tree:
                print(f"  {stat}")
        raise ValueError("Mismatch between statistics in collections and tree")
    return {k: internal_to_display[k] for k in internal_statistic_names()}


@lru_cache(maxsize=1)
def internal_statistic_names_in_tree_order():
    """
    List of internal statistic names in the order they appear in the statistics tree.
    This preserves the natural order of the tree structure.
    """
    return statistics_tree.internal_statistics()


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


def get_human_readable_name_for_variable(
    stat, internal_to_actual_variable, multi_source_variable_names, multi_source_stats
):
    """
    Get the appropriate human-readable name for a variable, including source information for multi-source variables.
    """
    base_name = statistic_internal_to_display_name()[stat]

    if internal_to_actual_variable[stat] not in multi_source_variable_names:
        return base_name

    # Find the source for this specific variable
    for multi_source_stat in multi_source_stats:
        for source, stat_name in multi_source_stat.by_source.items():
            if stat_name == stat:
                if source is None:
                    return base_name
                # Only add source information if the base name doesn't already contain source info
                if " [" in base_name and "]" in base_name:
                    return base_name
                return f"{base_name} [{source.name}]"

    return base_name


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
    multi_source_variable_names = set()
    multi_source_stats = list(multi_source_statistics())
    for stat in multi_source_stats:
        ms_name = [internal_to_variable[s] for s in stat.by_source.values()]
        assert len(set(ms_name)) == 1, f"Multiple variable names for {stat}: {ms_name}"
        ms_name = ms_name[0]
        combo = []
        for source, s in sorted(stat.by_source.items(), key=lambda x: x[0].priority):
            variable = ms_name + "_" + source.variable_suffix
            assert s in internal_to_actual_variable
            internal_to_actual_variable[s] = variable
            combo.append(variable)
            multi_source_variable_names.add(variable)
        multi_source[ms_name] = dict(
            individualVariables=combo,
            humanReadableName=stat.compute_name(statistic_internal_to_display_name()),
        )

    variable_objects = construct_variable_objects(
        internal_to_actual_variable, multi_source_variable_names, multi_source_stats
    )

    result = {
        "variableNames": variable_objects,
        "multiSourceVariables": list(multi_source.items()),
    }
    return result


def construct_variable_objects(
    internal_to_actual_variable, multi_source_variable_names, multi_source_stats
):
    variable_objects = []
    for i, stat in enumerate(internal_statistic_names_in_tree_order()):
        lexicographic_index = internal_statistic_names().index(stat)
        variable_objects.append(
            {
                "varName": internal_to_actual_variable[stat],
                "humanReadableName": get_human_readable_name_for_variable(
                    stat,
                    internal_to_actual_variable,
                    multi_source_variable_names,
                    multi_source_stats,
                ),
                "comesFromMultiSourceSet": internal_to_actual_variable[stat]
                in multi_source_variable_names,
                "order": i,
                "index": lexicographic_index,
            }
        )

    var_names = [obj["varName"] for obj in variable_objects]
    duplicated = [item for item, count in Counter(var_names).items() if count > 1]
    if duplicated:
        raise ValueError(
            f"Duplicated variable names in statistics: {duplicated}. "
            "This is likely due to multiple statistics having the same variable name."
        )

    return variable_objects


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

    with open("react/src/data/legacy_statistic_columns.ts", "w") as f:
        f.write(
            "export type LegacyStatName = never"
            + "".join(" | " + json.dumps(name) for name in all_legacy_statistic_names())
            + ";\n"
        )


def all_legacy_statistic_names():
    result = {}
    for statistic_collection in statistic_collections:
        result.update(statistic_collection.legacy_statistic_names())
    return result


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
