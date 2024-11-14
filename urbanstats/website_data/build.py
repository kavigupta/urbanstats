import hashlib
import os
import shutil
import subprocess

from urbanstats.consolidated_data.produce_consolidated_data import (
    full_consolidated_data,
    output_names,
)
from urbanstats.games.quiz import generate_quizzes
from urbanstats.games.retrostat import generate_retrostats
from urbanstats.geometry.relationship import map_relationships_by_type
from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx
from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.geometry.shapefiles.shapefiles_list import localized_type_names
from urbanstats.mapper.ramp import output_ramps
from urbanstats.ordinals.ordering_info_outputter import output_ordering
from urbanstats.protobuf.data_files_pb2_hash import proto_hash
from urbanstats.special_cases import symlinks
from urbanstats.statistics.collections.industry import IndustryStatistics
from urbanstats.statistics.collections.occupation import OccupationStatistics
from urbanstats.statistics.output_statistics_metadata import (
    internal_statistic_names,
    output_statistics_metadata,
)
from urbanstats.universe.icons import place_icons_in_site_folder
from urbanstats.universe.universe_list import all_universes, default_universes
from urbanstats.website_data.create_article_gzips import (
    create_article_gzips,
    extra_stats,
)
from urbanstats.website_data.index import export_index
from urbanstats.website_data.ordinals import all_ordinals
from urbanstats.website_data.output_geometry import produce_all_geometry_json
from urbanstats.website_data.table import shapefile_without_ordinals

from ..utils import output_typescript


def check_proto_hash():
    with open("data_files.proto", "rb") as f:
        h = hashlib.sha256(f.read()).hexdigest()
    if h == proto_hash:
        return
    raise ValueError(
        "data_files.proto has changed, please run `bash scripts/build-protos.sh`"
    )


def link_scripts_folder(site_folder, dev):
    if os.path.islink(f"{site_folder}/scripts"):
        os.unlink(f"{site_folder}/scripts")
    else:
        shutil.rmtree(f"{site_folder}/scripts")
    if dev:
        os.symlink(f"{os.getcwd()}/dist", f"{site_folder}/scripts", True)
    else:
        shutil.copytree("dist", f"{site_folder}/scripts")


def create_react_jsons():
    with open("react/src/data/map_relationship.ts", "w") as f:
        output_typescript(map_relationships_by_type, f)

    with open("react/src/data/type_to_type_category.ts", "w") as f:
        output_typescript(type_to_type_category, f, data_type="Record<string, string>")

    with open("react/src/data/type_ordering_idx.ts", "w") as f:
        output_typescript(type_ordering_idx, f, data_type="Record<string, number>")

    output_statistics_metadata()

    with open("react/src/data/universes_ordered.ts", "w") as f:
        output_typescript(list(all_universes()), f)

    with open("react/src/data/universes_default.ts", "w") as f:
        output_typescript(default_universes, f)

    with open("react/src/data/explanation_industry_occupation_table.ts", "w") as f:
        output_typescript(
            {
                "industry": IndustryStatistics().table(),
                "occupation": OccupationStatistics().table(),
            },
            f,
        )

    with open("react/src/data/extra_stats.ts", "w") as f:
        output_typescript(
            [
                (k, v.extra_stat_spec(list(internal_statistic_names())))
                for k, v in sorted(extra_stats().items())
            ],
            f,
        )

    mapper_folder = "react/src/data/mapper"
    try:
        os.makedirs(mapper_folder)
    except FileExistsError:
        pass

    output_names(mapper_folder)
    output_ramps(mapper_folder)

    with open("react/src/data/localized_type_names.ts", "w") as f:
        output_typescript(
            list(localized_type_names.items()),
            f,
            data_type="[string, Record<string, string>][]",
        )

    with open("react/src/data/symlinks.ts", "w") as f:
        output_typescript(symlinks.symlinks, f, data_type="Record<string, string>")


def build_react_site(site_folder, dev):
    subprocess.run(f"cd react; npm {'i' if dev else 'ci'}", shell=True, check=True)

    create_react_jsons()

    subprocess.run(
        ["npx", "eslint", "--fix", "src/data"],
        check=True,
        cwd="react",
    )

    subprocess.run(
        f"cd react; npm run {'dev' if dev else 'prod'}", shell=True, check=not dev
    )

    link_scripts_folder(site_folder, dev)


def build_urbanstats(
    site_folder,
    *,
    no_geo=False,
    no_data=False,
    no_juxta=False,
    no_data_jsons=False,
    no_index=False,
    dev=False,
):
    check_proto_hash()
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

    if not no_data:
        if not no_data_jsons:
            create_article_gzips(
                site_folder, shapefile_without_ordinals(), all_ordinals()
            )

        if not no_index:
            export_index(shapefile_without_ordinals(), site_folder)

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

    with open(f"{site_folder}/CNAME", "w") as f:
        f.write("urbanstats.org")

    with open(f"{site_folder}/.nojekyll", "w") as f:
        f.write("")

    build_react_site(site_folder, dev)

    place_icons_in_site_folder(site_folder)

    if not no_juxta:
        generate_quizzes(f"{site_folder}/quiz/")
    generate_retrostats(f"{site_folder}/retrostat")
