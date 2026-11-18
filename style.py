import json

with open("bright.json", "r") as f:
    result = json.load(f)

PAPER = "#f4f1e6"
WATER = "#62b8aa"
WATER_LABEL = "#1d5c55"
PARK = "#c8d76c"
WOOD = "#b2c95e"
RED = "#d23a32"
ORANGE = "#f2a04b"
STREET = "#c4bfb5"
STREET_WIDTH = [12, 0.3, 14, 0.6, 16, 1.2, 20, 3]
MEDIUM_ROAD = "#1e1e1e"
MEDIUM_ROAD_WIDTH = [8, 0.3, 12, 0.6, 16, 1.4, 20, 3.5]
MAJOR_ROAD_WIDTH = [6, 0.5, 10, 1, 14, 2, 20, 5]
# (kind, is casing): the casing is the red outline, the inner line the orange fill
MOTORWAY_WIDTHS = {
    ("motorway", True): [5, 0.6, 10, 1.5, 14, 3, 20, 8],
    ("motorway", False): [7, 0, 10, 0.6, 14, 1.5, 20, 5],
    ("motorway-link", True): [12, 0.6, 14, 1.5, 20, 5],
    ("motorway-link", False): [13, 0, 14, 0.6, 20, 3],
}
BORDER = "#e3cf3f"
RAIL = "#8a857c"
AIRPORT = "#d3cadb"
INDUSTRIAL = "#efd3d3"

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
    "aeroway-runway": {"line-color": "#b9aec4"},
    "aeroway-taxiway": {"line-color": "#b9aec4"},
    "aeroway-runway-casing": {"line-color": "#b9aec4"},
    "aeroway-taxiway-casing": {"line-color": "#b9aec4"},
    "road_area_pier": {"fill-color": PAPER},
    "road_pier": {"line-color": PAPER},
    "highway-area": {"fill-color": PAPER, "fill-outline-color": STREET},
    "building": {"fill-color": "#ebe6d6"},
    "building-top": {"fill-color": "#ebe6d6", "fill-outline-color": "#ddd6c4"},
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
            color = "#a8a296"
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
