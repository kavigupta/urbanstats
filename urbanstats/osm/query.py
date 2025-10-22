import overpy
from permacache import drop_if_equal, permacache

from .to_geopandas import frame_for_result


@permacache(
    "urbanstats/osm/query/query_to_geopandas",
    key_function=dict(keep_tags=drop_if_equal(False)),
)
def query_to_geopandas(query, *, keep_tags=False):
    api = overpy.Overpass()
    result = api.query(query)
    return frame_for_result(result, keep_tags=keep_tags)
