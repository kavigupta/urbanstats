import geopandas as gpd
import overpy
from shapely import difference, unary_union
from shapely.geometry import Point, Polygon, LineString
from shapely.ops import polygonize, linemerge


def merge_ring(a, b):
    if a[0].id == b[-1].id:
        return b[:-1] + a
    if a[-1].id == b[0].id:
        return a + b[1:]
    if a[0].id == b[0].id:
        return b[::-1] + a[1:]
    if a[-1].id == b[-1].id:
        return a[:-1] + b[::-1]
    return None


def consolidate_rings_single(original):
    rings = []
    for way in original:
        for i, ring in enumerate(rings):
            ring_new = merge_ring(ring, way)
            if ring_new is not None:
                rings[i] = ring_new
                break
        else:
            rings.append(way)
    return rings


def polygon_for_node(node):
    return Point(node.lon, node.lat)


def polygon_for_nodes(nodes):
    return Polygon([[node.lon, node.lat] for node in nodes]).buffer(0)


def polygon_for_way(way):
    return polygon_for_nodes(way.get_nodes(resolve_missing=True))


def polygon_for_ring_category(category):
    # https://gis.stackexchange.com/a/328608
    lss = []  # convert ways to linstrings

    for _, way in enumerate(category):
        # way = way.resolve()
        ls_coords = []

        for node in way.get_nodes(resolve_missing=True):
            ls_coords.append((node.lon, node.lat))  # create a list of node coordinates

        lss.append(LineString(ls_coords))  # create a LineString from coords

    merged = linemerge([*lss])  # merge LineStrings
    borders = unary_union(merged)  # linestrings to a MultiLineString
    polygons = list(polygonize(borders))
    return unary_union(polygons)


def polygon_for_relation(relation):
    members = {"inner": [], "outer": []}
    queue = relation.members[:]
    while queue:
        way = queue.pop()
        role = way.role
        if role not in members:
            continue
        way = way.resolve(resolve_missing=True)
        if way is None or isinstance(way, overpy.Node):
            continue
        if isinstance(way, overpy.Relation):
            queue += way.members
        else:
            members[role].append(way)

    members = {
        k: polygon_for_ring_category(members_k) for k, members_k in members.items()
    }
    return difference(members["outer"], members["inner"])


def frame_for_result(result, *, keep_tags):
    with_tags_nodes = [w for w in result.get_nodes() if "name" in w.tags]
    with_tags_ways = [
        w
        for w in result.ways
        if "name" in w.tags and len(w.get_nodes(resolve_missing=True)) >= 3
    ]
    with_tags_relations = [w for w in result.relations if "name" in w.tags]
    polygon_ways = [polygon_for_way(x) for x in with_tags_ways]
    polygoon_relations = [polygon_for_relation(x) for x in with_tags_relations]

    polygon_nodes = [polygon_for_node(x) for x in with_tags_nodes]
    result = dict(
        name=[
            x.tags["name"]
            for x in with_tags_nodes + with_tags_ways + with_tags_relations
        ]
    )
    if keep_tags:
        result["tags"] = [
            x.tags for x in with_tags_nodes + with_tags_ways + with_tags_relations
        ]
    result = gpd.GeoDataFrame(
        result,
        geometry=polygon_nodes + polygon_ways + polygoon_relations,
    )
    return result
