import json
from functools import lru_cache

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
    List of internal statistic names in the order they are stored in the database.
    """
    return [
        stat
        for category in statistics_tree.values()
        for group in category["contents"].values()
        for stats in group["contents"].values()
        for stat in stats
    ]


def get_statistic_categories():
    """
    Map from internal statistic names to categories.
    """
    # TODO make it so you don't need to make `distance_from_features` and `climate_change` special cases
    # also maybe we need to handle 2010 and 2000 better.
    # currently this is only used for CSV export and juxtastat.
    category_by_tree = {}
    for category_id, category in statistics_tree.items():
        for _, group in category["contents"].items():
            for year, stats in group["contents"].items():
                for stat in stats:
                    category_id_to_use = {
                        "distance_from_features": "feature",
                        "climate_change": "climate",
                    }.get(category_id, category_id)
                    category_by_tree[stat] = (
                        category_id_to_use if year in {2020, None} else str(year)
                    )
    return category_by_tree


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

    fst = flatten_statistic_tree()
    with open("react/src/data/statistics_tree.json", "w") as f:
        json.dump(fst, f, indent=2)


def flatten_statistic_tree():
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

    group_id = get_statistic_column_path(group_id)
    return {
        "id": group_id,
        "name": group_name,
        "contents": [
            flatten_year(year, stats) for year, stats in group["contents"].items()
        ],
    }


def flatten_year(year, stats):
    assert isinstance(year, int) or year is None, year
    stats_processed = []
    for stat in stats:
        assert stat in internal_statistic_names(), stat
        stats_processed.append(internal_statistic_names().index(stat))

    return {"year": year, "stats": stats_processed}
