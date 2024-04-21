import json
import numpy as np

from create_website import get_statistic_column_path

from produce_html_page import internal_statistic_names
from urbanstats.protobuf.utils import save_data_list, save_string_list


def output_ordering(site_folder, full, ordering):
    counts = {}
    for statistic_column in internal_statistic_names():
        print(statistic_column)
        full_by_name = full[
            [
                "longname",
                "type",
                (statistic_column, "overall_ordinal"),
                (statistic_column, "percentile_by_population"),
                statistic_column,
            ]
        ].sort_values("longname")
        full_sorted = full_by_name.sort_values(
            (statistic_column, "overall_ordinal"), kind="stable"
        )
        statistic_column_path = get_statistic_column_path(statistic_column)
        path = f"{site_folder}/order/{statistic_column_path}__overall.gz"
        save_string_list(
            ordering.overall_ordinal[statistic_column].ordered_longnames,
            path,
        )
        counts[statistic_column, "overall"] = int(
            (~np.isnan(full_sorted[statistic_column])).sum()
        )
        for typ in sorted(set(full_sorted.type)):
            path = f"{site_folder}/order/{statistic_column_path}__{typ}.gz"
            for_typ = full_sorted[full_sorted.type == typ]
            value = for_typ[statistic_column]
            counts[statistic_column, typ] = int((~np.isnan(value)).sum())
            ordered = ordering.ordinal_by_type[typ][statistic_column]
            ordered_longnames = ordered.ordered_longnames
            ordered_values = ordered.ordered_values
            ordered_percentile = ordered.ordered_percentiles_by_population
            save_string_list(ordered_longnames, path)
            percentile = for_typ[(statistic_column, "percentile_by_population")]
            save_data_list(ordered_values, ordered_percentile, path.replace(".gz", "_data.gz"))

    with open(f"react/src/data/counts_by_article_type.json", "w") as f:
        json.dump(list(counts.items()), f)
