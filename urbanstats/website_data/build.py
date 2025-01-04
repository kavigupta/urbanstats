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
from urbanstats.universe.icons import (
    all_image_aspect_ratios,
    place_icons_in_site_folder,
)
from urbanstats.universe.universe_list import all_universes, default_universes
from urbanstats.website_data.create_article_gzips import (
    create_article_gzips,
    extra_stats,
)
from urbanstats.website_data.index import export_index
from urbanstats.website_data.ordinals import all_ordinals
from urbanstats.website_data.output_geometry import produce_all_geometry_json
from urbanstats.website_data.sitemap import output_sitemap
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


def link_scripts_folder(site_folder, mode):
    if os.path.islink(f"{site_folder}/scripts"):
        os.unlink(f"{site_folder}/scripts")
    else:
        shutil.rmtree(f"{site_folder}/scripts")
    if mode == "dev":
        os.symlink(f"{os.getcwd()}/dist", f"{site_folder}/scripts", True)
    else:
        shutil.copytree("dist", f"{site_folder}/scripts")


def create_react_jsons():
    with open("react/src/data/map_relationship.ts", "w") as f:
        output_typescript(map_relationships_by_type, f)

    with open("react/src/data/flag_dimensions.ts", "w") as f:
        output_typescript(
            all_image_aspect_ratios(), f, data_type="Record<string, number>"
        )

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


def build_react_site(site_folder, mode):
    if mode != "ci":
        # In ci, we cache the node_modules
        subprocess.run(
            f"cd react; npm {'i' if mode == 'dev' else 'ci'}", shell=True, check=True
        )

    create_react_jsons()

    subprocess.run(
        ["npx", "eslint", "--fix", "src/data"],
        check=True,
        cwd="react",
    )

    subprocess.run(
        f"cd react; npm run {'dev' if mode == 'dev' else 'prod'}",
        shell=True,
        check=mode != "dev",
    )

    link_scripts_folder(site_folder, mode)


# pylint: disable-next=too-many-branches,too-many-arguments,too-many-statements
def build_urbanstats(
    site_folder,
    *,
    no_geo=False,
    no_data=False,
    no_juxta=False,
    no_data_jsons=False,
    no_index=False,
    no_sitemap=False,
    no_ordering=False,
    mode=None,
):
    if not mode:
        print("Must pass --mode=dev,prod,ci")
        return

    check_proto_hash()
    if not no_geo:
        print("Producing geometry jsons")
    if not no_data_jsons and not no_data:
        print("Producing data for each article")
    if not no_index and not no_data:
        print("Producing index")
    if not no_ordering and not no_data:
        print("Producing ordering")
    if not no_sitemap and not no_data:
        print("Producing sitemap")
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
        "sitemaps",
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

        if not no_ordering:
            output_ordering(site_folder, all_ordinals())

        full_consolidated_data(site_folder)

        if not no_sitemap:
            output_sitemap(site_folder, shapefile_without_ordinals(), all_ordinals())

    for entrypoint in [
        "index",
        "article",
        "comparison",
        "statistic",
        "random",
        "about",
        "data-credit",
        "mapper",
    ]:
        with open(f"{site_folder}/{entrypoint}.html", "w") as f:
            f.write(html_index())

    with open(f"{site_folder}/quiz.html", "w") as f:
        f.write(
            html_index(
                title="Juxtastat",
                image="https://urbanstats.org/juxtastat-link-preview.png",  # Image url must be absolute, or gets messed up from juxtastat.org
                description="Test your knowledge of geography and statistics! New quiz every day",
            )
        )

    shutil.copy("icons/main/thumbnail.png", f"{site_folder}/")
    shutil.copy("icons/main/banner.png", f"{site_folder}/")
    shutil.copy("icons/main/banner-dark.png", f"{site_folder}/")
    shutil.copy("icons/main/screenshot_footer.svg", f"{site_folder}/")
    shutil.copy("icons/main/screenshot_footer_dark.svg", f"{site_folder}/")
    shutil.copy("icons/main/share.png", f"{site_folder}/")
    shutil.copy("icons/main/screenshot.png", f"{site_folder}/")
    shutil.copy("icons/main/download.png", f"{site_folder}/")
    shutil.copy("icons/main/link-preview.png", f"{site_folder}/")
    shutil.copy("icons/main/juxtastat-link-preview.png", f"{site_folder}/")

    with open(f"{site_folder}/CNAME", "w") as f:
        f.write("urbanstats.org")

    with open(f"{site_folder}/.nojekyll", "w") as f:
        f.write("")

    build_react_site(site_folder, mode)

    place_icons_in_site_folder(site_folder)

    if not no_juxta:
        generate_quizzes(f"{site_folder}/quiz/")
    generate_retrostats(f"{site_folder}/retrostat")


def html_index(
    title="Urban Stats",
    image="/link-preview.png",
    description="Urban Stats is a database of statistics related to density, housing, race, transportation, elections, and climate change.",
):
    return f"""<html>
  <head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/png" href="/thumbnail.png" />
    <title>{title}</title>
    <meta property="og:title" content="{title}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="{image}" />
    <meta
      property="og:description"
      content="{description}"
    />
    <meta name="twitter:card" content="summary_large_image" />
    <style>
      @keyframes loading-spinner {{
        100% {{
          transform: rotate(360deg);
        }}
      }}
    </style>
  </head>

  <body>
    <div id="loading">
      <div
        style="
          position: fixed;
          inset: 0px;
          background-color: var(--loading-background);
        "
      >
        <span
          style="
            display: inherit;
            position: absolute;
            width: 78px;
            height: 78px;
            animation: 0.6s linear 0s infinite normal forwards running
              loading-spinner;
            top: calc(50% - 39px);
            left: calc(50% - 39px);
          "
          ><span
            style="
              width: 9px;
              height: 9px;
              border-radius: 100%;
              background-color: var(--loading-main);
              opacity: 0.8;
              position: absolute;
              top: 25.5px;
              animation: 0.6s linear 0s infinite normal forwards running
                loading-spinner;
            "
          ></span
          ><span
            style="
              width: 60px;
              height: 60px;
              border-radius: 100%;
              border: 9px solid var(--loading-main);
              opacity: 0.1;
              box-sizing: content-box;
              position: absolute;
            "
          ></span
        ></span>
      </div>
    </div>
    <div id="root"></div>
    <script src="/scripts/loading.js"></script>
    <script async src="/scripts/index.js"></script>

    <!-- Google tag (gtag.js) -->
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-CM105FFYFC"
    ></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {{
        dataLayer.push(arguments);
      }}
      gtag("js", new Date());

      gtag("config", "G-CM105FFYFC");
    </script>
  </body>
</html>
"""
