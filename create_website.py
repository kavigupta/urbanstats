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
from urbanstats.data.gpw import compute_gpw_data_for_shapefile_table
from urbanstats.mapper.ramp import output_ramps

from urbanstats.protobuf.utils import save_string_list
from urbanstats.special_cases.simplified_country import all_simplified_countries


def american_shapefile():
    full = [
        compute_statistics_for_shapefile(shapefiles[k])
        for k in tqdm.tqdm(shapefiles, desc="computing statistics")
        if shapefiles[k].american
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


def international_shapefile():
    ts = []
    for s in shapefiles.values():
        if s.include_in_gpw:
            t = compute_gpw_data_for_shapefile_table(s)
            for k in s.meta:
                t[k] = s.meta[k]
            ts.append(t)
    intl = pd.concat(ts)
    intl = intl[intl.area > 10].copy()
    intl = intl[intl.gpw_population > 0].copy()
    intl = intl.reset_index(drop=True)
    intl["gpw_aw_density"] = intl.gpw_population / intl.area
    return intl


def shapefile_without_ordinals():
    usa = american_shapefile()
    intl = international_shapefile()
    full = pd.concat([usa, intl])
    popu = np.array(full.population)
    popu[np.isnan(popu)] = full.gpw_population[np.isnan(popu)]
    full["best_population_estimate"] = popu
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
    full = full.sort_values("best_population_estimate")[::-1]
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


def get_idxs_by_type():
    from stats_for_shapefile import gpw_stats

    real_names = internal_statistic_names()
    gpw_names = [x for x in real_names if x in gpw_stats] + ["area", "compactness"]
    other_names = [x for x in real_names if x not in gpw_stats]
    gpw_idxs = [internal_statistic_names().index(x) for x in gpw_names]
    other_idxs = [internal_statistic_names().index(x) for x in other_names]
    idxs_by_type = {}
    for s in shapefiles.values():
        typ = s.meta["type"]
        if s.include_in_gpw:
            assert not s.american
            idxs_by_type[typ] = gpw_idxs
        else:
            idxs_by_type[typ] = other_idxs
    return idxs_by_type


def main(site_folder, no_geo=False, no_data=False, no_juxta=False, no_data_jsons=False):
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
            os.makedirs(f"{site_folder}/{sub}")
        except FileExistsError:
            pass

    if not no_geo:
        full = full_shapefile()
        produce_all_geometry_json(f"{site_folder}/shape", set(full.longname))

    if not no_data:
        full = full_shapefile()
        if not no_data_jsons:
            create_page_jsons(full)
        save_string_list(list(full.longname), f"{site_folder}/index/pages.gz")

        with open(f"{site_folder}/index/best_population_estimate.json", "w") as f:
            json.dump(list(full.best_population_estimate), f)

        output_ordering(full)

        full_consolidated_data(site_folder)

        all_simplified_countries(full, f"{site_folder}/shape")

    shutil.copy("html_templates/article.html", f"{site_folder}")
    shutil.copy("html_templates/comparison.html", f"{site_folder}")
    shutil.copy("html_templates/index.html", f"{site_folder}/")
    shutil.copy("html_templates/random.html", f"{site_folder}")
    shutil.copy("html_templates/about.html", f"{site_folder}/")
    shutil.copy("html_templates/data-credit.html", f"{site_folder}/")
    shutil.copy("html_templates/mapper.html", f"{site_folder}/")
    shutil.copy("html_templates/quiz.html", f"{site_folder}")

    shutil.copy("thumbnail.png", f"{site_folder}/")
    shutil.copy("banner.png", f"{site_folder}/")
    shutil.copy("screenshot_footer.svg", f"{site_folder}/")
    shutil.copy("share.png", f"{site_folder}/")
    shutil.copy("screenshot.png", f"{site_folder}/")

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

    if not no_juxta:
        generate_quiz_info_for_website("/home/kavi/temp/site")

    with open(f"{site_folder}/CNAME", "w") as f:
        f.write("urbanstats.org")

    with open(f"{site_folder}/.nojekyll", "w") as f:
        f.write("")

    with open(f"react/src/data/indices_by_type.json", "w") as f:
        json.dump(get_idxs_by_type(), f)

    os.system("cd react; npm run prod")
    shutil.copy("dist/article.js", f"{site_folder}/scripts/")
    shutil.copy("dist/comparison.js", f"{site_folder}/scripts/")
    shutil.copy("dist/index.js", f"{site_folder}/scripts/")
    shutil.copy("dist/random.js", f"{site_folder}/scripts/")
    shutil.copy("dist/about.js", f"{site_folder}/scripts/")
    shutil.copy("dist/data-credit.js", f"{site_folder}/scripts/")
    shutil.copy("dist/mapper.js", f"{site_folder}/scripts/")
    shutil.copy("dist/quiz.js", f"{site_folder}/scripts/")

    from urbanstats.games.quiz import generate_quizzes
    from urbanstats.games.retrostat import generate_retrostats

    if not no_juxta:
        generate_quizzes(f"{site_folder}/quiz/")
    generate_retrostats(f"{site_folder}/retrostat")


if __name__ == "__main__":
    fire.Fire(main)
