import json
import os
import shutil
from collections import Counter
from functools import lru_cache

import fire
import numpy as np
import pandas as pd
import tqdm.auto as tqdm

from election_data import vest_elections
from output_geometry import produce_all_geometry_json
from produce_html_page import (
    category_metadata,
    create_page_json,
    get_explanation_page,
    get_statistic_categories,
    internal_statistic_names,
    statistic_internal_to_display_name,
)
from relationship import full_relationships, map_relationships_by_type
from relationship import ordering_idx as type_ordering_idx
from relationship import type_to_type_category
from shapefiles import american_to_international, shapefiles, shapefiles_for_stats
from stats_for_shapefile import compute_statistics_for_shapefile
from urbanstats.consolidated_data.produce_consolidated_data import (
    full_consolidated_data,
    output_names,
)
from urbanstats.data.gpw import compute_gpw_data_for_shapefile_table
from urbanstats.mapper.ramp import output_ramps
from urbanstats.ordinals.compute_ordinals import (
    add_ordinals,
    compute_all_ordinals,
    compute_all_ordinals_for_universe,
)
from urbanstats.protobuf.utils import save_data_list, save_string_list
from urbanstats.special_cases.merge_international import (
    merge_international_and_domestic,
)
from urbanstats.special_cases.simplified_country import all_simplified_countries
from urbanstats.statistics.collections.industry import IndustryStatistics
from urbanstats.statistics.collections.occupation import OccupationStatistics
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.universe.annotate_universes import (
    all_universes,
    attach_intl_universes,
    attach_usa_universes,
)
from urbanstats.universe.icons import place_icons_in_site_folder
from urbanstats.website_data.index import export_index


def american_shapefile():
    full = [
        compute_statistics_for_shapefile(shapefiles_for_stats[k])
        for k in tqdm.tqdm(shapefiles_for_stats, desc="computing statistics")
        if shapefiles_for_stats[k].american
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
    for s in shapefiles_for_stats.values():
        if s.include_in_gpw:
            t = compute_gpw_data_for_shapefile_table(s)
            for k in s.meta:
                t[k] = s.meta[k]
            ts.append(t)
    intl = pd.concat(ts)
    # intl = intl[intl.area > 10].copy()
    intl = intl[intl.gpw_population > 0].copy()
    intl = intl.reset_index(drop=True)
    return intl


@lru_cache(maxsize=None)
def shapefile_without_ordinals():
    usa = american_shapefile()
    attach_usa_universes(usa)
    intl = international_shapefile()
    attach_intl_universes(intl)
    full = merge_international_and_domestic(intl, usa)
    return full


@lru_cache(maxsize=None)
def all_ordinals():
    full = shapefile_without_ordinals()
    keys = internal_statistic_names()
    all_ords = compute_all_ordinals(full, keys)
    return all_ords


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


def create_page_jsons(site_folder, full, ordering):
    # ptrs_overall = next_prev(full)
    # ptrs_within_type = next_prev_within_type(full)
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))

    relationships = full_relationships(long_to_type)
    for i in tqdm.trange(full.shape[0], desc="creating pages"):
        row = full.iloc[i]
        create_page_json(
            f"{site_folder}/data",
            row,
            relationships,
            long_to_short,
            long_to_pop,
            long_to_type,
            ordering,
        )


def output_categories():
    assert set(internal_statistic_names()) == set(get_statistic_categories())
    assert set(get_statistic_categories().values()) == set(category_metadata)
    return [dict(key=k, **v) for k, v in category_metadata.items()]


def get_statistic_column_path(column):
    if isinstance(column, tuple):
        column = "-".join(str(x) for x in column)
    return column.replace("/", " slash ")


@lru_cache(maxsize=None)
def get_index_lists():
    real_names = internal_statistic_names()

    def filter_names(filt):
        names = [
            x
            for collection in statistic_collections
            if filt(collection)
            for x in collection.name_for_each_statistic()
        ]
        return sorted([real_names.index(x) for x in names])

    universal_idxs = filter_names(lambda c: c.for_america() and c.for_international())
    usa_idxs = filter_names(lambda c: c.for_america() and not c.for_international())
    gpw_idxs = filter_names(lambda c: c.for_international() and not c.for_america())
    return {
        "index_lists": {
            "universal": universal_idxs,
            "gpw": gpw_idxs,
            "usa": usa_idxs,
        },
        "type_to_has_gpw": {
            s.meta["type"]: s.include_in_gpw for s in shapefiles.values()
        },
    }


def main(
    site_folder,
    no_geo=False,
    no_data=False,
    no_juxta=False,
    no_data_jsons=False,
    no_index=False,
):
    if not no_geo:
        print("Producing geometry jsons")
    if not no_data_jsons and not no_data:
        print("Producing data for each article")
    if not no_data:
        print("Producing summary data")
    if not no_juxta:
        print("Producing juxta quizzes")
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
        produce_all_geometry_json(
            f"{site_folder}/shape", set(shapefile_without_ordinals().longname)
        )
        all_simplified_countries(shapefile_without_ordinals(), f"{site_folder}/shape")

    if not no_data:
        if not no_data_jsons:
            create_page_jsons(site_folder, shapefile_without_ordinals(), all_ordinals())

        if not no_index:
            export_index(shapefile_without_ordinals(), site_folder)

        from urbanstats.ordinals.output_ordering import output_ordering

        output_ordering(site_folder, all_ordinals())

        full_consolidated_data(site_folder)

    shutil.copy("html_templates/article.html", f"{site_folder}")
    shutil.copy("html_templates/comparison.html", f"{site_folder}")
    shutil.copy("html_templates/statistic.html", f"{site_folder}")
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

    with open("react/src/data/type_to_type_category.json", "w") as f:
        json.dump(type_to_type_category, f)

    with open("react/src/data/type_ordering_idx.json", "w") as f:
        json.dump(type_ordering_idx, f)

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
    with open(f"react/src/data/universes_ordered.json", "w") as f:
        json.dump(list([name for name in all_universes()]), f)
    with open(f"react/src/data/explanation_industry_occupation_table.json", "w") as f:
        json.dump(
            {
                "industry": IndustryStatistics().table(),
                "occupation": OccupationStatistics().table(),
            },
            f,
        )

    output_names()
    output_ramps()

    from urbanstats.games.quiz import generate_quiz_info_for_website

    if not no_juxta:
        generate_quiz_info_for_website(site_folder)

    with open(f"{site_folder}/CNAME", "w") as f:
        f.write("urbanstats.org")

    with open(f"{site_folder}/.nojekyll", "w") as f:
        f.write("")

    with open(f"react/src/data/index_lists.json", "w") as f:
        json.dump(get_index_lists(), f)

    with open(f"react/src/data/american_to_international.json", "w") as f:
        json.dump(american_to_international, f)

    os.system("cd react; npm run prod")
    shutil.rmtree(f"{site_folder}/scripts")
    shutil.copytree("dist", f"{site_folder}/scripts")
    place_icons_in_site_folder(site_folder)

    from urbanstats.games.quiz import generate_quizzes
    from urbanstats.games.retrostat import generate_retrostats

    if not no_juxta:
        generate_quizzes(f"{site_folder}/quiz/")
    generate_retrostats(f"{site_folder}/retrostat")


if __name__ == "__main__":
    fire.Fire(main)
