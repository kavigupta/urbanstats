from permacache import permacache
import pandas as pd
import geopandas as gpd
from election_data import with_election_results

from .entities import entities
from .load import get_acs_data


@permacache("urbanstats/acs/attach/with_acs_data_2")
def with_acs_data():
    data = with_election_results()
    additional = [get_acs_data(entity) for entity in entities.values()]
    for df in additional:
        assert (df.index == data.index).all()
    return gpd.GeoDataFrame(pd.concat([data] + additional, axis=1))
