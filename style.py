import json
import os

import numpy as np
from PIL import Image

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
# green areas are blotches of a darker green on a lighter one, the blotches covering more of woods than parks,
# and more of parks than grass
GREEN_LIGHT = mix(hue_colors["green"], PAPER, 0.65)
GREEN_DARK = mix(hue_colors["green"], PAPER, 0.4)
# scrub and heath, e.g. sagebrush, which the tiles class as grass, in a dry mottle between sand and grass
SCRUB_LIGHT = mix(hue_colors["yellow"], PAPER, 0.75)
SCRUB_DARK = mix(mix(hue_colors["yellow"], hue_colors["green"], 0.5), PAPER, 0.55)
SAND = mix(hue_colors["yellow"], PAPER, 0.65)
RED = hue_colors["red"]
ORANGE = hue_colors["orange"]
STREET = mix(hue_colors["grey"], PAPER, 0.45)
MEDIUM_ROAD = hue_colors["darkGrey"]
# softens the hard pixel edges of thin lines, a bit like ink spreading into paper
INK_BLUR = 0.4
# the width of a street at each zoom, which every road and rail width is a multiple of; at least a pixel,
# since thinner lines are drawn as faint pixels that look jagged
BASE_WIDTH = {6: 1, 8: 1.1, 10: 1.2, 12: 1.3, 15: 1.6, 17: 2.6, 20: 5}
STREET_SCALE = 1
MEDIUM_ROAD_SCALE = 1.25
MAJOR_ROAD_SCALE = 1.6
# motorways are an orange line in a red outline, each side of which is a street wide
MOTORWAY_SCALE = MAJOR_ROAD_SCALE
MOTORWAY_LINK_SCALE = MEDIUM_ROAD_SCALE
RAIL_SCALE = 1
RAIL_HATCHING_SCALE = 3
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
    "label_city": "Jost 550",
    "label_city_capital": "Jost 550",
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


paints = {
    "background": {"background-color": PAPER},
    "landuse-residential": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-suburb": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-commercial": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-railway": {"fill-color": "rgba(0,0,0,0)"},
    "landuse-industrial": {"fill-color": INDUSTRIAL},
    "landuse-hospital": {"fill-color": INDUSTRIAL},
    "landuse-school": {"fill-color": INDUSTRIAL},
    "landuse-cemetery": {"fill-pattern": "urbanstats:grass"},
    "landcover-grass-park": {"fill-pattern": "urbanstats:park", "fill-opacity": 1},
    "landcover-grass": {"fill-pattern": "urbanstats:grass", "fill-opacity": 1},
    "landcover-sand": {"fill-color": SAND},
    "landcover-wood": {
        "fill-pattern": "urbanstats:wood",
        "fill-opacity": 1,
        "fill-outline-color": "rgba(0,0,0,0)",
    },
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
            outline, fill = (
                outlined(MOTORWAY_SCALE, 9)
                if kind == "motorway"
                else outlined(MOTORWAY_LINK_SCALE, 13)
            )
            paints.setdefault(
                ident,
                {
                    "line-color": RED if casing else ORANGE,
                    "line-width": outline if casing else fill,
                    "line-blur": INK_BLUR,
                },
            )
            continue
        elif kind in ("trunk", "primary", "trunk-primary"):
            if casing:
                paints.setdefault(ident, {"line-opacity": 0})
            else:
                paints.setdefault(
                    ident,
                    {
                        "line-color": RED,
                        "line-width": scaled(MAJOR_ROAD_SCALE),
                        "line-blur": INK_BLUR,
                    },
                )
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
                        "line-width": scaled(MEDIUM_ROAD_SCALE),
                        "line-blur": INK_BLUR,
                    },
                )
            else:
                paints.setdefault(
                    ident,
                    {
                        "line-color": fade_in(STREET, [12, 1, 14, 0]),
                        "line-blur": INK_BLUR,
                        "line-width": scaled(STREET_SCALE),
                    },
                )
            continue
        elif kind in ("path", "path-casing"):
            color = PATH
        elif kind.startswith("railway"):
            paints.setdefault(ident, rail_paint(ident))
            continue
        else:
            continue
        paints.setdefault(ident, {"line-color": color})
    if ident.startswith("railway"):
        paints[ident] = rail_paint(ident)
    if layer["type"] == "symbol" and "text-halo-color" in layer.get("paint", {}):
        paints.setdefault(ident, {"text-halo-color": PAPER})

# footpaths, which include the sidewalks mapped along both sides of most streets, and the
# raised building tops, which shade blocks differently as you zoom
result["layers"] = [
    layer
    for layer in result["layers"]
    if not layer["id"].endswith(("-path", "-path-casing"))
    and layer["id"] not in ("building-top", "ferry")
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
            LABEL_FONTS.get(layer["id"], f.replace("Noto Sans", "Jost"))
            for f in layer["layout"]["text-font"]
        ]


def place_label(base, ident, classes, layout, minzoom=None):
    """A copy of bright's catch-all place label, limited to `classes` (or to the rest, if None)."""
    layer = json.loads(json.dumps(base))
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
            "text-letter-spacing": 0.45,
            # suburb is NYC's boroughs but also ordinary neighborhoods in e.g. Boston and London, so
            # these stay below city labels
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 13, 13, 16, 15],
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
        {"text-font": ["Jost Regular"], "text-transform": "none"},
    ),
]
split[0]["paint"]["text-color"] = "#000000"
split[-1]["filter"] = [
    "all",
    other["filter"],
    ["match", ["get", "class"], split_classes, False, True],
]
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

# a wide band along borders, like the colored edging on old atlases
highlights = []
for layer in boundaries:
    highlight = json.loads(json.dumps(layer))
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
    highlights.append(highlight)
# just above the background, so parks, land use and water all draw over the band
result["layers"][1:1] = highlights

# bright looks for stations under class "rail", but the tiles use "railway", so they were only shown as ordinary
# POIs from z15; bus stops, which are far more numerous, get their own layer from z16, before the stations so
# that stations win label collisions
transit = next(layer for layer in result["layers"] if layer["id"] == "poi_transit")
bus = json.loads(json.dumps(transit))
bus["id"] = "poi_bus"
bus["filter"] = ["==", ["get", "class"], "bus"]
bus["minzoom"] = 16
bus["layout"].update(
    {"icon-image": "bus_11", "icon-size": 0.7, "text-size": 11, "text-offset": [0.8, 0]}
)
transit["filter"] = ["match", ["get", "class"], ["airport", "railway"], True, False]
# the large train icon for every station, subway included
transit["layout"].update(
    {
        "icon-image": ["to-string", ["get", "class"]],
        "icon-size": 0.9,
        "text-offset": [1.1, 0],
    }
)
result["layers"].insert(result["layers"].index(transit), bus)
# after road labels and neighborhood names, which hid e.g. Kendall/MIT under the MIT label, but before towns and
# cities; the icon still shows when the name doesn't fit
result["layers"].remove(transit)
result["layers"].insert(
    next(
        i for i, layer in enumerate(result["layers"]) if layer["id"] == "label_village"
    ),
    transit,
)
transit["layout"]["text-optional"] = True
# a stop served by several kinds of train often has a station for each, e.g. Porter on the Red Line and the
# commuter rail; padding makes them collide so only the best-ranked one shows
transit["layout"]["icon-padding"] = 12
transit["layout"]["symbol-sort-key"] = ["get", "rank"]


def wrapping_noise(size, cells, rng):
    """Smooth random values over a `size` square, varying over `size / cells` and wrapping around its edges."""
    noise = Image.fromarray((rng.random((cells, cells)) * 255).astype(np.uint8))
    tiled = Image.new("L", (cells * 3, cells * 3))
    for x in range(3):
        for y in range(3):
            tiled.paste(noise, (x * cells, y * cells))
    return np.asarray(tiled.resize((size * 3, size * 3), Image.BICUBIC), dtype=float)[
        size : 2 * size, size : 2 * size
    ]


def blotches(size, cells, coverage, seed):
    """
    A `size` square boolean mask of blotches about `size / cells` across, covering `coverage` of the tile and
    wrapping around its edges. Coarser noise makes them denser in some places than others, which hides the repeat.
    """
    rng = np.random.default_rng(seed)
    smooth = wrapping_noise(size, cells, rng) + 0.6 * wrapping_noise(
        size, cells // 4, rng
    )
    return smooth > np.quantile(smooth, 1 - coverage)


def mottled(color, blotch_color, coverage, pixel_ratio, size=256, cells=64):
    """A tile of `color` with blotches of `blotch_color` covering `coverage` of it, like the parks on print maps."""
    n = size * pixel_ratio
    mask = blotches(n, cells, coverage, seed=0)
    pixels = np.where(mask[:, :, None], np.array(blotch_color), np.array(color)).astype(
        np.uint8
    )
    return Image.fromarray(pixels)


def write_sprite(path, images):
    """A MapLibre sprite sheet at 1x and 2x, the images side by side."""
    for pixel_ratio, suffix in ((1, ""), (2, "@2x")):
        tiles = {name: make(pixel_ratio) for name, make in images.items()}
        sheet = Image.new(
            "RGB",
            (
                sum(t.width for t in tiles.values()),
                max(t.height for t in tiles.values()),
            ),
        )
        index, x = {}, 0
        for name, tile in tiles.items():
            sheet.paste(tile, (x, 0))
            index[name] = {
                "x": x,
                "y": 0,
                "width": tile.width,
                "height": tile.height,
                "pixelRatio": pixel_ratio,
            }
            x += tile.width
        sheet.save(f"{path}{suffix}.png")
        with open(f"{path}{suffix}.json", "w") as f:
            json.dump(index, f)


def hex_rgb(color):
    return tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))


DRY_GRASS = ["scrub", "heath"]
grass = next(layer for layer in result["layers"] if layer["id"] == "landcover-grass")
scrub = json.loads(json.dumps(grass))
scrub["id"] = "landcover-scrub"
scrub["filter"] = ["all", grass["filter"], ["match", ["get", "subclass"], DRY_GRASS, True, False]]
scrub["paint"]["fill-pattern"] = "urbanstats:scrub"
grass["filter"] = ["all", grass["filter"], ["match", ["get", "subclass"], DRY_GRASS, False, True]]
result["layers"].insert(result["layers"].index(grass) + 1, scrub)

# the park layer is every kind of protected area, from parks to reservations (classed nature_reserve, like
# the Muscogee Nation, which covers most of Tulsa) and planning boundaries (Adirondack Park, with whole towns
# inside), so green comes from the land cover
park = next(layer for layer in result["layers"] if layer["id"] == "park")
result["layers"].remove(park)
after_land_cover = (
    next(
        i
        for i, layer in enumerate(result["layers"])
        if layer["id"] == "landcover-grass-park"
    )
    + 1
)
# except the classes that are reliably parkland without towns inside; the high Sierra, for one, is almost all
# national park and wilderness but has little land cover mapped
result["layers"].insert(
    after_land_cover,
    {
        "id": "park-fill",
        "type": "fill",
        "source": park["source"],
        "source-layer": park["source-layer"],
        "filter": [
            "all",
            park["filter"],
            [
                "match",
                ["get", "class"],
                ["national_park", "wilderness_preserve", "State Park"],
                True,
                False,
            ],
        ],
        "paint": {"fill-pattern": "urbanstats:park"},
    },
)

os.makedirs("sprites", exist_ok=True)
write_sprite(
    "sprites/urbanstats",
    {
        name: lambda ratio, coverage=coverage: mottled(
            hex_rgb(GREEN_LIGHT), hex_rgb(GREEN_DARK), coverage, ratio
        )
        for name, coverage in (("grass", 0.35), ("park", 0.55), ("wood", 0.75))
    }
    | {"scrub": lambda ratio: mottled(hex_rgb(SCRUB_LIGHT), hex_rgb(SCRUB_DARK), 0.45, ratio)},
)
result["sprite"] = [
    {"id": "default", "url": result["sprite"]},
    # relative like the glyphs, see temp.html
    {"id": "urbanstats", "url": "/sprites/urbanstats"},
]

# tunnels are dashed, each dash TUNNEL_DASH base widths long whatever the line's width; dash arrays are in line
# widths, so each is divided by its line's scale, which also keeps a motorway's outline and fill dashes in step
TUNNEL_DASH = [8, 4]
tunnel_scales = {
    "tunnel-motorway-casing": MOTORWAY_SCALE + 2,
    "tunnel-motorway": MOTORWAY_SCALE,
    "tunnel-motorway-link-casing": MOTORWAY_LINK_SCALE + 2,
    "tunnel-motorway-link": MOTORWAY_LINK_SCALE,
    "tunnel-trunk-primary": MAJOR_ROAD_SCALE,
    "tunnel-secondary-tertiary": MEDIUM_ROAD_SCALE,
    "tunnel-link": MEDIUM_ROAD_SCALE,
    "tunnel-minor": STREET_SCALE,
    "tunnel-service-track": STREET_SCALE,
    "tunnel-railway": RAIL_SCALE,
}
for layer in result["layers"]:
    if layer["id"] in tunnel_scales:
        layer["paint"]["line-dasharray"] = [
            x / tunnel_scales[layer["id"]] for x in TUNNEL_DASH
        ]

# street names in small capitals beside the street rather than on it; MapLibre flips line labels to stay upright,
# which also flips the offset, so a name can land on either side
for layer in result["layers"]:
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
for layer in result["layers"]:
    if layer.get("paint", {}).get("text-halo-width"):
        layer["paint"]["text-halo-width"] = (
            2 if layer["id"].startswith("label_") else 1.5
        )

# relative, so temp.html can resolve it against wherever it is served; see build_glyphs.js
result["glyphs"] = "/fonts/{fontstack}/{range}.pbf"

with open("style.json", "w") as f:
    json.dump(result, f, indent=2)
