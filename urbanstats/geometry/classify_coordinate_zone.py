import shapely
from permacache import permacache, stable_hash

boxes = [
    shapely.geometry.box(minx, -90, minx + 180, 90) for minx in (-360, -180, 0, 180)
]


@permacache(
    "urbanstats/geometry/classify_coordinate_zone/classify_coordinate_zone",
    key_function=dict(geo=lambda x: stable_hash(shapely.to_geojson(x))),
)
def classify_coordinate_zone(geo: shapely.Geometry) -> tuple[list[int], shapely.Geometry]:
    # pylint: disable=too-many-return-statements
    xmin, _, xmax, _ = geo.bounds
    # adding 0.1 to avoid floating point errors
    if xmin < -180.1:
        assert xmax < 0
        return [0, 1], geo
    if xmax > 180.1:
        assert xmin > 0
        return [2, 3], geo
    assert -180.1 <= xmin <= xmax <= 180.1
    if xmax < 0:
        return [1], geo
    if xmin > 0:
        return [2], geo
    geo = geo.buffer(0)
    west_box = shapely.intersection(boxes[1], geo)
    east_box = shapely.intersection(boxes[2], geo)
    west_min, _, west_max, _ = west_box.bounds
    east_min, _, east_max, _ = east_box.bounds
    if west_box.is_empty:
        return [2], geo
    if east_box.is_empty:
        return [1], geo
    # going to be 2 zones
    grenwich_gap = east_min - west_max
    beringian_gap = west_min - east_max + 360
    if grenwich_gap <= beringian_gap:
        return [1, 2], geo
    if west_box.area > east_box.area:
        # translate east box to the west by 360
        east_box = shapely.affinity.translate(east_box, xoff=-360)
        geo = shapely.unary_union([west_box, east_box])
        return [0, 1], geo
    west_box = shapely.affinity.translate(west_box, xoff=+360)
    geo = shapely.unary_union([west_box, east_box])
    return [2, 3], geo
