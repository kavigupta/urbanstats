import tqdm.auto as tqdm

from .query import query_to_geopandas


def national_stops():
    query = f"""
    [out:json][timeout:1000];
    area(id:3600148838)->.searchArea;
    (
    node["highway"="bus_stop"](area.searchArea);
    way["highway"="bus_stop"](area.searchArea);
    relation["highway"="bus_stop"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
    """
    return query_to_geopandas(query, keep_tags=True)
