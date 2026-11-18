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
WATER_LABEL = mix(hue_colors["cyan"], "#000000", 0.65)
PARK = mix(hue_colors["green"], PAPER, 0.4)
WOOD = mix(hue_colors["green"], PAPER, 0.25)
RED = hue_colors["red"]
ORANGE = hue_colors["orange"]
STREET = mix(hue_colors["grey"], PAPER, 0.45)
# at least a pixel wide, since thinner lines are drawn as faint pixels that look jagged
STREET_WIDTH = [12, 1.3, 15, 1.6, 17, 2.6, 20, 5]
MEDIUM_ROAD = hue_colors["darkGrey"]
MEDIUM_ROAD_WIDTH = [8, 1, 14, 1.2, 16, 1.4, 20, 3.5]
# softens the hard pixel edges of thin lines, a bit like ink spreading into paper
INK_BLUR = 0.4
MAJOR_ROAD_WIDTH = [6, 0.5, 10, 1, 14, 2, 20, 5]
# (kind, is casing): the casing is the red outline, the inner line the orange fill
MOTORWAY_WIDTHS = {
    ("motorway", True): [5, 0.6, 10, 1.5, 14, 3, 20, 8],
    ("motorway", False): [7, 0, 10, 0.6, 14, 1.5, 20, 5],
    ("motorway-link", True): [12, 0.6, 14, 1.5, 20, 5],
    ("motorway-link", False): [13, 0, 14, 0.6, 20, 3],
}
BORDER = hue_colors["darkGrey"]
BORDER_HIGHLIGHT = hue_colors["orange"]
RAIL = hue_colors["grey"]
AIRPORT = mix(hue_colors["purple"], PAPER, 0.7)
INDUSTRIAL = mix(hue_colors["pink"], PAPER, 0.8)
RUNWAY = mix(hue_colors["purple"], PAPER, 0.5)
PATH = mix(hue_colors["grey"], PAPER, 0.3)

# heavier type for more important places, as on print maps
LABEL_FONTS = {
    "label_country_1": "Jost Bold",
    "label_country_2": "Jost Bold",
    "label_country_3": "Jost Bold",
    "label_city": "Jost Bold",
    "label_city_capital": "Jost Bold",
    "label_town": "Jost Medium",
}


WATER_LABEL_PAINT = {"text-color": WATER_LABEL, "text-halo-width": 0}
LARGE_WATER = ["ocean", "sea", "bay", "strait"]


def fade_in(color, stops):
    """
    `color` mixed toward the paper by the given fraction at each zoom. Fading by opacity instead leaves darker
    dots where a road's segments overlap.
    """
    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        *[mix(color, PAPER, x) if i % 2 else x for i, x in enumerate(stops)],
    ]


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
    # paper colored, so blocks match the streets at every zoom; only the outlines fade in
    "building": {
        "fill-color": PAPER,
        "fill-outline-color": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            PAPER,
            16,
            mix(hue_colors["grey"], PAPER, 0.6),
        ],
    },
    "waterway_line_label": WATER_LABEL_PAINT,
    "water_name_point_label": WATER_LABEL_PAINT,
    "water_name_line_label": WATER_LABEL_PAINT,
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
                paints.setdefault(
                    ident,
                    {
                        "line-color": fade_in(MEDIUM_ROAD, [8, 0.7, 11, 0.4, 14, 0]),
                        "line-width": width(MEDIUM_ROAD_WIDTH),
                        "line-blur": INK_BLUR,
                    },
                )
            else:
                paints.setdefault(
                    ident,
                    {
                        "line-color": fade_in(STREET, [12, 1, 14, 0]),
                        "line-blur": INK_BLUR,
                        "line-width": width(STREET_WIDTH),
                    },
                )
            continue
        elif kind in ("path", "path-casing"):
            color = PATH
        elif kind.startswith("railway"):
            paints.setdefault(ident, {"line-color": RAIL, "line-blur": INK_BLUR})
            continue
        else:
            continue
        paints.setdefault(ident, {"line-color": color})
    if ident.startswith("railway"):
        paints[ident] = {"line-color": RAIL, "line-blur": INK_BLUR}
    if layer["type"] == "symbol" and "text-halo-color" in layer.get("paint", {}):
        paints.setdefault(ident, {"text-halo-color": PAPER})

# footpaths, which include the sidewalks mapped along both sides of most streets, and the
# raised building tops, which shade blocks differently as you zoom
result["layers"] = [
    layer
    for layer in result["layers"]
    if not layer["id"].endswith(("-path", "-path-casing")) and layer["id"] not in ("building-top", "ferry")
]

for layer in result["layers"]:
    layer.setdefault("paint", {}).update(paints.get(layer["id"], {}))
    # yards and sidings
    if layer["id"].startswith("railway-service"):
        layer["minzoom"] = 15
    if layer["id"] == "water_name_point_label":
        # lakes and ponds, down to single fountains, are smaller than seas
        layer["layout"]["text-size"] = [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            ["match", ["get", "class"], LARGE_WATER, 10, 9],
            8,
            ["match", ["get", "class"], LARGE_WATER, 14, 11],
        ]
    if "text-font" in layer.get("layout", {}):
        layer["layout"]["text-font"] = [
            LABEL_FONTS.get(layer["id"], f.replace("Noto Sans", "Jost")) for f in layer["layout"]["text-font"]
        ]



def place_label(base, ident, classes, layout, minzoom=None):
    """A copy of bright's catch-all place label, limited to `classes` (or to the rest, if None)."""
    layer = json.loads(json.dumps(base))
    layer["id"] = ident
    if classes is not None:
        layer["filter"] = ["all", base["filter"], ["match", ["get", "class"], classes, True, False]]
    layer["layout"].update(layout)
    if minzoom is not None:
        layer["minzoom"] = minzoom
    return layer


# bright gives every place below a village the same small uppercase italic, from boroughs to hamlets
other = next(layer for layer in result["layers"] if layer["id"] == "label_other")
split_classes = ["suburb", "borough", "quarter", "neighbourhood", "island"]
split = [
    place_label(
        other,
        "label_borough",
        ["suburb", "borough"],
        {
            "text-font": ["Jost Medium"],
            "text-letter-spacing": 0.3,
            # suburb is NYC's boroughs but also ordinary neighborhoods in e.g. Boston and London, so
            # these stay below city labels
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 13, 13, 16, 15],
        },
    ),
    place_label(other, "label_neighbourhood", ["quarter", "neighbourhood"], {}),
    # boroughs and counties often share their island's name, and cover it at low zoom
    place_label(other, "label_island", ["island"], {"text-transform": "none"}, minzoom=12),
    place_label(other, "label_minor_place", None, {"text-font": ["Jost Regular"], "text-transform": "none"}),
]
split[0]["paint"]["text-color"] = "#000000"
split[-1]["filter"] = ["all", other["filter"], ["match", ["get", "class"], split_classes, False, True]]
index = result["layers"].index(other)
# later layers win label collisions, so boroughs go last
result["layers"][index : index + 1] = split[::-1]



def by_admin_level(country, state, county):
    return ["match", ["get", "admin_level"], 2, country, [3, 4], state, county]


def border_width(scale):
    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        by_admin_level(0.8 * scale, 0.5 * scale, 0.3 * scale),
        8,
        by_admin_level(1.6 * scale, 1.1 * scale, 0.6 * scale),
        14,
        by_admin_level(2.5 * scale, 1.8 * scale, 1.1 * scale),
    ]


boundaries = [layer for layer in result["layers"] if layer["id"].startswith("boundary")]
for layer in boundaries:
    layer["filter"] = [c for c in layer["filter"] if c != ["!=", ["get", "maritime"], 1]]
    if layer["id"] == "boundary_2":
        # maritime country borders with only one country next to them face international waters
        layer["filter"].append(
            ["any", ["!=", ["get", "maritime"], 1], ["all", ["has", "adm0_l"], ["has", "adm0_r"]]]
        )
    layer["paint"] = {"line-color": BORDER, "line-width": border_width(1), "line-dasharray": [6, 2, 1, 2]}

# a wide band along borders, like the colored edging on old atlases; it sits under the
# water fill so it only shows on land
highlights = []
for layer in boundaries:
    highlight = json.loads(json.dumps(layer))
    highlight["id"] = layer["id"] + "-highlight"
    highlight["layout"] = {"line-join": "round", "line-cap": "round"}
    highlight["paint"] = {
        "line-color": BORDER_HIGHLIGHT,
        "line-width": border_width(5),
        "line-opacity": by_admin_level(0.35, 0.35, 0.2),
    }
    highlights.append(highlight)
water = next(i for i, layer in enumerate(result["layers"]) if layer["id"] == "water")
result["layers"][water:water] = highlights

# relative, so temp.html can resolve it against wherever it is served; see build_glyphs.js
result["glyphs"] = "/fonts/{fontstack}/{range}.pbf"

with open("style.json", "w") as f:
    json.dump(result, f, indent=2)
