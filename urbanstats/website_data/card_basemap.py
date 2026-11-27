import colorsys
import json
import math
import operator
import re

ADMIN_LEVELS = [2, 3, 4, 5, 6]

# change where or how a layer draws in ways the card doesn't follow
UNSUPPORTED_PAINT = {
    "fill-pattern",
    "fill-translate",
    "line-pattern",
    "line-gap-width",
    "line-offset",
    "line-translate",
}

COMPARISONS = {
    "==": operator.eq,
    "!=": operator.ne,
    "<": operator.lt,
    "<=": operator.le,
    ">": operator.gt,
    ">=": operator.ge,
}

# what react/cf-og-worker/src/style-filter.ts implements
FILTER_OPERATORS = {
    "all",
    "any",
    "!",
    "get",
    "has",
    "typeof",
    "geometry-type",
    "match",
    *COMPARISONS,
}


class Unsupported(ValueError):
    pass


class Invisible(ValueError):
    pass


def _color(value):
    if not isinstance(value, str):
        raise Unsupported(value)
    if re.fullmatch(r"#[0-9a-fA-F]{3}", value):
        return "#" + "".join(c * 2 for c in value[1:])
    if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return value
    if re.fullmatch(r"rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)", value):
        raise Invisible(value)
    hsl = re.fullmatch(r"hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)", value)
    if hsl:
        h, s, l = (float(x) for x in hsl.groups())
        rgb = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
        return "#" + "".join(f"{int(c * 255 + 0.5):02x}" for c in rgb)
    raise Unsupported(value)


def _number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise Unsupported(value)
    return value


def _dash(value):
    if not isinstance(value, list):
        raise Unsupported(value)
    return [_number(d) for d in value]


def _resolve(value, admin_level):
    if not (isinstance(value, list) and value and value[0] == "match"):
        return value
    if value[1] != ["get", "admin_level"] or admin_level is None:
        raise Unsupported(value)
    branches = value[2:-1]
    for labels, result in zip(branches[::2], branches[1::2]):
        if admin_level in (labels if isinstance(labels, list) else [labels]):
            return result
    return value[-1]


def _exponential(z, start, end, base):
    (z0, v0), (z1, v1) = start, end
    return v0 + (v1 - v0) * (base ** (z - z0) - 1) / (base ** (z1 - z0) - 1)


def _stops(value, admin_level, convert):
    """[zoom, value] pairs, which the card interpolates linearly between."""
    value = _resolve(value, admin_level)
    if not (isinstance(value, list) and value and value[0] == "interpolate"):
        return [[0, convert(value)]]
    kind = value[1]
    if value[2] != ["zoom"]:
        raise Unsupported(value)
    stops = [
        [z, convert(_resolve(v, admin_level))] for z, v in zip(value[3::2], value[4::2])
    ]
    if kind in (["linear"], ["exponential", 1]) or len(stops) == 1:
        return stops
    if kind[0] != "exponential" or convert is not _number:
        raise Unsupported(value)
    # sampled at every zoom, so linear interpolation between them stays close to the curve
    sampled = []
    for (z0, v0), (z1, v1) in zip(stops, stops[1:]):
        sampled += [
            [z, _exponential(z, (z0, v0), (z1, v1), kind[1])]
            for z in [z0, *range(math.floor(z0) + 1, math.ceil(z1))]
        ]
    return [[z, round(v, 3)] for z, v in sampled] + [stops[-1]]


def _steps(value, convert):
    """[zoom, value] pairs, each holding until the next."""
    if not (isinstance(value, list) and value and value[0] == "step"):
        return [[0, convert(value)]]
    if value[1] != ["zoom"]:
        raise Unsupported(value)
    values = [_literal(v) for v in value[2::2]]
    return [[z, convert(v)] for z, v in zip([0, *value[3::2]], values)]


def _literal(value):
    if isinstance(value, list) and value and value[0] == "literal":
        return value[1]
    return value


def _check_filter(expression):
    if not isinstance(expression, list):
        return
    op, *arguments = expression
    if op not in FILTER_OPERATORS:
        raise Unsupported(expression)
    if op == "match":
        # labels are literals; only the input, outputs and fallback are expressions
        arguments = [arguments[0], *arguments[2:-1:2], arguments[-1]]
    elif op in COMPARISONS and isinstance(arguments[0], str):
        # the legacy syntax, which names the property bare
        raise Unsupported(expression)
    for argument in arguments:
        _check_filter(argument)


def _admits(layer_filter, admin_level):
    """False if the filter's top-level comparisons of admin_level rule this level out."""
    conditions = (
        layer_filter[1:]
        if layer_filter and layer_filter[0] == "all"
        else [layer_filter]
    )
    return all(
        COMPARISONS[c[0]](admin_level, c[2])
        for c in conditions
        if isinstance(c, list)
        and c[0] in COMPARISONS
        and c[1] == ["get", "admin_level"]
        and isinstance(c[2], (int, float))
    )


def _with_zooms(layer, result):
    for key, name in (("minzoom", "minZoom"), ("maxzoom", "maxZoom")):
        if key in layer:
            result[name] = layer[key]
    return result


def _paint(layer, admin_level):
    paint = layer.get("paint", {})
    if UNSUPPORTED_PAINT & paint.keys():
        raise Unsupported(UNSUPPORTED_PAINT & paint.keys())
    if layer["type"] == "fill":
        result = {"fill": _stops(paint.get("fill-color"), admin_level, _color)}
        opacity = paint.get("fill-opacity")
    else:
        result = {
            "stroke": _stops(paint.get("line-color"), admin_level, _color),
            "width": _stops(paint.get("line-width", 1), admin_level, _number),
        }
        opacity = paint.get("line-opacity")
        if "line-dasharray" in paint:
            result["dash"] = _steps(paint["line-dasharray"], _dash)
    if opacity is not None:
        result["opacity"] = _stops(opacity, admin_level, _number)
        if all(v == 0 for _, v in result["opacity"]):
            raise Invisible(layer["id"])
    return _with_zooms(layer, result)


def _outline(layer, admin_level):
    """maplibre draws a fill's outline as a hairline."""
    paint = layer.get("paint", {})
    if (
        layer["type"] != "fill"
        or "fill-outline-color" not in paint
        or paint.get("fill-antialias", True) is not True
    ):
        return None
    return _with_zooms(
        layer,
        {
            "stroke": _stops(paint["fill-outline-color"], admin_level, _color),
            "width": [[0, 1]],
        },
    )


def _drawn(layer):
    if layer["type"] not in ("fill", "line") or layer.get("source") != "openmaptiles":
        return False
    return layer.get("layout", {}).get("visibility", "visible") == "visible"


def card_basemap(style):
    """
    The style's fill and line layers, in its order, as the link preview card's basemap draws them. A layer whose
    paint depends on admin_level appears once per level, its filter narrowed to that level, and a fill's outline
    follows it as a layer of its own.
    """
    layers = []
    for layer in filter(_drawn, style["layers"]):
        _check_filter(layer.get("filter"))
        by_level = "admin_level" in json.dumps(layer.get("paint", {}))
        for level in ADMIN_LEVELS if by_level else [None]:
            layer_filter = layer.get("filter")
            if level is not None:
                if not _admits(layer_filter, level):
                    continue
                layer_filter = [
                    "all",
                    layer_filter or True,
                    ["==", ["get", "admin_level"], level],
                ]
            for paint_of in (_paint, _outline):
                try:
                    paint = paint_of(layer, level)
                except Invisible:
                    continue
                if paint is None:
                    continue
                entry = {"id": layer["id"], "sourceLayer": layer["source-layer"]}
                if layer_filter is not None:
                    entry["filter"] = layer_filter
                layers.append({**entry, **paint})
    background = next(l for l in style["layers"] if l["type"] == "background")
    return {"background": background["paint"]["background-color"], "layers": layers}
