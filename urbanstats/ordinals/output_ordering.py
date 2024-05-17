import json
import numpy as np

import tqdm.auto as tqdm

from create_website import get_statistic_column_path

from produce_html_page import internal_statistic_names
from urbanstats.protobuf.utils import (
    save_data_list,
    save_ordered_list,
    save_string_list,
)


def output_ordering(site_folder, ordering):
    result = {}
    for universe in ordering:
        result[universe] = output_ordering_for_universe(
            site_folder, universe, ordering[universe]
        )
    with open(f"react/src/data/counts_by_article_type.json", "w") as f:
        json.dump(result, f)


def output_ordering_for_universe(site_folder, universe, ordering):
    order_backmap = {}
    for typ in sorted(ordering.ordinal_by_type):
        # output a string list to /index/universe_typ.gz
        path = f"{site_folder}/index/{universe}_{typ}.gz"
        ordered = ordering.ordinal_by_type[typ].all_names
        save_string_list(ordered, path)
        order_backmap[typ] = {name: i for i, name in enumerate(ordered)}
    path = f"{site_folder}/index/{universe}_overall.gz"
    ordered = ordering.overall_ordinal.all_names
    save_string_list(ordered, path)
    order_backmap["overall"] = {name: i for i, name in enumerate(ordered)}
    counts = {}
    for statistic_column in tqdm.tqdm(
        internal_statistic_names(), desc=f"outputting ordinals for {universe}"
    ):
        statistic_column_path = get_statistic_column_path(statistic_column)
        path = f"{site_folder}/order/{universe}_{statistic_column_path}__overall.gz"
        ordered = ordering.overall_ordinal.ordinals_by_stat[statistic_column]
        save_ordered_list(
            [order_backmap["overall"][name] for name in ordered.ordered_longnames],
            path,
        )
        counts[statistic_column, "overall"] = int(
            (~np.isnan(ordered.ordered_values)).sum()
        )
        for typ in sorted(ordering.ordinal_by_type):
            path = f"{site_folder}/order/{universe}_{statistic_column_path}__{typ}.gz"
            ordered = ordering.ordinal_by_type[typ].ordinals_by_stat[statistic_column]
            idx = [order_backmap[typ][name] for name in ordered.ordered_longnames]
            save_ordered_list(idx, path)
            ordered_values = ordered.ordered_values
            counts[statistic_column, typ] = int((~np.isnan(ordered_values)).sum())
            ordered_percentile = ordered.ordered_percentiles_by_population
            save_data_list(
                ordered_values, ordered_percentile, path.replace(".gz", "_data.gz")
            )
    return list(counts.items())
