import json

import numpy as np
import tqdm.auto as tqdm

from produce_html_page import (
    internal_statistic_names,
    statistic_internal_to_display_name,
)
from urbanstats.protobuf.utils import save_string_list


def compress_counts_sequence(counts):
    """
    Take a sequence like [50, 50, 50, 32, 32, 64] and compress it into
        [[50, 3], [32, 2], [64, 1]]
    """
    result = []
    for c in counts:
        if not result or result[-1][0] != c:
            result.append([c, 1])
        else:
            result[-1][1] += 1
    return result


def compress_counts(counts):
    statcols = list(statistic_internal_to_display_name())
    counts_new = {}
    for k in counts:
        counts_for_universe = {}
        for (column, typ), count in counts[k]:
            column = tuple(column) if isinstance(column, list) else column
            if typ not in counts_for_universe:
                counts_for_universe[typ] = {}
            counts_for_universe[typ][column] = count
        counts_for_universe = {
            typ: compress_counts_sequence(
                [counts_for_universe[typ][col] for col in statcols]
            )
            for typ in counts_for_universe
        }
        counts_new[k] = counts_for_universe
    return counts_new


def output_ordering(site_folder, ordering):
    result = {}
    order_map_all = []
    data_map_all = []
    for universe in ordering:
        result[universe], order_map, data_map = output_ordering_for_universe(
            site_folder, universe, ordering[universe]
        )
        order_map_all += order_map
        data_map_all += data_map
    with open(f"react/src/data/counts_by_article_type.json", "w") as f:
        json.dump(compress_counts(result), f)
    with open(f"react/src/data/order_links.json", "w") as f:
        json.dump(mapify(order_map_all), f)
    with open(f"react/src/data/data_links.json", "w") as f:
        json.dump(mapify(data_map_all), f)


def mapify(lst):
    result = {}
    for (a, b, c), v in lst:
        result[f"{a}__{b}__{c}"] = v
    return result


def output_ordering_for_universe(site_folder, universe, ordering):
    order_backmap = output_indices(site_folder, universe, ordering)
    counts = {}
    order_map = []
    order_map += ordering.overall_ordinal.output_order_files(
        site_folder, universe, "overall", order_backmap
    )
    data_map = []
    for typ in sorted(ordering.ordinal_by_type):
        order_map += ordering.ordinal_by_type[typ].output_order_files(
            site_folder, universe, typ, order_backmap
        )
        data_map += ordering.ordinal_by_type[typ].output_data_files(
            site_folder, universe, typ
        )
    for statistic_column in tqdm.tqdm(
        internal_statistic_names(), desc=f"counting {universe}"
    ):
        counts[statistic_column, "overall"] = ordering.overall_ordinal.ordinals_by_stat[
            statistic_column
        ].count
        for typ in sorted(ordering.ordinal_by_type):
            counts[statistic_column, typ] = (
                ordering.ordinal_by_type[typ].ordinals_by_stat[statistic_column].count
            )
    return list(counts.items()), order_map, data_map


def output_indices(site_folder, universe, ordering):
    order_backmap = {}
    for typ in sorted(ordering.ordinal_by_type):
        # output a string list to /index/universe/typ.gz
        path = f"{site_folder}/index/{universe}/{typ}.gz"
        ordered = ordering.ordinal_by_type[typ].all_names
        save_string_list(ordered, path)
        order_backmap[typ] = {name: i for i, name in enumerate(ordered)}
    path = f"{site_folder}/index/{universe}/overall.gz"
    ordered = ordering.overall_ordinal.all_names
    save_string_list(ordered, path)
    order_backmap["overall"] = {name: i for i, name in enumerate(ordered)}
    return order_backmap
