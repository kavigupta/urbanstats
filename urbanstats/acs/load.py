import attr
import numpy as np
import pandas as pd
import requests
import tqdm.auto as tqdm
import us
from cached_property import cached_property
from permacache import permacache, stable_hash

from election_data import with_election_results
from urbanstats.geometry.census_aggregation import aggregate_by_census_block

TRACT_PREFIX_COUNT = 2 + 3 + 6  # state + county + tract
BLOCK_GROUP_PREFIX_COUNT = TRACT_PREFIX_COUNT + 1  # block group


def extract_tract_geoid(geoid):
    return geoid.split("US")[1][:TRACT_PREFIX_COUNT]


def extract_block_group_geoid(geoid):
    return geoid.split("US")[1][:BLOCK_GROUP_PREFIX_COUNT]


@permacache("population_density/acs/acs_variables")
def acs_variables():
    url = "https://api.census.gov/data/2021/acs/acs5/variables.json"

    r = requests.get(url)
    r.raise_for_status()
    res = r.json()
    assert res.keys() == {"variables"}
    return res["variables"]


def for_concept(concept):
    res = {
        k: v
        for k, v in acs_variables().items()
        if "concept" in v and v["concept"] == concept
    }
    return {k: res[k] for k in sorted(res)}


@permacache("population_density/acs/query_acs_2")
def query_acs_for_state_direct(keys, state_fips, geography_level):
    url = "https://api.census.gov/data/2021/acs/acs5"
    params = {
        "get": ",".join(keys),
        "for": geography_level + ":*",
        "in": f"state:{state_fips} county:*",
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def query_acs_for_state(keys, state_fips, geography_level):
    # The Census API has a limit of 50 variables per query, so we need to split
    # up the query into multiple queries.
    results = {}
    for i in range(0, len(keys), 50):
        for col_header, *col in zip(
            *query_acs_for_state_direct(keys[i : i + 50], state_fips, geography_level)
        ):
            if col_header in results:
                assert col_header in ["state", "county", "tract", "block group"]
                continue
            results[col_header] = col
    stack = [[k] + v for k, v in results.items()]
    assert all(len(x) == len(stack[0]) for x in stack)
    res = list(zip(*stack))
    return res


def query_acs(
    keys, categories, var_for_concept, geography_level, *, replace_negatives_with_nan
):
    all_data = []
    for state in tqdm.tqdm(us.states.STATES + [us.states.DC, us.states.PR]):
        all_data.append(query_acs_for_state(keys, state.fips, geography_level))
    header = all_data[0][0]
    for data in all_data:
        assert data[0] == header
    data = pd.DataFrame([row for data in all_data for row in data[1:]], columns=header)
    for key in keys:
        data[key] = pd.to_numeric(data[key])

    label_to_column = {v["label"]: k for k, v in var_for_concept.items()}
    result = {col: data[col] for col in data if col not in keys}
    for category, keys_for_category in categories.items():
        for_category = 0
        for key in keys_for_category:
            for_key = data[label_to_column[key]]
            if replace_negatives_with_nan:
                for_key[for_key < 0] = np.nan
            for_category += for_key
        result[category] = for_category
    return pd.DataFrame(result)


def disaggregate_to_blocks(
    acs_parent_data,
    census_block_data,
    universe_for_disagg,
    acs_columns,
    *,
    parent,
):
    """
    Either disaggregate by block group or census tract to block
    """
    assert parent in ["block group", "tract"]
    assert universe_for_disagg in census_block_data
    extract = (
        extract_block_group_geoid if parent == "block group" else extract_tract_geoid
    )
    census_parent = census_block_data.geoid.apply(extract)
    census_universe_pop_by_parent = (
        census_block_data[universe_for_disagg].groupby(census_parent).sum()
    )
    census_universe_pop_by_parent = dict(
        zip(census_universe_pop_by_parent.index, census_universe_pop_by_parent)
    )
    acs_parent = acs_parent_data.state + acs_parent_data.county + acs_parent_data.tract
    if parent == "block group":
        acs_parent += acs_parent_data["block group"]
    assert set(census_parent) - set(acs_parent) == set()
    denominator = acs_parent.apply(
        lambda x: census_universe_pop_by_parent.get(x, np.nan)
    )
    disagg = (acs_parent_data[acs_columns] / np.array(denominator)[:, None]).set_index(
        acs_parent
    )
    return (
        disagg.loc[census_parent].reset_index(drop=True)
        * np.array(census_block_data[universe_for_disagg])[:, None]
    )


@attr.s
class ACSDataEntity:
    concept = attr.ib()
    universe_for_disagg = attr.ib()
    geography_level = attr.ib()
    _categories = attr.ib()
    replace_negatives_with_nan = attr.ib(default=False)

    @cached_property
    def var_for_concept(self):
        var_for_concept = for_concept(self.concept)
        all_labels = set(x["label"] for x in var_for_concept.values())
        used_labels = {x for xs in self._categories.values() for x in xs}
        assert all_labels - used_labels == set(), sorted(all_labels - used_labels)
        assert used_labels - all_labels == set(), sorted(used_labels - all_labels)
        return {k: v for k, v in var_for_concept.items()}

    @property
    def categories(self):
        return {k: sorted(v) for k, v in self._categories.items() if k is not None}


@permacache(
    "population_density/acs/get_acs_data_3",
    key_function=dict(acs_data_entity=stable_hash),
)
def get_acs_data(acs_data_entity):
    data = with_election_results()
    acs_data = query_acs(
        sorted(acs_data_entity.var_for_concept),
        acs_data_entity.categories,
        acs_data_entity.var_for_concept,
        acs_data_entity.geography_level,
        replace_negatives_with_nan=acs_data_entity.replace_negatives_with_nan,
    )
    return disaggregate_to_blocks(
        acs_data,
        data,
        acs_data_entity.universe_for_disagg,
        list(acs_data_entity.categories),
        parent=acs_data_entity.geography_level,
    )


def combine_us_pr(us, pr):
    us, pr = get_acs_data(us), get_acs_data(pr)
    assert list(us) == list(pr) and (us.index == pr.index).all()
    return us.fillna(0) + pr.fillna(0)


@permacache(
    "population_density/acs/aggregated_acs_data",
    key_function=dict(entity=stable_hash, shapefile=lambda x: x.hash_key),
)
def aggregated_acs_data(year, entity, shapefile):
    print("Aggregating ACS data for", entity.concept)
    print("    on shapefile", shapefile.hash_key)
    acs_data = get_acs_data(entity)
    acs_data = aggregate_by_census_block(year, shapefile, acs_data)
    return acs_data

@permacache(
    "population_density/acs/aggregated_acs_data_us_pr",
    key_function=dict(entity_us=stable_hash, entity_pr=stable_hash, shapefile=lambda x: x.hash_key),
)
def aggregated_acs_data_us_pr(year, entity_us, entity_pr, shapefile):
    print("Aggregating ACS data for", entity_us.concept)
    print("    on shapefile", shapefile.hash_key)
    acs_data = combine_us_pr(entity_us, entity_pr)
    acs_data = aggregate_by_census_block(year, shapefile, acs_data)
    return acs_data
