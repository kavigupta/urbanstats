from typing import Any, Protocol

import geopandas as gpd
import overpy
from shapely import difference, unary_union
from shapely.geometry import Point, Polygon


class _OverpyNodeLike(Protocol):
    id: int
    lon: float
    lat: float
    tags: dict[str, str]


class _OverpyWayLike(Protocol):
    tags: dict[str, str]

    def get_nodes(self, resolve_missing: bool = False) -> list[_OverpyNodeLike]: ...

    # overpy.Way


class _OverpyRelationLike(Protocol):
    tags: dict[str, str]
    members: list[Any]  # overpy relation members, nested structure


class _OverpyResultLike(Protocol):
    def get_nodes(self) -> list[_OverpyNodeLike]: ...

    ways: list[_OverpyWayLike]
    relations: list[_OverpyRelationLike]


def merge_ring(
    a: list[_OverpyNodeLike], b: list[_OverpyNodeLike]
) -> list[_OverpyNodeLike] | None:
    if a[0].id == b[-1].id:
        return b[:-1] + a
    if a[-1].id == b[0].id:
        return a + b[:1]
    if a[0].id == b[0].id:
        return b[::-1] + a[1:]
    if a[-1].id == b[-1].id:
        return a[:-1] + b[::-1]
    return None


def consolidate_rings_single(
    original: list[list[_OverpyNodeLike]],
) -> list[list[_OverpyNodeLike]]:
    rings: list[list[_OverpyNodeLike]] = []
    for way in original:
        for i, ring in enumerate(rings):
            ring_new = merge_ring(ring, way)
            if ring_new is not None:
                rings[i] = ring_new
                break
        else:
            rings.append(way)
    return rings


def polygon_for_node(node: _OverpyNodeLike) -> Point:
    return Point(node.lon, node.lat)


def polygon_for_nodes(nodes: list[_OverpyNodeLike]) -> Polygon:
    return Polygon([[node.lon, node.lat] for node in nodes]).buffer(0)


def polygon_for_way(way: _OverpyWayLike) -> Polygon:
    return polygon_for_nodes(way.get_nodes(resolve_missing=True))


def polygon_for_relation(relation: _OverpyRelationLike) -> Polygon:
    members_rings: dict[str, list[list[_OverpyNodeLike]]] = {
        "inner": [],
        "outer": [],
    }
    queue = relation.members
    while queue:
        way = queue.pop()
        role = way.role
        if role not in members_rings:
            continue
        way = way.resolve(resolve_missing=True)
        if way is None or isinstance(way, overpy.Node):
            continue
        if isinstance(way, overpy.Relation):
            queue += way.members
        else:
            members_rings[role].append(way.get_nodes(resolve_missing=True))

    members_geoms = {
        k: unary_union(
            [
                polygon_for_nodes(ring)
                for ring in consolidate_rings_single(members_k)
                if len(ring) >= 3
            ]
        )
        for k, members_k in members_rings.items()
    }
    return difference(members_geoms["outer"], members_geoms["inner"])


def frame_for_result(result: _OverpyResultLike, *, keep_tags: bool) -> gpd.GeoDataFrame:
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
    gdf_data: dict[str, list[str] | list[dict[str, str]]] = dict(
        name=[
            x.tags["name"]
            for x in with_tags_nodes + with_tags_ways + with_tags_relations
        ]
    )
    if keep_tags:
        gdf_data["tags"] = [
            x.tags for x in with_tags_nodes + with_tags_ways + with_tags_relations
        ]
    return gpd.GeoDataFrame(
        gdf_data,
        geometry=polygon_nodes + polygon_ways + polygoon_relations,
    )
