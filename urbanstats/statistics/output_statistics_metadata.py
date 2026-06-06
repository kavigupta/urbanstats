import json
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional, Set

from urbanstats.statistics.stat_path import get_statistic_column_path

from ..utils import output_typescript
from .collections_list import statistic_collections
from .statistics_tree import statistics_tree


@lru_cache(maxsize=1)
def statistic_internal_to_display_name() -> Dict[str, str]:
    """
    An ordered dictionary mapping internal statistic names to display names. The order used here is the order in which
    the statistics are stored in each row of the database.
    """
    internal_to_source: Dict[str, Any] = {}
    internal_to_display: Dict[str, str] = {}

    for statistic_collection in statistic_collections:
        internal_to_display.update(statistic_collection.name_for_each_statistic())
        internal_to_source.update(
            {
                k: statistic_collection
                for k in statistic_collection.name_for_each_statistic()
            }
        )

    all_stats = set(internal_to_display.keys())
    extra_in_this_list = all_stats - set(internal_statistic_names())
    extra_in_tree = set(internal_statistic_names()) - all_stats
    if extra_in_this_list or extra_in_tree:
        if extra_in_this_list:
            print("Statistics in collections but not in tree:")
            for stat in extra_in_this_list:
                print(f"  {stat} [from {internal_to_source[stat].__class__.__name__}]")
        if extra_in_tree:
            print("Statistics in tree but not in collections:")
            for stat in extra_in_tree:
                print(f"  {stat}")
        raise ValueError("Mismatch between statistics in collections and tree")
    return {k: internal_to_display[k] for k in internal_statistic_names()}


@lru_cache(maxsize=1)
def internal_statistic_names_in_tree_order() -> List[str]:
    """
    List of internal statistic names in the order they appear in the statistics tree.
    This preserves the natural order of the tree structure.
    """
    return statistics_tree.internal_statistics()


@lru_cache(maxsize=1)
def internal_statistic_names() -> List[str]:
    """
    List of internal statistic names in the order they are stored in the database. This is designed to be a
    stable order that does not change when you reorder the statistics in computation or display.

    As such, we just sort lexicographically. This will only ever change if we add or remove statistics,
    which requires rebuilding the database anyway.
    """
    return sorted(statistics_tree.internal_statistics(), key=str)


def get_statistic_categories() -> Dict[str, str]:
    """
    Map from internal statistic names to categories.
    """
    return statistics_tree.name_to_category()


def get_explanation_page() -> Dict[str, Optional[str]]:
    """
    Map from internal statistic names to explanation pages.
    """
    result: Dict[str, Optional[str]] = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.explanation_page_for_each_statistic())

    return {k: result[k] for k in statistic_internal_to_display_name()}


def get_deprecation_messages() -> Dict[str, Optional[str]]:
    result: Dict[str, Optional[str]] = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.deprecation_for_each_statistic())

    with_deprecation_message = {k for k, v in result.items() if v is not None}
    from_deprecation_category = {
        k for k, v in get_statistic_categories().items() if v == "deprecated"
    }
    if with_deprecation_message != from_deprecation_category:
        print("Statistics with deprecation messages but not in deprecated category:")
        for stat in with_deprecation_message - from_deprecation_category:
            print(f"  {stat}")
        print("Statistics in deprecated category but without deprecation messages:")
        for stat in from_deprecation_category - with_deprecation_message:
            print(f"  {stat}")
        raise ValueError(
            "Mismatch between statistics with deprecation messages and deprecated category"
        )
    return result


def get_human_readable_name_for_variable(
    stat: str,
    internal_to_actual_variable: Dict[str, str],
    multi_source_variable_names: Set[str],
    multi_source_stats: List[Any],
) -> str:
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


def statistic_variables_info() -> Dict[str, Any]:
    """
    Create the metadata files for the statistics.
    This is used to generate the TypeScript files that are used in the frontend.
    """
    internal_to_variable: Dict[str, str] = {}
    for statistic_collection in statistic_collections:
        internal_to_variable.update(statistic_collection.varname_for_each_statistic())
    assert set(internal_to_variable.keys()) == set(internal_statistic_names())
    internal_to_actual_variable = internal_to_variable.copy()
    multi_source: Dict[str, Any] = {}
    multi_source_variable_names: Set[str] = set()
    multi_source_stats = list(multi_source_statistics())
    for stat in multi_source_stats:
        ms_name_list = [internal_to_variable[s] for s in stat.by_source.values()]
        assert (
            len(set(ms_name_list)) == 1
        ), f"Multiple variable names for {stat}: {ms_name_list}"
        ms_name = ms_name_list[0]
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

    _verify_no_deprecated_multi_source(multi_source, variable_objects)

    result = {
        "variableNames": variable_objects,
        "multiSourceVariables": list(multi_source.items()),
    }
    return result


def _verify_no_deprecated_multi_source(
    multi_source: Dict[str, Any], variable_objects: List[Dict[str, Any]]
) -> None:
    deprecation_map = {
        var_obj["varName"]: var_obj["deprecated"]
        for var_obj in variable_objects
        if var_obj["deprecated"] is not None
    }

    for ms_name, ms_info in multi_source.items():
        if any(var in deprecation_map for var in ms_info["individualVariables"]):
            raise ValueError(
                f"Multi-source variable {ms_name} includes deprecated individual variables: "
                f"{[var for var in ms_info['individualVariables'] if var in deprecation_map]}"
            )


def construct_variable_objects(
    internal_to_actual_variable: Dict[str, str],
    multi_source_variable_names: Set[str],
    multi_source_stats: List[Any],
) -> List[Dict[str, Any]]:
    deprecation_messages = get_deprecation_messages()
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
                "deprecated": deprecation_messages[stat],
            }
        )

    var_names = [obj["varName"] for obj in variable_objects]
    duplicated = [
        item
        for item, count in json.loads(json.dumps(Counter(var_names))).items()
        if count > 1
    ]
    if duplicated:
        raise ValueError(
            f"Duplicated variable names in statistics: {duplicated}. "
            "This is likely due to multiple statistics having the same variable name."
        )

    return variable_objects


def multi_source_statistics() -> Iterable[Any]:
    for cat in statistics_tree.categories.values():
        for group in cat.contents.values():
            for by_year in group.by_year.values():
                for stat in by_year:
                    if len(stat.by_source) == 1:
                        continue
                    yield stat


def output_statistics_metadata() -> None:
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


def all_legacy_statistic_names() -> Dict[str, str]:
    result: Dict[str, str] = {}
    for statistic_collection in statistic_collections:
        result.update(statistic_collection.legacy_statistic_names())
    return result


def export_statistics_tree(path: str) -> None:
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
    fst_str = json.dumps(fst, indent=4)
    with open(path, "w") as f:
        f.write(
            f"export const dataSources = {json.dumps(result, indent=4)} as const\n\n"
        )
        f.write(f"export const rawStatsTree = {fst_str} as const\n")


# Just ensuring that the columns have no errors
statistic_internal_to_display_name()
