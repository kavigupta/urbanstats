import copy

from urbanstats.website_data.colors import hue_colors


def mix(color, other, fraction):
    """`fraction` of the way from `color` to `other`."""
    a = [int(color[i : i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i : i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * fraction):02x}" for x, y in zip(a, b))


# light mode background
PAPER = "#fff8f0"
WATER = mix(hue_colors["cyan"], PAPER, 0.45)
WATER_LABEL = mix(hue_colors["cyan"], "#000000", 0.65)
SAND = mix(hue_colors["yellow"], PAPER, 0.65)
RED = hue_colors["red"]
ORANGE = hue_colors["orange"]
STREET = mix(hue_colors["grey"], PAPER, 0.45)
MEDIUM_ROAD = hue_colors["darkGrey"]
RAIL = hue_colors["grey"]
BORDER = hue_colors["darkGrey"]
BORDER_HIGHLIGHT = hue_colors["orange"]
AIRPORT = mix(hue_colors["purple"], PAPER, 0.7)
RUNWAY = mix(hue_colors["purple"], PAPER, 0.5)
INDUSTRIAL = mix(hue_colors["pink"], PAPER, 0.8)

# softens the hard pixel edges of thin lines, a bit like ink spreading into paper
INK_BLUR = 0.4
# the width of a street at each zoom, which every road and rail width is a multiple of; at least a pixel,
# since thinner lines are drawn as faint pixels that look jagged
BASE_WIDTH = {6: 1, 8: 1.1, 10: 1.2, 12: 1.3, 15: 1.6, 17: 2.6, 20: 5}
STREET_SCALE = 1
MEDIUM_ROAD_SCALE = 1.25
MAJOR_ROAD_SCALE = 1.6
# motorways are an orange line in a red outline, each side of which is a street wide
MOTORWAY_SCALE = STREET_SCALE
MOTORWAY_LINK_SCALE = 0.75
# the zooms from which motorways and their links have outlines
MOTORWAY_OUTLINE_ZOOM = 9
MOTORWAY_LINK_OUTLINE_ZOOM = 13
RAIL_SCALE = 1
RAIL_HATCHING_SCALE = 3

WATER_LABEL_PAINT = {"text-color": WATER_LABEL, "text-halo-width": 0}
LARGE_WATER = ["ocean", "sea", "bay", "strait"]
# tunnels are dashed, each dash TUNNEL_DASH base widths long whatever the line's width; dash arrays are in line
# widths, so each is divided by its line's scale, which also keeps a motorway's outline and fill dashes in step
TUNNEL_DASH = [8, 4]
TUNNEL_SCALES = {
    "tunnel-motorway": MOTORWAY_SCALE,
    "tunnel-motorway-link": MOTORWAY_LINK_SCALE,
    "tunnel-trunk-primary": MAJOR_ROAD_SCALE,
    "tunnel-secondary-tertiary": MEDIUM_ROAD_SCALE,
    "tunnel-link": MEDIUM_ROAD_SCALE,
    "tunnel-minor": STREET_SCALE,
    "tunnel-service-track": STREET_SCALE,
    "tunnel-railway": RAIL_SCALE,
}
# below its outline zoom, a motorway's casing is only the outline, as wide as the fill
TUNNEL_CASINGS = {
    "tunnel-motorway-casing": (MOTORWAY_SCALE, MOTORWAY_OUTLINE_ZOOM),
    "tunnel-motorway-link-casing": (MOTORWAY_LINK_SCALE, MOTORWAY_LINK_OUTLINE_ZOOM),
}


def tunnel_dash(scale):
    return [x / scale for x in TUNNEL_DASH]


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


def base_width(zoom):
    """BASE_WIDTH linearly interpolated, for stops that aren't in it."""
    zooms = list(BASE_WIDTH)
    zoom = min(max(zoom, zooms[0]), zooms[-1])
    lo = max(z for z in zooms if z <= zoom)
    hi = min(z for z in zooms if z >= zoom)
    return (
        BASE_WIDTH[lo]
        if lo == hi
        else BASE_WIDTH[lo]
        + (BASE_WIDTH[hi] - BASE_WIDTH[lo]) * (zoom - lo) / (hi - lo)
    )


def width_stops(scale, below=None, above=None):
    """(zoom, scale * base width) at the base width's stops below or above the given zooms."""
    return [
        (zoom, scale * base)
        for zoom, base in BASE_WIDTH.items()
        if (below is None or zoom < below) and (above is None or zoom > above)
    ]


def stops_width(stops):
    return width([x for stop in stops for x in stop])


def scaled(scale, from_zoom=None):
    """`scale` times the base width, growing from nothing over the half zoom before `from_zoom` if given."""
    if from_zoom is None:
        return stops_width(width_stops(scale))
    appear = [(from_zoom - 0.5, 0), (from_zoom, scale * base_width(from_zoom))]
    return stops_width(appear + width_stops(scale, above=from_zoom))


def outlined(fill_scale, from_zoom):
    """
    (outline, fill) widths for a line in an outline a base width wide on each side. Below `from_zoom` it is just
    the outline, `fill_scale` wide.
    """
    outline = (
        width_stops(fill_scale, below=from_zoom - 0.5)
        + [
            (from_zoom - 0.5, fill_scale * base_width(from_zoom - 0.5)),
            (from_zoom, (fill_scale + 2) * base_width(from_zoom)),
        ]
        + width_stops(fill_scale + 2, above=from_zoom)
    )
    return stops_width(outline), scaled(fill_scale, from_zoom)


def rail_paint(ident):
    if ident.endswith("-hatching"):
        return {
            "line-color": RAIL,
            "line-blur": INK_BLUR,
            "line-width": scaled(RAIL_HATCHING_SCALE, 15),
        }
    return {"line-color": RAIL, "line-blur": INK_BLUR, "line-width": scaled(RAIL_SCALE)}


def layer_by_id(style, ident):
    return next(layer for layer in style["layers"] if layer["id"] == ident)


def index_of(style, ident):
    return next(i for i, layer in enumerate(style["layers"]) if layer["id"] == ident)


# pylint: disable-next=too-many-return-statements
def road_paint(ident, kind):
    """The paint for a road layer of bright's, None to leave it as is."""
    casing = ident.endswith("-casing")
    if kind in ("motorway", "motorway-link"):
        outline, fill = (
            outlined(MOTORWAY_SCALE, MOTORWAY_OUTLINE_ZOOM)
            if kind == "motorway"
            else outlined(MOTORWAY_LINK_SCALE, MOTORWAY_LINK_OUTLINE_ZOOM)
        )
        return {
            "line-color": RED if casing else ORANGE,
            "line-width": outline if casing else fill,
            "line-blur": INK_BLUR,
        }
    if kind in ("trunk", "primary", "trunk-primary"):
        if casing:
            return {"line-opacity": 0}
        return {
            "line-color": RED,
            "line-width": scaled(MAJOR_ROAD_SCALE),
            "line-blur": INK_BLUR,
        }
    if kind in ("secondary-tertiary", "link", "minor", "service-track"):
        # single lines with no casing
        if casing:
            return {"line-opacity": 0}
        if kind in ("secondary-tertiary", "link"):
            return {
                "line-color": fade_in(MEDIUM_ROAD, [8, 0.7, 11, 0.4, 14, 0]),
                "line-width": scaled(MEDIUM_ROAD_SCALE),
                "line-blur": INK_BLUR,
            }
        return {
            "line-color": fade_in(STREET, [12, 1, 14, 0]),
            "line-blur": INK_BLUR,
            "line-width": scaled(STREET_SCALE),
        }
    if kind.startswith("railway"):
        return rail_paint(ident)
    return None


def recolor(style):
    paints = {
        "background": {"background-color": PAPER},
        "landuse-residential": {"fill-color": "rgba(0,0,0,0)"},
        "landuse-suburb": {"fill-color": "rgba(0,0,0,0)"},
        "landuse-commercial": {"fill-color": "rgba(0,0,0,0)"},
        "landuse-railway": {"fill-color": "rgba(0,0,0,0)"},
        "landuse-industrial": {"fill-color": INDUSTRIAL},
        "landuse-hospital": {"fill-color": INDUSTRIAL},
        "landuse-school": {"fill-color": INDUSTRIAL},
        "landcover-sand": {"fill-color": SAND},
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

    for layer in style["layers"]:
        ident = layer["id"]
        if ident.startswith("waterway"):
            paints.setdefault(ident, {"line-color": WATER})
        for prefix in ("highway-", "tunnel-", "bridge-"):
            if ident.startswith(prefix):
                paint = road_paint(ident, ident[len(prefix) :].removesuffix("-casing"))
                if paint is not None:
                    paints.setdefault(ident, paint)
        if ident.startswith("railway"):
            paints[ident] = rail_paint(ident)
        if layer["type"] == "symbol" and "text-halo-color" in layer.get("paint", {}):
            paints.setdefault(ident, {"text-halo-color": PAPER})

    # footpaths, which include the sidewalks mapped along both sides of most streets, the raised building tops,
    # which shade blocks differently as you zoom, and ferry routes
    style["layers"] = [
        layer
        for layer in style["layers"]
        if not layer["id"].endswith(("-path", "-path-casing"))
        and layer["id"] not in ("building-top", "ferry")
    ]

    for layer in style["layers"]:
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


def place_label(base, ident, classes, layout, minzoom=None):
    """A copy of bright's catch-all place label, limited to `classes` (or to the rest, if None)."""
    layer = copy.deepcopy(base)
    layer["id"] = ident
    if classes is not None:
        layer["filter"] = [
            "all",
            base["filter"],
            ["match", ["get", "class"], classes, True, False],
        ]
    layer["layout"].update(layout)
    if minzoom is not None:
        layer["minzoom"] = minzoom
    return layer


def split_place_labels(style):
    """bright gives every place below a village the same small uppercase italic, from boroughs to hamlets."""
    other = layer_by_id(style, "label_other")
    split_classes = ["suburb", "borough", "quarter", "neighbourhood", "island"]
    split = [
        place_label(
            other,
            "label_borough",
            ["suburb", "borough"],
            {
                "text-letter-spacing": 0.45,
                # suburb is NYC's boroughs but also ordinary neighborhoods in e.g. Boston and London, so
                # these stay below city labels
                "text-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    11,
                    13,
                    13,
                    16,
                    15,
                ],
            },
        ),
        place_label(other, "label_neighbourhood", ["quarter", "neighbourhood"], {}),
        # boroughs and counties often share their island's name, and cover it at low zoom
        place_label(
            other, "label_island", ["island"], {"text-transform": "none"}, minzoom=12
        ),
        place_label(
            other,
            "label_minor_place",
            None,
            {"text-transform": "none"},
        ),
    ]
    split[0]["paint"]["text-color"] = "#000000"
    split[-1]["filter"] = [
        "all",
        other["filter"],
        ["match", ["get", "class"], split_classes, False, True],
    ]
    index = style["layers"].index(other)
    # later layers win label collisions, so boroughs go last
    style["layers"][index : index + 1] = split[::-1]


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


def border_highlight(layer):
    """A wide band along a border, like the colored edging on old atlases."""
    highlight = copy.deepcopy(layer)
    highlight["id"] = layer["id"] + "-highlight"
    # bigger divisions on top, so a fainter county band doesn't cut through a state's
    highlight["layout"] = {
        "line-join": "round",
        "line-cap": "round",
        "line-sort-key": ["-", 0, ["coalesce", ["get", "admin_level"], 10]],
    }
    # opaque, mixed with the paper by how strong the band is, since transparent bands darken where they overlap;
    # fainter zoomed out, where many bands are close together, with smaller divisions fading in later
    strength = {
        5: (0.2, 0, 0),
        8: (0.35, 0.15, 0),
        11: (0.5, 0.4, 0.1),
        15: (0.6, 0.6, 0.45),
    }
    highlight["paint"] = {
        "line-color": [
            "interpolate",
            ["linear"],
            ["zoom"],
            *[
                x
                for zoom, levels in strength.items()
                for x in (
                    zoom,
                    by_admin_level(
                        *[mix(BORDER_HIGHLIGHT, PAPER, 1 - a) for a in levels]
                    ),
                )
            ],
        ],
        "line-width": border_width(5),
    }
    return highlight


def borders(style):
    boundaries = [
        layer for layer in style["layers"] if layer["id"].startswith("boundary")
    ]
    for layer in boundaries:
        # disputed boundaries out at sea stay hidden, as in bright
        if layer["id"] != "boundary_disputed":
            layer["filter"] = [
                c for c in layer["filter"] if c != ["!=", ["get", "maritime"], 1]
            ]
        if layer["id"] == "boundary_2":
            # maritime country borders with only one country next to them face international waters
            layer["filter"].append(
                [
                    "any",
                    ["!=", ["get", "maritime"], 1],
                    ["all", ["has", "adm0_l"], ["has", "adm0_r"]],
                ]
            )
        layer["paint"] = {
            "line-color": BORDER,
            "line-width": border_width(1),
            "line-dasharray": [6, 2, 1, 2],
            "line-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                7,
                by_admin_level(1, 1, 0),
                9,
                1,
            ],
        }
    # just above the background, so parks, land use and water all draw over the band
    style["layers"][1:1] = [border_highlight(layer) for layer in boundaries]


def tunnels(style):
    for layer in style["layers"]:
        if layer["id"] in TUNNEL_SCALES:
            layer["paint"]["line-dasharray"] = tunnel_dash(TUNNEL_SCALES[layer["id"]])
        if layer["id"] in TUNNEL_CASINGS:
            fill_scale, outline_zoom = TUNNEL_CASINGS[layer["id"]]
            layer["paint"]["line-dasharray"] = [
                "step",
                ["zoom"],
                ["literal", tunnel_dash(fill_scale)],
                outline_zoom,
                ["literal", tunnel_dash(fill_scale + 2)],
            ]


def labels(style):
    # street names in small capitals beside the street rather than on it; MapLibre flips line labels to stay
    # upright, which also flips the offset, so a name can land on either side
    for layer in style["layers"]:
        if layer["id"].startswith("highway-name"):
            layer["layout"].update(
                {
                    "text-transform": "uppercase",
                    "text-size": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        13,
                        9,
                        16,
                        10,
                        20,
                        12,
                    ],
                    "text-letter-spacing": 0.08,
                    "text-offset": [0, -0.9],
                }
            )
            layer["paint"].update({"text-halo-color": PAPER, "text-halo-width": 1})

    # wider halos, so labels stand clear of the roads beneath them; water labels have none
    for layer in style["layers"]:
        if layer.get("paint", {}).get("text-halo-width"):
            layer["paint"]["text-halo-width"] = (
                2 if layer["id"].startswith("label_") else 1.5
            )


def restyle(style):
    """Bright in Urban Stats colors; leaves the fonts alone."""
    recolor(style)
    split_place_labels(style)
    borders(style)
    tunnels(style)
    labels(style)
