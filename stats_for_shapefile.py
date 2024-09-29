import pickle
from collections import Counter
from functools import lru_cache
import re

import attr
import geopandas as gpd
import pandas as pd
import tqdm.auto as tqdm
from more_itertools import chunked
from permacache import drop_if_equal, permacache, stable_hash

from census_blocks import all_densities_gpd, housing_units, racial_demographics
from urbanstats.census_2010.blocks_2010 import block_level_data_2010
from urbanstats.features.extract_data import feature_data
from urbanstats.features.feature import feature_columns
from urbanstats.osm.parks import park_overlap_percentages_all
from urbanstats.statistics.collections.cdc_statistics import CDCStatistics
from urbanstats.statistics.collections.census_basics import density_metrics
from urbanstats.statistics.collections.usda_fra_statistics import USDAFRAStatistics
from urbanstats.statistics.collections.weather import USWeatherStatistics
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.weather.to_blocks import weather_block_statistics


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
    tolerate_no_state = attr.ib(default=False)

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
            longname_to_indices = (
                s["longname"]
                .reset_index(drop=True)
                .reset_index()
                .groupby("longname")["index"]
                .apply(list)
                .to_dict()
            )
            duplicates = {k: v for k, v in longname_to_indices.items() if len(v) > 1}
            if self.drop_dup is True:
                s = s[s.longname.apply(lambda x: x not in duplicates)]
            else:
                s = drop_duplicate(s, duplicates, self.drop_dup)
        if s.crs is None:
            s.crs = "EPSG:4326"
        s = s.to_crs("EPSG:4326")
        return s


@lru_cache(None)
def load_shapefile_cached(drop_dup_shapefile_key):
    from shapefiles import shapefiles

    return shapefiles[drop_dup_shapefile_key].load_file()


def shapefile_hash_key(sf_key):
    from shapefiles import shapefiles

    return shapefiles[sf_key].hash_key


@permacache(
    "stats_for_shapefile/locate_rows_3",
    key_function=dict(
        shape=lambda g: stable_hash(g.__geo_interface__),
        shapefile_key=shapefile_hash_key,
    ),
)
def locate_rows(shape, shapefile_key):
    shapefile = load_shapefile_cached(shapefile_key)
    result = shapefile[
        shapefile.apply(lambda x: x.geometry.intersects(shape), axis=1)
    ].copy()
    result["overlap_area"] = result.apply(
        lambda x: x.geometry.intersection(shape).area, axis=1
    )
    result["overlap_pct"] = result.overlap_area / shape.area
    return result


def remove_total_duplicates(s, indices):
    first_row = s.iloc[indices[0]]
    hash_geo = stable_hash(first_row.geometry.__geo_interface__)
    kept = [indices[0]]
    duplicates = []
    for idx in indices[1:]:
        if stable_hash(s.iloc[idx].geometry.__geo_interface__) == hash_geo:
            duplicates.append(idx)
        else:
            kept.append(idx)
    return kept, duplicates


def drop_duplicate(s, duplicates, drop_dup_shapefile_key):
    from urbanstats.data.circle import naive_directions_for_rows_with_names

    all_delete_indices = set()
    for longname, indices in tqdm.tqdm(list(duplicates.items())):
        indices, delete_indices = remove_total_duplicates(s, indices)
        all_delete_indices.update(delete_indices)
        if len(indices) == 1:
            continue
        addtl_name_each = [
            compute_additional_name(s.iloc[idx].geometry, drop_dup_shapefile_key)
            for idx in indices
        ]
        addtl_name_each = naive_directions_for_rows_with_names(
            s.iloc[indices], addtl_name_each
        )
        for addtl_name, idx in zip(addtl_name_each, indices):
            new_longname = compute_new_longname(
                addtl_name, longname, s.iloc[idx].shortname
            )
            s.loc[idx, "longname"] = new_longname
    s = s.drop(index=all_delete_indices).reset_index(drop=True)
    return s


def compute_new_longname(addtl_name, longname, shortname):
    if longname.startswith(shortname):
        new_longname = f"{shortname} ({addtl_name}){longname[len(shortname):]}"
    elif "Neighborhood" in longname:
        pre_neighborhood, post_neighborhood = longname.split(" Neighborhood")
        new_longname = (
            f"{pre_neighborhood} Neighborhood ({addtl_name}){post_neighborhood}"
        )
    else:
        raise ValueError(f"Unparseable longname {longname}")
    return new_longname


def compute_additional_name(geometry, drop_dup_shapefile_key):
    counties_in = locate_rows(geometry, drop_dup_shapefile_key)[
        ["longname", "shortname", "overlap_pct"]
    ].copy()
    counties_in.sort_values("overlap_pct", inplace=True, ascending=False)
    account_for = 0
    relevant = []
    for _, row in counties_in.iterrows():
        relevant.append(strip_suffix(row.shortname))
        account_for += row.overlap_pct
        if account_for >= 0.99:
            break
    return "-".join(relevant)


def strip_suffix(name):
    if name in {
        "District of Columbia",
        "Township 1, Charlotte",
        "Township 12, Paw Creek",
    } or re.match(r"^District \d+$", name):
        return name
    suffixes = [
        " county",
        " parish",
        " borough",
        " census area",
        " municipio",
        " city",
        " planning region",
        " city-county",
        " ccd",
        " township",
        " district",
        " town",
        " barrio",
    ]
    for suffix in suffixes:
        if name.lower().endswith(suffix.lower()):
            return name[: -len(suffix)]
    raise ValueError(f"Unknown suffix in {name}")


sum_keys_2020 = [
    "population",
    "population_18",
    *racial_demographics,
    *housing_units,
    *density_metrics,
    *feature_columns,
    "park_percent_1km_v2",
    *USWeatherStatistics().name_for_each_statistic(),
]
sum_keys_2020 = sorted(sum_keys_2020, key=str)
sum_keys_2010 = [
    "population_2010",
    "population_18_2010",
    *[f"{k}_2010" for k in racial_demographics],
    *[f"{k}_2010" for k in housing_units],
    *[f"{k}_2010" for k in density_metrics],
    *CDCStatistics().name_for_each_statistic(),
    *USDAFRAStatistics().name_for_each_statistic(),
]
sum_keys_2010 = sorted(sum_keys_2010, key=str)
COLUMNS_PER_JOIN = 33


@lru_cache(None)
def block_level_data_2020():
    blocks_gdf = all_densities_gpd()
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
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_24",
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
    for k in sf.meta:
        result[k] = sf.meta[k]

    for collection in statistic_collections:
        if collection.for_america():
            collection.compute_statistics(sf, result, sf_fr)

    return result


def compute_grouped_stats(blocks_gdf, s, sum_keys):
    joined = crosswalk(blocks_gdf, s, sum_keys)
    grouped_stats = pd.DataFrame(joined[sum_keys]).groupby(joined.index).sum()
    return grouped_stats

def crosswalk(blocks_gdf, s, sum_keys):
    return s.sjoin(
        blocks_gdf[[*sum_keys, "geometry"]].fillna(0),
        how="inner",
        predicate="intersects",
    )
