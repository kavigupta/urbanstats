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


category_metadata = {
    "main": dict(name="Main", show_checkbox=False, default=True),
    "race": dict(name="Race", show_checkbox=True, default=True),
    "national_origin": dict(name="National Origin", show_checkbox=True, default=False),
    "education": dict(name="Education", show_checkbox=True, default=False),
    "generation": dict(name="Generation", show_checkbox=True, default=False),
    "income": dict(name="Income", show_checkbox=True, default=False),
    "housing": dict(name="Housing", show_checkbox=True, default=False),
    "transportation": dict(name="Transportation", show_checkbox=True, default=False),
    "health": dict(name="Health", show_checkbox=True, default=False),
    "climate": dict(name="Climate Change", show_checkbox=True, default=False),
    "industry": dict(name="Industry", show_checkbox=True, default=False),
    "occupation": dict(name="Occupation", show_checkbox=True, default=False),
    "relationships": dict(name="Relationships", show_checkbox=True, default=False),
    "election": dict(name="Election", show_checkbox=True, default=True),
    "feature": dict(name="Proximity to Features", show_checkbox=True, default=False),
    "weather": dict(name="Weather", show_checkbox=True, default=False),
    "misc": dict(name="Miscellaneous", show_checkbox=True, default=False),
    "other_densities": dict(
        name="Other Density Metrics", show_checkbox=True, default=False
    ),
    "2010": dict(name="2010 Census", show_checkbox=True, default=False),
    "2000": dict(name="2000 Census", show_checkbox=True, default=False),
}


def output_categories():
    """
    Produces a flat list of dictionaries, each containing the key, name, and category of a statistic.
    """
    assert set(internal_statistic_names()) == set(get_statistic_categories())
    assert set(get_statistic_categories().values()) == set(category_metadata)
    return [dict(key=k, **v) for k, v in category_metadata.items()]


def output_statistics_metadata():

    with open(f"react/src/data/statistic_category_metadata.json", "w") as f:
        json.dump(output_categories(), f)
    with open(f"react/src/data/statistic_category_list.json", "w") as f:
        json.dump(list(get_statistic_categories().values()), f)
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

    with open(f"react/src/data/statistics_tree.json", "w") as f:
        json.dump(flatten_statistic_tree(), f)

def flatten_statistic_tree():
    print(statistics_tree)
    1/0
