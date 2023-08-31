from permacache import permacache
import overpy

from .to_geopandas import frame_for_result


@permacache("urbanstats/osm/query/query_to_geopandas")
def query_to_geopandas(query):
    api = overpy.Overpass()
    result = api.query(query)
    return frame_for_result(result)
