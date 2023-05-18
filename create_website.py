import json
import shutil
import pandas as pd
from shapefiles import shapefiles

import tqdm.auto as tqdm

from output_geometry import produce_all_geometry_json
from stats_for_shapefile import compute_statistics_for_shapefile
from produce_html_page import add_ordinals, create_page, get_statistic_names
from relationship import full_relationships


folder = "/home/kavi/temp/site/"


def full_shapefile():
    full = [compute_statistics_for_shapefile(shapefiles[k]) for k in shapefiles]
    full = pd.concat(full)
    full = full[full.population > 0].copy()
    full = pd.concat(
        [add_ordinals(full[full.type == x]) for x in sorted(set(full.type))]
    )
    full = full.sort_values("population")[::-1]
    return full


def next_prev(full):
    statistic_names = get_statistic_names()
    by_statistic = {k: {} for k in statistic_names}
    for statistic in statistic_names:
        s_full = full.sort_values(statistic)[::-1]
        names = list(s_full.longname)
        for prev, current, next in zip([None, *names[:-1]], names, [*names[1:], None]):
            by_statistic[statistic][current] = prev, next

    return by_statistic


def next_prev_within_type(full):
    statistic_names = get_statistic_names()
    by_statistic = {k: {} for k in statistic_names}
    for type in sorted(set(full.type)):
        result = next_prev(full[full.type == type])
        for statistic in statistic_names:
            by_statistic[statistic].update(result[statistic])

    return by_statistic


def main():
    full = full_shapefile()
    print(list(full))
    long_to_short = dict(zip(full.longname, full.shortname))

    produce_all_geometry_json(f"{folder}/w", set(long_to_short))

    ptrs_overall = next_prev(full)
    ptrs_within_type = next_prev_within_type(full)
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))
    relationships = full_relationships()

    path = f"{folder}/w"

    filt = full
    # filt = full[full.longname.apply(lambda x: "Rhode Island" in x)]
    # result_wo = add_ordinals(full, statistics)
    for i in tqdm.trange(filt.shape[0]):
        row = filt.iloc[i]
        create_page(
            path,
            row,
            relationships,
            long_to_short,
            long_to_pop,
            long_to_type,
            ptrs_overall,
            ptrs_within_type,
        )

    shutil.copy("html_templates/style.css", f"{folder}/styles/")
    shutil.copy("html_templates/map.js", f"{folder}/scripts/")
    shutil.copy("thumbnail.png", f"{folder}/")
    shutil.copy("banner.png", f"{folder}/")

    with open("html_templates/index.html", "r") as f:
        html = f.read()
    html = html.replace("$regions", json.dumps(list(full.longname)))
    with open("/home/kavi/temp/site/index.html", "w") as f:
        f.write(html)


if __name__ == "__main__":
    main()
