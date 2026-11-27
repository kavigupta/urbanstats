import json
import math

ADMIN_LEVELS = [2, 3, 4, 5, 6]


class Unsupported(ValueError):
    pass


def _color(value):
    if not isinstance(value, str) or not value.startswith("#"):
        raise Unsupported(value)
    if len(value) == 4:
        return "#" + "".join(c * 2 for c in value[1:])
    return value


def _number(value):
    if not isinstance(value, (int, float)):
        raise Unsupported(value)
    return value


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
    if kind == ["linear"] or len(stops) == 1:
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
    return sampled + [stops[-1]]


def _paint(layer, admin_level):
    paint = layer.get("paint", {})
    if "maxzoom" in layer:
        raise Unsupported(layer["maxzoom"])
    if layer["type"] == "fill":
        result = {"fill": _stops(paint["fill-color"], admin_level, _color)}
        opacity = paint.get("fill-opacity")
    else:
        result = {
            "stroke": _stops(paint["line-color"], admin_level, _color),
            "width": _stops(paint.get("line-width", 1), admin_level, _number),
        }
        opacity = paint.get("line-opacity")
        if "line-dasharray" in paint:
            result["dash"] = [_number(d) for d in paint["line-dasharray"]]
    if opacity is not None:
        result["opacity"] = _stops(opacity, admin_level, _number)
    if "minzoom" in layer:
        result["minZoom"] = layer["minzoom"]
    return result


def card_basemap(style):
    """
    The paint of the style's fill and line layers, in the form the link preview card's basemap rules take. Keyed
    by layer id, with `/{admin_level}` appended where the paint depends on it. Layers whose paint the card can't
    follow are left out.
    """
    layers = {}
    for layer in style["layers"]:
        if (
            layer["type"] not in ("fill", "line")
            or layer.get("source") != "openmaptiles"
        ):
            continue
        by_level = "admin_level" in json.dumps(layer.get("paint", {}))
        for level in ADMIN_LEVELS if by_level else [None]:
            try:
                paint = _paint(layer, level)
            except Unsupported:
                continue
            layers[layer["id"] if level is None else f"{layer['id']}/{level}"] = paint
    background = next(l for l in style["layers"] if l["type"] == "background")
    return {"background": background["paint"]["background-color"], "layers": layers}
