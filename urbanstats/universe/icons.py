import os
import subprocess
import requests
import tempfile
import us
import re

from urbanstats.universe.annotate_universes import all_universes

flags_folder = "icons/flags/"


def download_and_convert_flag(wikipedia_page, out_path):
    out = flags_folder + out_path + ".png"
    print(wikipedia_page)
    if os.path.exists(out):
        return
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
        subprocess.run(
            [
                "inkscape",
                f.name,
                "--export-type=png",
                "--export-filename=" + out,
                "-w",
                "400",
            ]
        )


def download_all_us_state_icons():
    # download_and_convert_flag("File:Flag_of_Alabama.svg", "Alabama, USA")
    for state in us.states.STATES_AND_TERRITORIES:
        download_and_convert_flag(
            f"File:Flag_of_{state.name.replace(' ', '_')}.svg",
            f"{state.name}, USA",
        )


def download_all_icons():
    download_all_us_state_icons()
    download_and_convert_flag("File:Flag_of_the_United_States.svg", "USA")
    download_and_convert_flag("File:Flag_of_the_United_Nations.svg", "world")
    download_and_convert_flag(
        "File:Flag_of_Washington,_D.C..svg", "District of Columbia, USA"
    )

    missing = set([x + ".png" for x in all_universes()]) - set(os.listdir(flags_folder))
    assert not missing, missing


if __name__ == "__main__":
    download_all_icons()
