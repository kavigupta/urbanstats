
import fire
import tqdm.auto as tqdm

from create_website import full_shapefile
from produce_html_page import get_statistic_categories, get_statistic_names


def csv_for(typ, category):
    result = full_shapefile().set_index("longname")
    stats_to_use = [x for x, y in get_statistic_categories().items() if y == category]
    result_for_type = result[result.type == typ]
    return result_for_type[[x for x in stats_to_use]].rename(
        columns={x: get_statistic_names()[x] for x in stats_to_use}
    )


def export_all_csvs(folder):
    for typ in tqdm.tqdm(sorted(set(full_shapefile().type))):
        for category in sorted(set(get_statistic_categories().values())):
            csv_for(typ, category).to_csv(f"{folder}/{typ}_{category}.csv")

if __name__ == "__main__":
    fire.Fire(export_all_csvs)