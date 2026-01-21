from collections import Counter
import json

import re

from urbanstats.website_data.colors import hue_colors

with open("liberty.json", "r") as f:
    result = json.load(f)

allowed = set(hue_colors.values())


def pull_layer(ident):
    [layer] = [x for x in result["layers"] if x["id"] == ident]
    return layer


pull_layer("poi_transit")["paint"]["text-color"] = hue_colors["blue"]
pull_layer("park")["paint"]["fill-color"] = hue_colors["green"]

def darken(color, amount):
    color = color.lstrip("#")
    r = int(color[0:2], 16)
    g = int(color[2:4], 16)
    b = int(color[4:6], 16)
    r = int(r * amount)
    g = int(g * amount)
    b = int(b * amount)
    r = max(0, min(255, r))
    g = max(0, min(255, g))
    b = max(0, min(255, b))
    return "#{:02x}{:02x}{:02x}".format(r, g, b)

dark_red = darken(hue_colors["red"], 1)

allowed.add(dark_red)

result = json.dumps(result)
# roads
result = result.replace("#e9ac77", dark_red)
# road casing
result = result.replace("#fea", hue_colors["red"])
# bridges/tunnels
result = result.replace("#fc8", hue_colors["orange"])
# bridges/tunnels casing
result = result.replace("#cfcdca", hue_colors["yellow"])
result = result.replace("#fff4c6", hue_colors["yellow"])

result = result.replace("#a0c8f0", hue_colors["blue"])

result = json.loads(result)

road_colors = [dark_red, hue_colors["red"], hue_colors["orange"], hue_colors["yellow"]]

for layer in result["layers"]:
    if "paint" in layer and layer["paint"].get("line-color") in road_colors:
        width = layer["paint"]["line-width"]
        assert width[0] == "interpolate"
        for i in range(4, len(width), 2):
            width[i] = width[i] * 0.25

result["layers"].remove(pull_layer("building-3d"))

# minor roads: cfcdca
# pitch/track: DEE3CD

bad = Counter(
    x.lower()
    for x in re.findall(r"(#[0-9a-fA-F]{3,6})", json.dumps(result))
    if x not in allowed
)

print(bad)
# result = json.loads(result)
result.update(
    {
        "version": 8,
        "sources": {
            "ne2_shaded": {
                "maxzoom": 6,
                "tileSize": 256,
                "tiles": [
                    "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png"
                ],
                "type": "raster",
            },
            "openmaptiles": {
                "type": "vector",
                "url": "https://tiles.openfreemap.org/planet",
            },
        },
        "sprite": "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
        "glyphs": "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    }
)

with open("style.json", "w") as f:
    json.dump(result, f, indent=2)
