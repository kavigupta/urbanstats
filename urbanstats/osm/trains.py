import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
import tqdm.auto as tqdm
import us
from permacache import permacache

from ..features.within_distance import census_block_coordinates, point_to_radius
from .query import query_to_geopandas


def national_stations():
    query = f"""
    [out:json][timeout:25];
    area(id:3600148838)->.searchArea;
    (
    node["railway"="station"](area.searchArea);
    way["railway"="station"](area.searchArea);
    relation["railway"="station"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
    """
    return query_to_geopandas(query, keep_tags=True)
