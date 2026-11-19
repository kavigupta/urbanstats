import json
import os
import subprocess
import tempfile

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

from urbanstats.website_data.map_restyle import restyle

# name: (variable font, weight, Noto fallback). icons/fonts/noto-glyphs has OpenFreeMap's glyphs for each
# fallback, from https://tiles.openfreemap.org/fonts/{fallback}/{range}.pbf, for the ranges Jost covers; the
# map requests the rest from OpenFreeMap
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
    "label_borough": "Jost Medium",
    # upright, unlike the neighborhoods and islands split off bright's italic catch-all with it
    "label_minor_place": "Jost Regular",
}


def build_glyphs(fonts_folder: str) -> dict[str, dict[str, object]]:
    """
    MapLibre glyphs for each Jost font in `fonts_folder`, for the ranges it covers, with Noto filling in characters
    it lacks. Returns, for each font, the starts of the ranges written and its fallback.
    """
    fonts = {}
    jobs = []
    with tempfile.TemporaryDirectory() as temp:
        for name, (file, weight, noto) in JOST_FONTS.items():
            font = instancer.instantiateVariableFont(
                TTFont(f"react/src/fonts/{file}"), {"wght": weight}
            )
            font_path = os.path.join(temp, f"{name}.ttf")
            font.save(font_path)
            starts = sorted({code - code % 256 for code in font.getBestCmap()})
            fonts[name] = {"ranges": starts, "fallback": noto}
            os.makedirs(os.path.join(fonts_folder, name), exist_ok=True)
            for start in starts:
                file_name = f"{start}-{start + 255}.pbf"
                jobs.append(
                    {
                        "font": font_path,
                        "start": start,
                        "fallback": os.path.abspath(
                            f"icons/fonts/noto-glyphs/{noto}/{file_name}"
                        ),
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
    return fonts


def build_map_style(site_folder: str) -> None:
    """
    The map style at react/src/data/map_style.json, and the glyphs it uses in the site.
    """
    with open("icons/map_style/bright.json") as f:
        style = json.load(f)
    restyle(style)
    for layer in style["layers"]:
        if "text-font" in layer.get("layout", {}):
            layer["layout"]["text-font"] = [
                LABEL_FONTS.get(layer["id"], f.replace("Noto Sans", "Jost"))
                for f in layer["layout"]["text-font"]
            ]
    # relative, so map-style.ts can resolve it against wherever the site is served
    style["glyphs"] = "/map/fonts/{fontstack}/{range}.pbf"
    style.setdefault("metadata", {})["urbanstats:jost_fonts"] = build_glyphs(
        f"{site_folder}/map/fonts"
    )
    with open("react/src/data/map_style.json", "w") as f:
        json.dump(style, f, indent=2)
