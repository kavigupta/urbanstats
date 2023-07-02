import os
import json
import shutil
import fire

import pandas as pd
from shapefiles import shapefiles
from collections import Counter

import tqdm.auto as tqdm

from output_geometry import produce_all_geometry_json
from stats_for_shapefile import compute_statistics_for_shapefile
from produce_html_page import add_ordinals, create_page_json, get_statistic_names
from relationship import full_relationships
from election_data import vest_elections


folder = "/home/kavi/temp/site/"


def full_shapefile():
    full = [compute_statistics_for_shapefile(shapefiles[k]) for k in shapefiles]
    full = pd.concat(full)
    for elect in vest_elections:
        full[elect.name, "margin"] = (
            full[elect.name, "dem"] - full[elect.name, "gop"]
        ) / full[elect.name, "total"]
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


def create_page_jsons(full):
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


def main(no_geo=False, no_data=False):
    for sub in ["index", "r", "shape", "data", "styles", "scripts"]:
        try:
            os.makedirs(f"{folder}/{sub}")
        except FileExistsError:
            pass

    full = full_shapefile()

    if not no_geo:
        produce_all_geometry_json(f"{folder}/shape", set(full.longname))

    if not no_data:
        create_page_jsons(full)

    shutil.copy("html_templates/article.html", f"{folder}")
    shutil.copy("html_templates/index.html", f"{folder}/")
    shutil.copy("html_templates/about.html", f"{folder}/")
    shutil.copy("html_templates/data-credit.html", f"{folder}/")

    shutil.copy("thumbnail.png", f"{folder}/")
    shutil.copy("banner.png", f"{folder}/")

    os.system("cd react; npm run dev")
    shutil.copy("dist/article.js", f"{folder}/scripts/")
    shutil.copy("dist/index.js", f"{folder}/scripts/")
    shutil.copy("dist/about.js", f"{folder}/scripts/")
    shutil.copy("dist/data-credit.js", f"{folder}/scripts/")

    with open(f"{folder}/index/pages.json", "w") as f:
        json.dump(list(full.longname), f)

    with open(f"{folder}/index/population.json", "w") as f:
        json.dump(list(full.population), f)

    with open(f"{folder}/CNAME", "w") as f:
        f.write("urbanstats.org")


if __name__ == "__main__":
    fire.Fire(main)
