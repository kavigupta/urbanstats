import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(HERE, "bright.json"), "r") as f:
    result = json.load(f)

# heavier type for more important places, as on print maps
LABEL_FONTS = {
    "label_country_1": "Jost Bold",
    "label_country_2": "Jost Bold",
    "label_country_3": "Jost Bold",
    "label_city": "Jost 550",
    "label_city_capital": "Jost 550",
    "label_town": "Jost Medium",
}

for layer in result["layers"]:
    if "text-font" in layer.get("layout", {}):
        layer["layout"]["text-font"] = [
            LABEL_FONTS.get(layer["id"], f.replace("Noto Sans", "Jost"))
            for f in layer["layout"]["text-font"]
        ]

# relative, so map-style.ts can resolve it against wherever the site is served
result["glyphs"] = "/map/fonts/{fontstack}/{range}.pbf"
# the ranges that build-glyphs.js wrote
with open(sys.argv[1]) as f:
    result.setdefault("metadata", {})["urbanstats:jost_ranges"] = json.load(f)

with open(os.path.join(HERE, "../../react/src/data/map_style.json"), "w") as f:
    json.dump(result, f, indent=2)
