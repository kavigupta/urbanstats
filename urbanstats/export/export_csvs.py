import fire
import tqdm.auto as tqdm

from create_website import shapefile_without_ordinals
from urbanstats.statistics.output_statistics_metadata import (
    get_statistic_categories,
    statistic_internal_to_display_name,
)


def csv_for(typ, category):
    result = shapefile_without_ordinals().set_index("longname")
    stats_to_use = [x for x, y in get_statistic_categories().items() if y == category]
    result_for_type = result[result.type == typ]
    return result_for_type[[x for x in stats_to_use]].rename(
        columns={x: statistic_internal_to_display_name()[x] for x in stats_to_use}
    )


def export_all_csvs(folder):
    for typ in tqdm.tqdm(sorted(set(shapefile_without_ordinals().type))):
        for category in sorted(set(get_statistic_categories().values())):
            csv_for(typ, category).to_csv(f"{folder}/{typ}_{category}.csv")


if __name__ == "__main__":
    fire.Fire(export_all_csvs)
