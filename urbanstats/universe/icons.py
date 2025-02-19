import os
import re
import shutil
import subprocess
import tempfile

import requests
import us
from PIL import Image

from urbanstats.universe.universe_list import (
    all_universes,
    get_universe_name_for_state,
    universe_by_universe_type,
)

from .universe_constants import CONTINENTS, COUNTRIES

flags_folder = "icons/flags/"


internal_country_to_wikipedia = {
    "Bouvet Island": "Norway",
    "Heard Island and McDonald Islands": "Australia",
    "United States Minor Outlying Islands": "United_States",
}


def download_and_convert_flag(wikipedia_page, out_path):
    out = flags_folder + out_path + ".png"
    if os.path.exists(out):
        return
    print(wikipedia_page)
    try:
        os.makedirs(flags_folder)
    except FileExistsError:
        pass
    url = "http://commons.wikimedia.org/wiki/Special:FilePath/" + wikipedia_page
    print(url)
    r = requests.get(url, timeout=100)

    content = re.sub(b'inkscape:label="[^"]*"', b"", r.content)

    with tempfile.NamedTemporaryFile(suffix=".svg") as f:
        f.write(content)
        f.flush()
        run_conversion(out, f.name)


def run_conversion(png_path, svg_path):
    subprocess.run(
        [
            "inkscape",
            svg_path,
            "--export-type=png",
            "--export-filename=" + png_path,
            "-w",
            "400",
        ],
        check=True,
    )


def state_flag_name(state):
    if state.name == "Georgia":
        return "File:Flag_of_Georgia_(U.S._state).svg"
    return f"File:Flag_of_{state.name.replace(' ', '_')}.svg"


def download_all_us_state_flags():
    # download_and_convert_flag("File:Flag_of_Alabama.svg", "Alabama, USA")
    for state in us.states.STATES_AND_TERRITORIES:
        download_and_convert_flag(
            state_flag_name(state),
            get_universe_name_for_state(state),
        )


def province_flag_name(province):
    if province == "Northwest Territories, Canada":
        return "File:Flag_of_the_Northwest_Territories.svg"
    return f"File:Flag_of_{province.replace(', Canada', '').replace(' ', '_')}.svg"


def download_all_canadian_province_flags():
    for province in universe_by_universe_type()["province"]:
        download_and_convert_flag(
            province_flag_name(province),
            province,
        )


def download_all_country_flags():
    for name in COUNTRIES:
        wikiname = internal_country_to_wikipedia.get(name, name.replace(" ", "_"))
        download_and_convert_flag(f"File:Flag_of_{wikiname}.svg", name)


def convert_continent_flags():
    for continent in CONTINENTS:
        out = f"{flags_folder}{continent}.png"
        if os.path.exists(out):
            continue
        run_conversion(out, f"icons/continent-flags/{continent}.svg")


def download_all_flags():
    download_all_country_flags()
    download_all_us_state_flags()
    download_all_canadian_province_flags()
    download_and_convert_flag("File:Flag_of_the_United_States.svg", "USA")
    download_and_convert_flag("File:Flag_of_the_United_Nations.svg", "world")
    download_and_convert_flag(
        "File:Flag_of_Washington,_D.C..svg", "District of Columbia, USA"
    )

    convert_continent_flags()

    missing = {x + ".png" for x in all_universes()} - set(os.listdir(flags_folder))
    assert not missing, missing


def place_icons_in_site_folder(site_folder):
    download_all_flags()
    for folder in [flags_folder]:
        try:
            os.makedirs(os.path.join(site_folder, folder))
        except FileExistsError:
            pass
        for f in os.listdir(folder):
            shutil.copy(os.path.join(folder, f), os.path.join(site_folder, folder))


def get_image_dimensions(image_path):
    with Image.open(image_path) as img:
        return img.size


def all_image_dimensions():
    result = {}
    for u in all_universes():
        result[u] = get_image_dimensions(os.path.join(flags_folder, u + ".png"))
    return result


def all_image_aspect_ratios():
    dimensions = all_image_dimensions()
    return {k: v[0] / v[1] for k, v in dimensions.items()}


if __name__ == "__main__":
    download_all_flags()
