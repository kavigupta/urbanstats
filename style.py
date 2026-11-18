import json

from urbanstats.website_data.colors import hue_colors

with open("bright.json", "r") as f:
    result = json.load(f)


def mix(color, other, fraction):
    """`fraction` of the way from `color` to `other`."""
    a = [int(color[i : i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i : i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * fraction):02x}" for x, y in zip(a, b))


# light mode background
PAPER = "#fff8f0"
WATER = mix(hue_colors["cyan"], PAPER, 0.45)
WATER_LABEL = mix(hue_colors["cyan"], "#000000", 0.5)
PARK = mix(hue_colors["green"], PAPER, 0.4)
WOOD = mix(hue_colors["green"], PAPER, 0.25)
RED = hue_colors["red"]
ORANGE = hue_colors["orange"]
STREET = mix(hue_colors["grey"], PAPER, 0.55)
STREET_WIDTH = [12, 0.3, 14, 0.6, 16, 1.2, 20, 3]
MEDIUM_ROAD = hue_colors["darkGrey"]
MEDIUM_ROAD_WIDTH = [8, 0.3, 12, 0.6, 16, 1.4, 20, 3.5]
MAJOR_ROAD_WIDTH = [6, 0.5, 10, 1, 14, 2, 20, 5]
# (kind, is casing): the casing is the red outline, the inner line the orange fill
MOTORWAY_WIDTHS = {
    ("motorway", True): [5, 0.6, 10, 1.5, 14, 3, 20, 8],
    ("motorway", False): [7, 0, 10, 0.6, 14, 1.5, 20, 5],
    ("motorway-link", True): [12, 0.6, 14, 1.5, 20, 5],
    ("motorway-link", False): [13, 0, 14, 0.6, 20, 3],
}
BORDER = hue_colors["yellow"]
RAIL = hue_colors["grey"]
AIRPORT = mix(hue_colors["purple"], PAPER, 0.7)
INDUSTRIAL = mix(hue_colors["pink"], PAPER, 0.8)
RUNWAY = mix(hue_colors["purple"], PAPER, 0.5)
# light mode slightlyDifferentBackground
BUILDING = "#f7f1e8"
PATH = mix(hue_colors["grey"], PAPER, 0.3)

def width(stops):
    return ["interpolate", ["exponential", 1.2], ["zoom"], *stops]


paints = {
    "background": {"background-color": PAPER},
    "landuse-residential": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-suburb": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-commercial": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-railway": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-industrial": {"fill-color": INDUSTRIAL},
    "landuse-hospital": {"fill-color": INDUSTRIAL},
    "landuse-school": {"fill-color": INDUSTRIAL},
    "landuse-cemetery": {"fill-color": PARK},
    "park": {"fill-color": PARK, "fill-opacity": 1},
    "landcover-grass-park": {"fill-color": PARK, "fill-opacity": 1},
    "landcover-grass": {"fill-color": PARK, "fill-opacity": 0.6},
    "landcover-wood": {"fill-color": WOOD, "fill-opacity": 0.8, "fill-outline-color": "rgba(0,0,0,0)"},
    "water": {"fill-color": WATER},
    "water-intermittent": {"fill-color": WATER, "fill-opacity": 0.5},
    "aeroway-area": {"fill-color": AIRPORT},
    "aeroway-runway": {"line-color": RUNWAY},
    "aeroway-taxiway": {"line-color": RUNWAY},
    "aeroway-runway-casing": {"line-color": RUNWAY},
    "aeroway-taxiway-casing": {"line-color": RUNWAY},
    "road_area_pier": {"fill-color": PAPER},
    "road_pier": {"line-color": PAPER},
    "highway-area": {"fill-color": PAPER, "fill-outline-color": STREET},
    "building": {"fill-color": BUILDING},
    "building-top": {"fill-color": BUILDING, "fill-outline-color": mix(hue_colors["grey"], PAPER, 0.7)},
    "ferry": {"line-color": WATER_LABEL},
    "boundary_3": {"line-color": BORDER},
    "boundary_2": {"line-color": BORDER},
    "boundary_disputed": {"line-color": BORDER},
    "waterway_line_label": {"text-color": WATER_LABEL, "text-halo-color": WATER},
    "water_name_point_label": {"text-color": WATER_LABEL, "text-halo-color": WATER},
    "water_name_line_label": {"text-color": WATER_LABEL, "text-halo-color": WATER},
}

for layer in result["layers"]:
    ident = layer["id"]
    if ident.startswith("waterway"):
        paints.setdefault(ident, {"line-color": WATER})
    for prefix in ("highway-", "tunnel-", "bridge-"):
        if not ident.startswith(prefix):
            continue
        kind = ident[len(prefix) :].removesuffix("-casing")
        casing = ident.endswith("-casing")
        if kind in ("motorway", "motorway-link"):
            stops = MOTORWAY_WIDTHS[kind, casing]
            paints.setdefault(ident, {"line-color": RED if casing else ORANGE, "line-width": width(stops)})
            continue
        elif kind in ("trunk", "primary", "trunk-primary"):
            if casing:
                paints.setdefault(ident, {"line-opacity": 0})
            else:
                paints.setdefault(ident, {"line-color": RED, "line-width": width(MAJOR_ROAD_WIDTH)})
            continue
        elif kind in ("secondary-tertiary", "link", "minor", "service-track", "street"):
            # single lines with no casing
            if casing:
                paints.setdefault(ident, {"line-opacity": 0})
                continue
            if kind in ("secondary-tertiary", "link"):
                paints.setdefault(ident, {"line-color": MEDIUM_ROAD, "line-width": width(MEDIUM_ROAD_WIDTH)})
            else:
                paints.setdefault(
                    ident,
                    {
                        "line-color": STREET,
                        "line-width": width(STREET_WIDTH),
                        "line-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 14, 1],
                    },
                )
            continue
        elif kind in ("path", "path-casing"):
            color = PATH
        elif kind.startswith("railway"):
            color = RAIL
        else:
            continue
        paints.setdefault(ident, {"line-color": color})
    if ident.startswith("railway"):
        paints[ident] = {"line-color": RAIL}
    if layer["type"] == "symbol" and "text-halo-color" in layer.get("paint", {}):
        paints.setdefault(ident, {"text-halo-color": PAPER})

for layer in result["layers"]:
    layer.setdefault("paint", {}).update(paints.get(layer["id"], {}))
    # yards and sidings
    if layer["id"].startswith("railway-service"):
        layer["minzoom"] = 15

with open("style.json", "w") as f:
    json.dump(result, f, indent=2)
