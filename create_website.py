from functools import lru_cache
import os
import json
import shutil
import fire
import numpy as np

import pandas as pd
from shapefiles import shapefiles
from collections import Counter

import tqdm.auto as tqdm

from output_geometry import produce_all_geometry_json
from stats_for_shapefile import compute_statistics_for_shapefile
from produce_html_page import (
    add_ordinals,
    create_page_json,
    get_explanation_page,
    get_statistic_categories,
    internal_statistic_names,
    category_metadata,
    statistic_internal_to_display_name,
)
from relationship import full_relationships, map_relationships_by_type
from election_data import vest_elections
from urbanstats.consolidated_data.produce_consolidated_data import (
    full_consolidated_data,
    output_names,
)
from urbanstats.mapper.ramp import output_ramps

from urbanstats.protobuf.utils import save_string_list

folder = "/home/kavi/temp/site/"


def shapefile_without_ordinals():
    full = [
        compute_statistics_for_shapefile(shapefiles[k])
        for k in tqdm.tqdm(shapefiles, desc="computing statistics")
    ]
    full = pd.concat(full)
    full = full.reset_index(drop=True)
    for elect in vest_elections:
        full[elect.name, "margin"] = (
            full[elect.name, "dem"] - full[elect.name, "gop"]
        ) / full[elect.name, "total"]
    full[("2016-2020 Swing", "margin")] = (
        full[("2020 Presidential Election", "margin")]
        - full[("2016 Presidential Election", "margin")]
    )
    # Simply abolish local government tbh. How is this a thing.
    # https://www.openstreetmap.org/user/Minh%20Nguyen/diary/398893#:~:text=An%20administrative%20area%E2%80%99s%20name%20is%20unique%20within%20its%20immediate%20containing%20area%20%E2%80%93%20false
    # Ban both of these from the database
    full = full[full.longname != "Washington township [CCD], Union County, Ohio, USA"]
    full = full[full.population > 0].copy()
    duplicates = {k: v for k, v in Counter(full.longname).items() if v > 1}
    assert not duplicates, str(duplicates)
    return full


@lru_cache(maxsize=None)
def full_shapefile():
    full = shapefile_without_ordinals()
    full = pd.concat(
        [
            add_ordinals(full[full.type == x], overall_ordinal=False)
            for x in tqdm.tqdm(sorted(set(full.type)), desc="adding ordinals")
        ]
    )
    full = add_ordinals(full, overall_ordinal=True)
    full = full.sort_values("population")[::-1]
    return full


def next_prev(full):
    statistic_names = internal_statistic_names()
    by_statistic = {k: {} for k in statistic_names}
    for statistic in tqdm.tqdm(statistic_names, desc="next_prev"):
        s_full = full.sort_values("longname").sort_values(
            statistic, ascending=False, kind="stable"
        )
        names = list(s_full.longname)
        for prev, current, next in zip([None, *names[:-1]], names, [*names[1:], None]):
            by_statistic[statistic][current] = prev, next

    return by_statistic


def next_prev_within_type(full):
    statistic_names = internal_statistic_names()
    by_statistic = {k: {} for k in statistic_names}
    for type in sorted(set(full.type)):
        result = next_prev(full[full.type == type])
        for statistic in statistic_names:
            by_statistic[statistic].update(result[statistic])

    return by_statistic


def create_page_jsons(full):
    # ptrs_overall = next_prev(full)
    # ptrs_within_type = next_prev_within_type(full)
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))

    relationships = full_relationships(long_to_type)
    for i in tqdm.trange(full.shape[0], desc="creating pages"):
        row = full.iloc[i]
        create_page_json(
            f"{folder}/data",
            row,
            relationships,
            long_to_short,
            long_to_pop,
            long_to_type,
        )


def output_categories():
    assert set(internal_statistic_names()) == set(get_statistic_categories())
    assert set(get_statistic_categories().values()) == set(category_metadata)
    return [dict(key=k, **v) for k, v in category_metadata.items()]


def get_statistic_column_path(column):
    if isinstance(column, tuple):
        column = "-".join(str(x) for x in column)
    return column.replace("/", " slash ")


def output_ordering(full):
    counts = {}
    for statistic_column in internal_statistic_names():
        print(statistic_column)
        full_by_name = full[
            [
                "longname",
                "type",
                (statistic_column, "overall_ordinal"),
                statistic_column,
            ]
        ].sort_values("longname")
        full_sorted = full_by_name.sort_values(
            (statistic_column, "overall_ordinal"), kind="stable"
        )
        statistic_column_path = get_statistic_column_path(statistic_column)
        path = f"{folder}/order/{statistic_column_path}__overall.gz"
        save_string_list(list(full_sorted.longname), path)
        counts[statistic_column, "overall"] = int(
            (~np.isnan(full_sorted[statistic_column])).sum()
        )
        for typ in sorted(set(full_sorted.type)):
            path = f"{folder}/order/{statistic_column_path}__{typ}.gz"
            for_typ = full_sorted[full_sorted.type == typ]
            names = for_typ.longname
            counts[statistic_column, typ] = int(
                (~np.isnan(for_typ[statistic_column])).sum()
            )
            save_string_list(list(names), path)

    with open(f"react/src/data/counts_by_article_type.json", "w") as f:
        json.dump(list(counts.items()), f)


def main(no_geo=False, no_data=False, no_data_jsons=False):
    for sub in [
        "index",
        "r",
        "shape",
        "data",
        "styles",
        "scripts",
        "order",
        "quiz",
        "retrostat",
    ]:
        try:
            os.makedirs(f"{folder}/{sub}")
        except FileExistsError:
            pass

    if not no_geo:
        full = full_shapefile()
        produce_all_geometry_json(f"{folder}/shape", set(full.longname))

    if not no_data:
        full = full_shapefile()
        if not no_data_jsons:
            create_page_jsons(full)
        save_string_list(list(full.longname), f"{folder}/index/pages.gz")

        with open(f"{folder}/index/population.json", "w") as f:
            json.dump(list(full.population), f)
        output_ordering(full)

        full_consolidated_data(folder)

    shutil.copy("html_templates/article.html", f"{folder}")
    shutil.copy("html_templates/index.html", f"{folder}/")
    shutil.copy("html_templates/about.html", f"{folder}/")
    shutil.copy("html_templates/data-credit.html", f"{folder}/")
    shutil.copy("html_templates/mapper.html", f"{folder}/")
    shutil.copy("html_templates/quiz.html", f"{folder}")

    shutil.copy("thumbnail.png", f"{folder}/")
    shutil.copy("banner.png", f"{folder}/")
    shutil.copy("share.png", f"{folder}/")

    with open("react/src/data/map_relationship.json", "w") as f:
        json.dump(map_relationships_by_type, f)

    with open(f"react/src/data/statistic_category_metadata.json", "w") as f:
        json.dump(output_categories(), f)
    with open(f"react/src/data/statistic_category_list.json", "w") as f:
        json.dump(list(get_statistic_categories().values()), f)
    with open(f"react/src/data/statistic_name_list.json", "w") as f:
        json.dump(list(statistic_internal_to_display_name().values()), f)
    with open(f"react/src/data/statistic_path_list.json", "w") as f:
        json.dump(
            list(
                [
                    get_statistic_column_path(name)
                    for name in statistic_internal_to_display_name()
                ]
            ),
            f,
        )
    with open(f"react/src/data/statistic_list.json", "w") as f:
        json.dump(list([name for name in statistic_internal_to_display_name()]), f)
    with open(f"react/src/data/explanation_page.json", "w") as f:
        json.dump(list([name for name in get_explanation_page().values()]), f)

    output_names()
    output_ramps()

    from urbanstats.games.quiz import generate_quiz_info_for_website

    generate_quiz_info_for_website("/home/kavi/temp/site")

    with open(f"{folder}/CNAME", "w") as f:
        f.write("urbanstats.org")

    with open(f"{folder}/.nojekyll", "w") as f:
        f.write("")

    os.system("cd react; npm run dev")
    shutil.copy("dist/article.js", f"{folder}/scripts/")
    shutil.copy("dist/index.js", f"{folder}/scripts/")
    shutil.copy("dist/about.js", f"{folder}/scripts/")
    shutil.copy("dist/data-credit.js", f"{folder}/scripts/")
    shutil.copy("dist/mapper.js", f"{folder}/scripts/")
    shutil.copy("dist/quiz.js", f"{folder}/scripts/")

    from urbanstats.games.quiz import generate_quizzes
    from urbanstats.games.retrostat import generate_retrostats

    generate_quizzes(f"{folder}/quiz/")
    generate_retrostats(f"{folder}/retrostat")


if __name__ == "__main__":
    fire.Fire(main)
