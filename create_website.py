import os
import json
import shutil
import pandas as pd
from shapefiles import shapefiles
from collections import Counter

import tqdm.auto as tqdm

from output_geometry import produce_all_geometry_json
from stats_for_shapefile import compute_statistics_for_shapefile
from produce_html_page import add_ordinals, create_page_json, get_statistic_names
from relationship import full_relationships


folder = "/home/kavi/temp/site/"


def full_shapefile():
    full = [compute_statistics_for_shapefile(shapefiles[k]) for k in shapefiles]
    full = pd.concat(full)
    # Simply abolish local government tbh. How is this a thing.
    # https://www.openstreetmap.org/user/Minh%20Nguyen/diary/398893#:~:text=An%20administrative%20area%E2%80%99s%20name%20is%20unique%20within%20its%20immediate%20containing%20area%20%E2%80%93%20false
    # Ban both of these from the database
    full = full[full.longname != "Washington township [CCD], Union County, Ohio, USA"]
    full = full[full.population > 0].copy()
    duplicates = {k: v for k, v in Counter(full.longname).items() if v > 1}
    assert not duplicates, str(duplicates)
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
    try:
        os.makedirs(f"{folder}/index")
    except FileExistsError:
        pass
    try:
        os.makedirs(f"{folder}/r")
    except FileExistsError:
        pass
    try:
        os.makedirs(f"{folder}/shape")
    except FileExistsError:
        pass

    full = full_shapefile()
    print(list(full))
    long_to_short = dict(zip(full.longname, full.shortname))

    produce_all_geometry_json(f"{folder}/shape", set(long_to_short))

    ptrs_overall = next_prev(full)
    ptrs_within_type = next_prev_within_type(full)
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))

    relationships = full_relationships()
    for i in tqdm.trange(full.shape[0]):
        row = full.iloc[i]
        create_page_json(
            f"{folder}/data",
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
    shutil.copy("html_templates/search.js", f"{folder}/scripts/")
    shutil.copy("html_templates/load_json.js", f"{folder}/scripts/")
    shutil.copy("html_templates/index.html", f"{folder}/")
    shutil.copy("html_templates/uniform.html", f"{folder}/r")
    shutil.copy("html_templates/by-population.html", f"{folder}/r")
    shutil.copy("html_templates/article.html", f"{folder}")
    shutil.copy("thumbnail.png", f"{folder}/")
    shutil.copy("banner.png", f"{folder}/")
    os.system("cd react; npm run dev")
    shutil.copy("dist/article.js", f"{folder}/scripts/")

    with open(f"{folder}/index/pages.json", "w") as f:
        json.dump(list(full.longname), f)

    with open(f"{folder}/index/population.json", "w") as f:
        json.dump(list(full.population), f)


if __name__ == "__main__":
    main()
