from permacache import permacache, stable_hash
import pandas as pd
import geopandas as gpd
from election_data import with_election_results

from .entities import entities, entities_split_by_usa_pr
from .load import get_acs_data


@permacache(
    "urbanstats/acs/attach/with_acs_data_2",
    key_function=dict(entities=stable_hash, entities_split_by_usa_pr=stable_hash),
)
def with_acs_data(entities=entities, entities_split_by_usa_pr=entities_split_by_usa_pr):
    data = with_election_results()
    additional = [get_acs_data(entity) for entity in entities.values()]
    additional += [
        combine_us_pr(us, pr) for us, pr in entities_split_by_usa_pr.values()
    ]
    for df in additional:
        assert (df.index == data.index).all()
    return gpd.GeoDataFrame(pd.concat([data] + additional, axis=1))


def combine_us_pr(us, pr):
    us, pr = get_acs_data(us), get_acs_data(pr)
    assert list(us) == list(pr) and (us.index == pr.index).all()
    return us.fillna(0) + pr.fillna(0)
