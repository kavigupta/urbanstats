import json
import os
import shutil
from functools import lru_cache

import fire
import tqdm.auto as tqdm

from output_geometry import produce_all_geometry_json
from produce_html_page import create_page_json, extra_stats
from relationship import full_relationships, map_relationships_by_type
from relationship import ordering_idx as type_ordering_idx
from relationship import type_to_type_category
from shapefiles import american_to_international, shapefiles
from urbanstats.consolidated_data.produce_consolidated_data import (
    full_consolidated_data,
    output_names,
)
from urbanstats.mapper.ramp import output_ramps
from urbanstats.ordinals.flat_ordinals import compute_flat_ordinals
from urbanstats.special_cases import symlinks
from urbanstats.special_cases.simplified_country import all_simplified_countries
from urbanstats.statistics.collections.industry import IndustryStatistics
from urbanstats.statistics.collections.occupation import OccupationStatistics
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import (
    internal_statistic_names,
    output_statistics_metadata,
)
from urbanstats.universe.annotate_universes import (
    all_universes,
)
from urbanstats.universe.icons import place_icons_in_site_folder
from urbanstats.website_data.index import export_index
from urbanstats.website_data.ordinals import all_ordinals
from urbanstats.website_data.table import shapefile_without_ordinals


def create_page_jsons(site_folder, full, ordering):
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))
    long_to_idx = {x: i for i, x in enumerate(full.longname)}

    flat_ords = compute_flat_ordinals(full, ordering)

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
            long_to_idx,
            flat_ords,
        )


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


def link_scripts_folder(site_folder, dev):
    if os.path.islink(f"{site_folder}/scripts"):
        os.unlink(f"{site_folder}/scripts")
    else:
        shutil.rmtree(f"{site_folder}/scripts")
    if dev:
        os.symlink(f"{os.getcwd()}/dist", f"{site_folder}/scripts", True)
    else:
        shutil.copytree("dist", f"{site_folder}/scripts")


def main(
    site_folder,
    no_geo=False,
    no_data=False,
    no_juxta=False,
    no_data_jsons=False,
    no_index=False,
    dev=False,
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

        from urbanstats.ordinals.ordering_info_outputter import output_ordering

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

    shutil.copy("icons/main/thumbnail.png", f"{site_folder}/")
    shutil.copy("icons/main/banner.png", f"{site_folder}/")
    shutil.copy("icons/main/banner-dark.png", f"{site_folder}/")
    shutil.copy("icons/main/screenshot_footer.svg", f"{site_folder}/")
    shutil.copy("icons/main/share.png", f"{site_folder}/")
    shutil.copy("icons/main/screenshot.png", f"{site_folder}/")
    shutil.copy("icons/main/download.png", f"{site_folder}/")

    with open("react/src/data/map_relationship.json", "w") as f:
        json.dump(map_relationships_by_type, f)

    with open("react/src/data/type_to_type_category.json", "w") as f:
        json.dump(type_to_type_category, f)

    with open("react/src/data/type_ordering_idx.json", "w") as f:
        json.dump(type_ordering_idx, f)

    output_statistics_metadata()

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

    with open("react/src/data/extra_stats.json", "w") as f:
        json.dump(
            [(k, v.extra_stat_spec()) for k, v in sorted(extra_stats().items())],
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

    with open(f"react/src/data/symlinks.json", "w") as f:
        json.dump(symlinks.symlinks, f)

    os.system(
        f"cd react; npm {'i' if dev else 'ci'}; npm run {'dev' if dev else 'prod'}"
    )

    link_scripts_folder(site_folder, dev)

    place_icons_in_site_folder(site_folder)

    from urbanstats.games.quiz import generate_quizzes
    from urbanstats.games.retrostat import generate_retrostats

    if not no_juxta:
        generate_quizzes(f"{site_folder}/quiz/")
    generate_retrostats(f"{site_folder}/retrostat")


if __name__ == "__main__":
    fire.Fire(main)
