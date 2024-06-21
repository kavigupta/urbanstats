import pickle
from collections import Counter
from functools import lru_cache

import attr
import geopandas as gpd
import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from more_itertools import chunked
from permacache import drop_if_equal, permacache, stable_hash

from census_blocks import housing_units, racial_demographics
from election_data import election_column_names
from urbanstats.acs.attach import with_acs_data
from urbanstats.acs.entities import acs_columns
from urbanstats.census_2010.blocks_2010 import block_level_data_2010
from urbanstats.features.extract_data import feature_data
from urbanstats.features.feature import feature_columns
from urbanstats.osm.parks import park_overlap_percentages_all
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.weather.to_blocks import weather_block_statistics, weather_stat_names
from urbanstats.statistics.collections.census_basics import density_metrics
from urbanstats.statistics.collections.cdc_statistics import CDCStatistics

feature_stats = {
    "park_percent_1km_v2": "PW Mean % of parkland within 1km",
    **feature_columns,
}

misc_stats = {
    "internet_no_access": "No internet access %",
    "insurance_coverage_none": "Uninsured %",
    "insurance_coverage_govt": "Public Insurance %",
    "insurance_coverage_private": "Private Insurance %",
    "marriage_never_married": "Never Married %",
    "marriage_married_not_divorced": "Married (not divorced) %",
    "marriage_divorced": "Divorced %",
}


@attr.s
class Shapefile:
    hash_key = attr.ib()
    path = attr.ib()
    shortname_extractor = attr.ib()
    longname_extractor = attr.ib()
    filter = attr.ib()
    meta = attr.ib()
    drop_dup = attr.ib(default=False)
    chunk_size = attr.ib(default=None)
    american = attr.ib(default=True)
    include_in_gpw = attr.ib(default=False)

    def load_file(self):
        if isinstance(self.path, list):
            s = gpd.GeoDataFrame(pd.concat([gpd.read_file(p) for p in self.path]))
            s = s.reset_index(drop=True)
        elif isinstance(self.path, str):
            if self.path.endswith(".pkl"):
                with open(self.path, "rb") as f:
                    s = pickle.load(f).reset_index(drop=True)
            else:
                s = gpd.read_file(self.path)
        else:
            s = self.path()
        s = s[s.apply(self.filter, axis=1)]
        s = gpd.GeoDataFrame(
            dict(
                shortname=s.apply(self.shortname_extractor, axis=1),
                longname=s.apply(self.longname_extractor, axis=1),
            ),
            geometry=s.geometry,
        )
        if self.drop_dup:
            duplicates = {k: v for k, v in Counter(s.longname).items() if v > 1}
            s = s[s.longname.apply(lambda x: x not in duplicates)]
        if s.crs is None:
            s.crs = "EPSG:4326"
        s = s.to_crs("EPSG:4326")
        return s


sum_keys_2020 = [
    "population",
    "population_18",
    *racial_demographics,
    *housing_units,
    *density_metrics,
    *election_column_names,
    *acs_columns,
    *feature_columns,
    "park_percent_1km_v2",
    *weather_stat_names,
]
sum_keys_2020 = sorted(sum_keys_2020, key=str)
sum_keys_2010 = [
    "population_2010",
    "population_18_2010",
    *[f"{k}_2010" for k in racial_demographics],
    *[f"{k}_2010" for k in housing_units],
    *[f"{k}_2010" for k in density_metrics],
    *CDCStatistics().name_for_each_statistic(),
]
sum_keys_2010 = sorted(sum_keys_2010, key=str)
COLUMNS_PER_JOIN = 33


@lru_cache(None)
def block_level_data_2020():
    blocks_gdf = with_acs_data()
    feats = feature_data()
    [sh] = {x.shape for x in feats.values()}
    assert sh == (blocks_gdf.shape[0],)
    for k, v in feats.items():
        blocks_gdf[k] = v
    blocks_gdf["park_percent_1km_v2"] = (
        park_overlap_percentages_all(r=1) * blocks_gdf.population
    )
    weather_block = weather_block_statistics()
    for k in weather_block:
        assert k not in blocks_gdf
        assert blocks_gdf.shape[0] == weather_block[k].shape[0]
        blocks_gdf[k] = weather_block[k] * blocks_gdf.population
    return blocks_gdf


def block_level_data(year):
    if year == 2020:
        return block_level_data_2020()
    assert year == 2010
    return block_level_data_2010()


@permacache(
    "population_density/stats_for_shapefile/compute_summed_shapefile_3",
    key_function=dict(
        sf=lambda x: x.hash_key, sum_keys=stable_hash, year=drop_if_equal(2020)
    ),
)
def compute_summed_shapefile_few_keys(sf, sum_keys, year):
    print(sf, sum_keys)
    blocks_gdf = block_level_data(year)
    s = sf.load_file()
    area = s["geometry"].to_crs({"proj": "cea"}).area / 1e6
    if sf.chunk_size is None:
        grouped_stats = compute_grouped_stats(blocks_gdf, s, sum_keys)
    else:
        grouped_stats = []
        for i in tqdm.trange(0, s.shape[0], sf.chunk_size):
            grouped_stats.append(
                compute_grouped_stats(
                    blocks_gdf, s.iloc[i : i + sf.chunk_size], sum_keys
                )
            )
        grouped_stats = pd.concat(grouped_stats)
    result = pd.concat(
        [s[["longname", "shortname"]], grouped_stats, pd.DataFrame(dict(area=area))],
        axis=1,
    )
    return result


@permacache(
    "population_density/stats_for_shapefile/compute_summed_shapefile_all_keys_4",
    key_function=dict(
        sf=lambda x: x.hash_key, sum_keys=stable_hash, year=drop_if_equal(2020)
    ),
)
def compute_summed_shapefile_all_keys(sf, sum_keys, year=2020):
    print(sf)
    result = {}
    for keys in tqdm.tqdm(list(chunked(sum_keys, COLUMNS_PER_JOIN))):
        frame = compute_summed_shapefile_few_keys(sf, keys, year)
        for k in frame:
            result[k] = frame[k]
    return pd.DataFrame(result)


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_23",
    key_function=dict(sf=lambda x: x.hash_key, sum_keys=stable_hash),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(
    sf, sum_keys_2020=sum_keys_2020, sum_keys_2010=sum_keys_2010
):
    sf_fr = sf.load_file()
    print(sf)
    result_2020 = compute_summed_shapefile_all_keys(sf, sum_keys_2020, year=2020).copy()
    result_2010 = compute_summed_shapefile_all_keys(sf, sum_keys_2010, year=2010).copy()
    assert (result_2020.longname == result_2010.longname).all()
    # drop columns longname, shortname, area
    result_2010 = result_2010.drop(columns=["longname", "shortname", "area"])
    # assert no columns are in both result_2020 and result_2010
    overlap_cols = set(result_2020.columns) & set(result_2010.columns)
    assert not overlap_cols
    result = pd.concat([result_2020, result_2010], axis=1)
    assert (result.longname == sf_fr.longname).all()
    for k in density_metrics:
        result[k] /= result["population"]
    result["sd"] = result["population"] / result["area"]
    for k in sf.meta:
        result[k] = sf.meta[k]
    del result["other"]
    del result["mixed"]

    def fractionalize(*columns):
        denominator = sum(result[c] for c in columns)
        for c in columns:
            result[c] = result[c] / denominator

    for collection in statistic_collections:
        if collection.for_america():
            collection.mutate_statistic_table(result, sf_fr)

    fractionalize(
        "insurance_coverage_none",
        "insurance_coverage_govt",
        "insurance_coverage_private",
    )

    fractionalize(
        "internet_access",
        "internet_no_access",
    )
    del result["internet_access"]

    fractionalize(
        "marriage_never_married",
        "marriage_married_not_divorced",
        "marriage_divorced",
    )

    for feat in feature_columns:
        result[feat] = result[feat] / result["population"]

    result["park_percent_1km_v2"] /= result["population"]

    for weather_stat in weather_stat_names:
        result[weather_stat] = result[weather_stat] / result["population"]

    return result


def compute_grouped_stats(blocks_gdf, s, sum_keys):
    joined = s.sjoin(
        blocks_gdf[[*sum_keys, "geometry"]].fillna(0),
        how="inner",
        predicate="intersects",
    )
    grouped_stats = pd.DataFrame(joined[sum_keys]).groupby(joined.index).sum()
    return grouped_stats
