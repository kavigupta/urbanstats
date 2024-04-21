import json
import numpy as np

import tqdm.auto as tqdm

from create_website import get_statistic_column_path

from produce_html_page import internal_statistic_names
from urbanstats.protobuf.utils import save_data_list, save_string_list


def output_ordering(site_folder, ordering):
    result = {}
    for universe in ordering:
        result[universe] = output_ordering_for_universe(site_folder, universe, ordering)
    with open(f"react/src/data/counts_by_article_type.json", "w") as f:
        json.dump(result, f)


def output_ordering_for_universe(site_folder, universe, ordering):
    counts = {}
    for statistic_column in tqdm.tqdm(
        internal_statistic_names(), desc=f"outputting ordinals for {universe}"
    ):
        statistic_column_path = get_statistic_column_path(statistic_column)
        path = f"{site_folder}/order/{universe}_{statistic_column_path}__overall.gz"
        ordered = ordering.overall_ordinal[statistic_column]
        save_string_list(
            ordered.ordered_longnames,
            path,
        )
        counts[statistic_column, "overall"] = int(
            (~np.isnan(ordered.ordered_values)).sum()
        )
        for typ in sorted(ordering.ordinal_by_type):
            path = f"{site_folder}/order/{universe}_{statistic_column_path}__{typ}.gz"
            ordered = ordering.ordinal_by_type[typ][statistic_column]
            ordered_longnames = ordered.ordered_longnames
            ordered_values = ordered.ordered_values
            counts[statistic_column, typ] = int((~np.isnan(ordered_values)).sum())
            ordered_percentile = ordered.ordered_percentiles_by_population
            save_string_list(ordered_longnames, path)
            save_data_list(
                ordered_values, ordered_percentile, path.replace(".gz", "_data.gz")
            )
    return list(counts.items())
