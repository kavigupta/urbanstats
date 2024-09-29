import re

import numpy as np

from relationship import ordering_idx
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.statistic_collection import ORDER_CATEGORY_MAIN


def ord_or_zero(x):
    return 0 if np.isnan(x) else int(x)


def indices(longname, typ, strict_display=False):
    from create_website import get_index_lists

    lists = get_index_lists()["index_lists"]
    result = []
    result += lists["universal"]
    is_american = "USA" in longname
    if get_index_lists()["type_to_has_gpw"][typ]:
        if not strict_display or not is_american:
            result += lists["gpw"]
    # else:
    if is_american:
        result += lists["usa"]
    return sorted(result)


def create_page_json(
    folder,
    row,
    relationships,
    long_to_short,
    long_to_population,
    long_to_type,
    long_to_idx,
    flat_ords,
):
    statistic_names = internal_statistic_names()
    idxs_by_type = indices(row.longname, row.type)
    data = data_files_pb2.Article()
    data.shortname = row.shortname
    data.longname = row.longname
    data.source = row.source
    data.article_type = row.type
    data.universes.extend(row.universes)

    ords, percs = flat_ords.query(long_to_idx[row.longname])

    for idx in idxs_by_type:
        stat = statistic_names[idx]
        statrow = data.rows.add()
        statrow.statval = float(row[stat])

        ordinals_by_type, ordinals_overall = ords[idx]
        percs_by_typ, _ = percs[idx]

        for ordinal_by_type, ordinal_overall, percentile_by_type in zip(
            ordinals_by_type, ordinals_overall, percs_by_typ
        ):
            statrow.ordinal_by_universe.append(int(ordinal_by_type))
            statrow.overall_ordinal_by_universe.append(int(ordinal_overall))
            statrow.percentile_by_population_by_universe.append(percentile_by_type)
    for _, extra_stat in sorted(extra_stats().items()):
        data.extra_stats.append(extra_stat.create(row))
    for relationship_type in relationships:
        for_this = relationships[relationship_type].get(row.longname, set())
        for_this = [x for x in for_this if x in long_to_population]
        for_this = sorted(
            for_this, key=lambda x: order_key_for_relatioships(x, long_to_type[x])
        )
        # add to map with key relationship_type
        related_buttons = data.related.add()
        related_buttons.relationship_type = relationship_type
        for x in for_this:
            related_button = related_buttons.buttons.add()
            related_button.longname = x
            related_button.shortname = long_to_short[x]
            related_button.row_type = long_to_type[x]

    name = create_filename(row.longname, "gz")
    write_gzip(data, f"{folder}/{name}")
    return name


def order_key_for_relatioships(longname, typ):
    processed_longname = longname
    if typ == "Historical Congressional District":
        parsed = re.match(r".*[^\d](\d+)[^\d]*Congress", longname)
        end_congress = int(parsed.group(1))
        processed_longname = -end_congress, longname
    return ordering_idx[typ], processed_longname


def shard_bytes(longname):
    """translation of links.ts::shardBytes"""
    bytes_ = longname.encode("utf-8")
    hash_ = 0
    for i in range(len(bytes_)):
        hash_ = (hash_ * 31 + bytes_[i]) & 0xFFFFFFFF
    string = ""
    for i in range(4):
        string += hex(hash_ & 0xF)[2:]
        hash_ >>= 4
    return string[0:2], string[2:3]


def create_filename(x, ext):
    x = x.replace("/", " slash ")
    a, b = shard_bytes(x)
    return f"{a}/{b}/{x}." + ext


def statistic_internal_to_display_name():
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


def internal_statistic_names():
    return list(statistic_internal_to_display_name())


def get_statistic_categories():
    result = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.category_for_each_statistic())

    result = {k: result[k] for k in statistic_internal_to_display_name()}
    return result


def get_explanation_page():
    result = {}

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.explanation_page_for_each_statistic())

    result = {k: result[k] for k in statistic_internal_to_display_name()}
    return result


def extra_stats():
    result = {}
    for statistic_collection in statistic_collections:
        result.update(statistic_collection.extra_stats())
    name_to_idx = {name: idx for idx, name in enumerate(internal_statistic_names())}
    extra = {name_to_idx[k]: v for k, v in result.items()}
    return extra


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
}
