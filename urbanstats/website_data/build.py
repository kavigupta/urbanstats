import hashlib
import os
import shutil
import subprocess

from urbanstats.consolidated_data.produce_consolidated_data import (
    full_consolidated_data,
    output_names,
)
from urbanstats.games.infinite.data import output_quiz_sampling_info
from urbanstats.games.quiz import generate_quizzes
from urbanstats.games.retrostat import generate_retrostats
from urbanstats.geometry.insets import compute_all_insets
from urbanstats.geometry.relationship import map_relationships_by_type
from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx
from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.geometry.shapefiles.shapefile import compute_data_credits
from urbanstats.geometry.shapefiles.shapefiles_list import (
    localized_type_names,
    shapefiles,
)
from urbanstats.mapper.ramp import output_ramps
from urbanstats.metadata import export_metadata_types
from urbanstats.ordinals.ordering_info_outputter import output_ordering
from urbanstats.protobuf.data_files_pb2_hash import proto_hash
from urbanstats.protobuf.utils import save_universes_list_all
from urbanstats.special_cases.symlinks.compute_symlinks import compute_symlinks
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
from urbanstats.website_data.centroids import export_centroids
from urbanstats.website_data.create_article_gzips import (
    create_article_gzips,
    create_symlink_gzips,
    extra_stats,
)
from urbanstats.website_data.default_universe_by_stat_geo import (
    output_default_universe_by_stat_geo,
)
from urbanstats.website_data.index import export_index, type_to_priority_list
from urbanstats.website_data.ordinals import all_ordinals
from urbanstats.website_data.output_geometry import produce_all_geometry_json
from urbanstats.website_data.sitemap import output_sitemap
from urbanstats.website_data.syau import get_suffixes_from_table, syau_regions
from urbanstats.website_data.table import shapefile_without_ordinals

from ..utils import output_typescript
from .colors import hue_colors, related_button_colors


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

    with open("react/src/data/type_to_priority.ts", "w") as f:
        output_typescript(type_to_priority_list(), f, data_type="number[]")

    output_statistics_metadata()

    with open("react/src/data/universes_ordered.ts", "w") as f:
        output_typescript(list(all_universes()), f)

    with open("react/src/data/universes_default.ts", "w") as f:
        output_typescript(default_universes, f)

    with open("react/src/data/metadata.ts", "w") as f:
        output_typescript(export_metadata_types(), f)

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

    with open("react/src/data/hueColors.ts", "w") as f:
        output_typescript(hue_colors, f)

    with open("react/src/data/relatedButtonColors.ts", "w") as f:
        output_typescript(list(related_button_colors.items()), f)

    with open("react/src/data/syau_region_types.ts", "w") as f:
        output_typescript(syau_regions(), f)

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

    with open("react/src/data/shapefile_data_credit.ts", "w") as f:
        output_typescript(
            compute_data_credits(
                sorted(
                    shapefiles.values(), key=lambda x: type_ordering_idx[x.meta["type"]]
                )
            ),
            f,
            data_type="{names: string[], dataCredits: {text: string | null, linkText: string, link: string}[]}[]",
        )


def build_react_site(site_folder, mode):
    if mode != "ci":
        # In ci, we cache the node_modules
        subprocess.run(
            f"cd react; npm {'i' if mode == 'dev' else 'ci'}", shell=True, check=True
        )

    create_react_jsons()

    subprocess.run(
        f"cd react; npm run {'dev' if mode == 'dev' else 'prod'}",
        shell=True,
        check=mode != "dev",
    )

    link_scripts_folder(site_folder, mode)


# Canonical build steps (set-based)
BUILD_STEPS = frozenset({"shapes", "articles", "index", "ordering", "sitemap", "juxta"})


# pylint: disable-next=too-many-branches,too-many-statements
def build_urbanstats(site_folder, *, steps, mode):

    check_proto_hash()
    print("Steps to run:", *steps)

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

    if "shapes" in steps:
        produce_all_geometry_json(
            f"{site_folder}/shape", set(shapefile_without_ordinals().longname)
        )

    if "articles" in steps:
        create_article_gzips(
            site_folder, shapefile_without_ordinals(), all_ordinals()
        )
        create_symlink_gzips(site_folder, compute_symlinks())

    if "index" in steps:
        export_index(shapefile_without_ordinals(), site_folder)

    if "ordering" in steps:
        table = shapefile_without_ordinals()
        save_universes_list_all(
            table,
            all_ordinals(),
            site_folder,
        )
        output_ordering(
            site_folder,
            all_ordinals(),
            longname_to_type=dict(zip(table.longname, table.type)),
        )

        full_consolidated_data(site_folder)
        export_centroids(site_folder, shapefiles, all_ordinals())

        with open("react/src/data/syau_suffixes.ts", "w") as f:
            output_typescript(
                get_suffixes_from_table(shapefile_without_ordinals()),
                f,
                data_type="string[]",
            )

        compute_all_insets(shapefile_without_ordinals())

        output_default_universe_by_stat_geo(shapefile_without_ordinals(), site_folder)

    if "sitemap" in steps:
        output_sitemap(site_folder, shapefile_without_ordinals(), all_ordinals())

    if "juxta" in steps:
        output_quiz_sampling_info(site_folder, "quiz_sampling_info")
        generate_quizzes(f"{site_folder}/quiz/")

    generate_retrostats(f"{site_folder}/retrostat")

    for entrypoint in [
        "index",
        "article",
        "comparison",
        "statistic",
        "random",
        "about",
        "data-credit",
        "uss-documentation",
        "mapper",
        "editor",
        "oauth-callback",
        "screenshot-diff-viewer",
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

    with open(f"{site_folder}/syau.html", "w") as f:
        f.write(
            html_index(
                title="So you're an urbanist?",
                image="https://urbanstats.org/syau-link-preview.png",
                description="Name every urb 😤",
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
    shutil.copy("icons/main/add.png", f"{site_folder}/")
    shutil.copy("icons/main/add-green-small.png", f"{site_folder}/")
    shutil.copy("icons/main/link-preview.png", f"{site_folder}/")
    shutil.copy("icons/main/juxtastat-link-preview.png", f"{site_folder}/")
    shutil.copy("icons/main/syau-link-preview.png", f"{site_folder}/")
    shutil.copy("icons/main/life.png", f"{site_folder}/")
    shutil.copy("icons/main/life-lost.png", f"{site_folder}/")
    shutil.copy("icons/main/life-colorblind.png", f"{site_folder}/")
    shutil.copy("icons/main/replace.png", f"{site_folder}/")
    shutil.copy("icons/main/close.png", f"{site_folder}/")
    shutil.copy("icons/main/close-red-small.png", f"{site_folder}/")
    shutil.copy("icons/main/pencil-light.png", f"{site_folder}/")
    shutil.copy("icons/main/pencil-dark.png", f"{site_folder}/")
    shutil.copy("icons/main/sort-up.png", f"{site_folder}/")
    shutil.copy("icons/main/sort-down.png", f"{site_folder}/")
    shutil.copy("icons/main/sort-both.png", f"{site_folder}/")
    shutil.copy("icons/main/csv.png", f"{site_folder}/")
    shutil.copy("icons/main/wikipedia.svg", f"{site_folder}/")
    shutil.copy("icons/main/wikidata-light.svg", f"{site_folder}/")
    shutil.copy("icons/main/wikidata-dark.svg", f"{site_folder}/")
    shutil.copy("icons/main/mapper-banner.png", f"{site_folder}/")
    shutil.copy("icons/main/mapper-banner-dark.png", f"{site_folder}/")
    shutil.copy("icons/main/duplicate.png", f"{site_folder}/")
    shutil.copy("icons/main/arrow-right.png", f"{site_folder}/")

    with open(f"{site_folder}/CNAME", "w") as f:
        f.write("urbanstats.org")

    with open(f"{site_folder}/.nojekyll", "w") as f:
        f.write("")

    build_react_site(site_folder, mode)

    place_icons_in_site_folder(site_folder)


def html_index(
    title="Urban Stats",
    image="/link-preview.png",
    description="Urban Stats is a database of statistics related to density, housing, race, transportation, elections, and climate change.",
):
    return f"""<!DOCTYPE html>
<html>
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
