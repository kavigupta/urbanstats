import os
import re
import shutil
import subprocess
import tempfile

import requests
import us

from urbanstats.universe.annotate_universes import (
    all_universes,
    get_universe_name_for_state,
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
    r = requests.get(url)

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
        ]
    )


def state_flag_name(state):
    if state.name == "Georgia":
        return "File:Flag_of_Georgia_(U.S._state).svg"
    return f"File:Flag_of_{state.name.replace(' ', '_')}.svg"


def download_all_us_state_icons():
    # download_and_convert_flag("File:Flag_of_Alabama.svg", "Alabama, USA")
    for state in us.states.STATES_AND_TERRITORIES:
        download_and_convert_flag(
            state_flag_name(state),
            get_universe_name_for_state(state),
        )


def download_all_country_icons():
    for name in COUNTRIES:
        wikiname = internal_country_to_wikipedia.get(name, name.replace(" ", "_"))
        download_and_convert_flag(f"File:Flag_of_{wikiname}.svg", name)


def convert_continent_icons():
    for continent in CONTINENTS:
        out = f"{flags_folder}{continent}.png"
        if os.path.exists(out):
            continue
        run_conversion(out, f"icons/continent-flags/{continent}.svg")


def download_all_icons():
    download_all_country_icons()
    download_all_us_state_icons()
    download_and_convert_flag("File:Flag_of_the_United_States.svg", "USA")
    download_and_convert_flag("File:Flag_of_the_United_Nations.svg", "world")
    download_and_convert_flag(
        "File:Flag_of_Washington,_D.C..svg", "District of Columbia, USA"
    )

    convert_continent_icons()

    missing = set([x + ".png" for x in all_universes()]) - set(os.listdir(flags_folder))
    assert not missing, missing


def place_icons_in_site_folder(site_folder):
    download_all_icons()
    try:
        os.makedirs(os.path.join(site_folder, flags_folder))
    except FileExistsError:
        pass
    for f in os.listdir(flags_folder):
        shutil.copy(
            os.path.join(flags_folder, f), os.path.join(site_folder, flags_folder)
        )


if __name__ == "__main__":
    download_all_icons()
