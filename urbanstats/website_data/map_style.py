import json
import os
import subprocess
import tempfile
import urllib.parse

import requests
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# name: (variable font, weight, Noto fallback)
JOST_FONTS = {
    "Jost Regular": ("Jost-VariableFont_wght.ttf", 400, "Noto Sans Regular"),
    "Jost Medium": ("Jost-VariableFont_wght.ttf", 500, "Noto Sans Regular"),
    "Jost 550": ("Jost-VariableFont_wght.ttf", 550, "Noto Sans Bold"),
    "Jost Bold": ("Jost-VariableFont_wght.ttf", 700, "Noto Sans Bold"),
    "Jost Italic": ("Jost-Italic-VariableFont_wght.ttf", 400, "Noto Sans Italic"),
}

# heavier type for more important places, as on print maps
LABEL_FONTS = {
    "label_country_1": "Jost Bold",
    "label_country_2": "Jost Bold",
    "label_country_3": "Jost Bold",
    "label_city": "Jost 550",
    "label_city_capital": "Jost 550",
    "label_town": "Jost Medium",
}


def build_glyphs(fonts_folder: str) -> dict[str, list[int]]:
    """
    MapLibre glyphs for each Jost font in `fonts_folder`, for the ranges it covers, with Noto filling in characters
    it lacks. Returns the starts of the ranges written for each font.
    """
    ranges = {}
    jobs = []
    with tempfile.TemporaryDirectory() as temp:
        for name, (file, weight, noto) in JOST_FONTS.items():
            font = instancer.instantiateVariableFont(
                TTFont(f"react/src/fonts/{file}"), {"wght": weight}
            )
            font_path = os.path.join(temp, f"{name}.ttf")
            font.save(font_path)
            ranges[name] = sorted({code - code % 256 for code in font.getBestCmap()})
            os.makedirs(os.path.join(fonts_folder, name), exist_ok=True)
            for start in ranges[name]:
                file_name = f"{start}-{start + 255}.pbf"
                response = requests.get(
                    f"https://tiles.openfreemap.org/fonts/{urllib.parse.quote(noto)}/{file_name}",
                    timeout=60,
                )
                response.raise_for_status()
                fallback = os.path.join(temp, f"{noto}-{file_name}")
                with open(fallback, "wb") as f:
                    f.write(response.content)
                jobs.append(
                    {
                        "font": font_path,
                        "start": start,
                        "fallback": fallback,
                        "out": os.path.abspath(
                            os.path.join(fonts_folder, name, file_name)
                        ),
                    }
                )
        subprocess.run(
            ["node", "build-glyphs.js"],
            input=json.dumps(jobs),
            text=True,
            cwd="react",
            check=True,
        )
    return ranges


def build_map_style(site_folder: str) -> None:
    """Bright, labeled in Jost, at react/src/data/map_style.json, and its glyphs in the site."""
    with open("icons/map_style/bright.json") as f:
        style = json.load(f)
    for layer in style["layers"]:
        if "text-font" in layer.get("layout", {}):
            layer["layout"]["text-font"] = [
                LABEL_FONTS.get(layer["id"], f.replace("Noto Sans", "Jost"))
                for f in layer["layout"]["text-font"]
            ]
    # relative, so map-style.ts can resolve it against wherever the site is served
    style["glyphs"] = "/map/fonts/{fontstack}/{range}.pbf"
    style.setdefault("metadata", {})["urbanstats:jost_ranges"] = build_glyphs(
        f"{site_folder}/map/fonts"
    )
    with open("react/src/data/map_style.json", "w") as f:
        json.dump(style, f, indent=2)
