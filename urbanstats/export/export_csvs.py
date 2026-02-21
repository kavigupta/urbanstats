import argparse

import numpy as np
import tqdm.auto as tqdm

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.statistics.output_statistics_metadata import (
    get_statistic_categories,
    statistic_internal_to_display_name,
)
from urbanstats.website_data.table import shapefile_without_ordinals

shapefiles_by_type = {sh.meta["type"]: sh for sh in shapefiles.values()}


def csv_for(typ, category):
    sh = shapefiles_by_type[typ]
    if "geoid" in sh.available_columns:
        table = sh.load_file()
        geoid_map = dict(zip(table.longname, table.geoid))
    else:
        geoid_map = None
    result = shapefile_without_ordinals().set_index("longname")
    stats_to_use = [x for x, y in get_statistic_categories().items() if y == category]
    result_for_type = result[result.type == typ]
    result = result_for_type[stats_to_use].rename(
        columns={x: statistic_internal_to_display_name()[x] for x in stats_to_use}
    )
    columns_mask = ~np.isnan(result).all()
    result = result[result.columns[columns_mask]]
    if geoid_map is not None:
        result["geoid"] = result_for_type.index.map(geoid_map)
    return result


def export_all_csvs(folder):
    for typ in tqdm.tqdm(sorted(set(shapefile_without_ordinals().type))):
        for category in sorted(set(get_statistic_categories().values())):
            csv_for(typ, category).to_csv(f"{folder}/{typ}_{category}.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Export all shape/statistic CSVs to a folder."
    )
    parser.add_argument("folder", help="Output folder for CSV files")
    args = parser.parse_args()
    export_all_csvs(args.folder)
