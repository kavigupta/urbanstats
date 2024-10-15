from functools import lru_cache
import json

from .statistics_tree import statistics_tree
from .collections_list import statistic_collections


@lru_cache(maxsize=1)
def statistic_internal_to_display_name():
    """
    An ordered dictionary mapping internal statistic names to display names. The order used here is the order in which
    the statistics are stored in each row of the database.
    """
    internal_to_display = {}

    order_zones = {}

    for statistic_collection in statistic_collections:
        internal_to_display.update(statistic_collection.name_for_each_statistic())
        order_zones.update(statistic_collection.order_category_for_each_statistic())

    # reorder by order_zones
    key_to_order = {k: (order_zones[k], i) for i, k in enumerate(internal_to_display)}

    return {
        k: internal_to_display[k]
        for k in sorted(internal_to_display, key=lambda x: key_to_order[x])
    }


@lru_cache(maxsize=1)
def internal_statistic_names():
    """
    List of internal statistic names in the order they are stored in the database.
    """
    return list(statistic_internal_to_display_name())


def get_statistic_categories():
    """
    Map from internal statistic names to categories.
    """
    result = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.category_for_each_statistic())

    result = {k: result[k] for k in statistic_internal_to_display_name()}
    return result


def get_explanation_page():
    """
    Map from internal statistic names to explanation pages.
    """
    result = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.explanation_page_for_each_statistic())

    result = {k: result[k] for k in statistic_internal_to_display_name()}
    return result


def get_statistic_column_path(column):
    """
    Return a sanitized version of the column name for use in a URL.
    """
    if isinstance(column, tuple):
        column = "-".join(str(x) for x in column)
    return column.replace("/", " slash ")

def output_statistics_metadata():

    with open(f"react/src/data/statistic_name_list.json", "w") as f:
        json.dump(list(statistic_internal_to_display_name().values()), f)
    with open(f"react/src/data/statistic_path_list.json", "w") as f:
        json.dump(
            list(
                [
                    get_statistic_column_path(name)
                    for name in statistic_internal_to_display_name()
                ]
            ),
            f,
        )
    with open(f"react/src/data/statistic_list.json", "w") as f:
        json.dump(list([name for name in internal_statistic_names()]), f)

    with open(f"react/src/data/explanation_page.json", "w") as f:
        json.dump(list([name for name in get_explanation_page().values()]), f)

    fst = flatten_statistic_tree()
    with open(f"react/src/data/statistics_tree.json", "w") as f:
        json.dump(fst, f, indent=2)


def flatten_statistic_tree():
    all_stats = {
        stat
        for category in statistics_tree.values()
        for group in category["contents"].values()
        for stats in group["contents"].values()
        for stat in stats
    }
    print(all_stats)
    extra_in_tree = all_stats - set(internal_statistic_names())
    if extra_in_tree:
        raise ValueError(f"Extra stats in tree: {extra_in_tree}")
    extra_in_list = set(internal_statistic_names()) - all_stats
    if extra_in_list:
        raise ValueError(
            f"Missing stats in tree: {[x for x in internal_statistic_names() if x in extra_in_list]}"
        )

    return [
        flatten_category(category_id, category)
        for category_id, category in statistics_tree.items()
    ]


def flatten_category(category_id, category):
    return {
        "id": category_id,
        "name": category["name"],
        "contents": [
            flatten_group(group_id, group)
            for group_id, group in category["contents"].items()
        ],
    }


def flatten_group(group_id, group):
    assert "contents" in group, group
    group_name = group.get("name", None)
    if group_name is None:
        year = None if None in group["contents"] else max(group["contents"])
        short_statcol = group["contents"][year][0]
        group_name = statistic_internal_to_display_name()[short_statcol]
        if len(group["contents"]) > 1:
            assert not (
                str(year) in group_name
            ), f"Group name should not contain year, but got: {group_name}"

    return {
        "id": group_id,
        "name": group_name,
        "contents": [
            flatten_year(year, stats) for year, stats in group["contents"].items()
        ],
    }


def flatten_year(year, stats):
    assert isinstance(year, int) or year is None, year
    assert all(isinstance(stat, (str, tuple)) for stat in stats), stats
    return {
        "year": year,
        "stats": stats,
    }
