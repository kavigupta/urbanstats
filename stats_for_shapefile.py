from collections import Counter
from functools import lru_cache
import pickle

import attr
import pandas as pd
import numpy as np
import tqdm.auto as tqdm
from more_itertools import chunked
from census_blocks import RADII, racial_demographics, housing_units
from election_data import election_column_names

import geopandas as gpd

from permacache import permacache, stable_hash

from urbanstats.acs.attach import with_acs_data
from urbanstats.acs.entities import acs_columns
from urbanstats.features.feature import feature_columns
from urbanstats.features.extract_data import feature_data
from urbanstats.osm.parks import park_overlap_percentages_all
from urbanstats.weather.to_blocks import weather_stat_names, weather_block_statistics

racial_statistics = {
    "white": "White %",
    "hispanic": "Hispanic %",
    "black": "Black %",
    "asian": "Asian %",
    "native": "Native %",
    "hawaiian_pi": "Hawaiian / PI %",
    "other / mixed": "Other / Mixed %",
}

housing_stats = {
    "housing_per_pop": "Housing Units per Adult",
    "vacancy": "Vacancy %",
    "rent_or_own_rent": "Renter %",
    "rent_burden_under_20": "Rent/Income < 20%",
    "rent_burden_20_to_40": "Rent/Income 20%-40%",
    "rent_burden_over_40": "Rent/Income > 40%",
    "rent_1br_under_750": "1BR Rent < $750 %",
    "rent_1br_750_to_1500": "1BR Rent $750 - $1500 %",
    "rent_1br_over_1500": "1BR Rent > $1500 %",
    "rent_2br_under_750": "2BR Rent < $750 %",
    "rent_2br_750_to_1500": "2BR Rent $750 - $1500 %",
    "rent_2br_over_1500": "2BR Rent > $1500 %",
    "year_built_1969_or_earlier": "% units built pre-1970",
    "year_built_1970_to_1979": "% units built in 1970s",
    "year_built_1980_to_1989": "% units built in 1980s",
    "year_built_1990_to_1999": "% units built in 1990s",
    "year_built_2000_to_2009": "% units built in 2000s",
    "year_built_2010_or_later": "% units built in 2010s+",
}

education_stats = {
    "education_high_school": "High School %",
    "education_ugrad": "Undergrad %",
    "education_grad": "Grad %",
    "education_field_stem": "Undergrad STEM %",
    "education_field_humanities": "Undergrad Humanities %",
    "education_field_business": "Undergrad Business %",
}

generation_stats = {
    "generation_silent": "Silent %",
    "generation_boomer": "Boomer %",
    "generation_genx": "Gen X %",
    "generation_millenial": "Millennial %",
    "generation_genz": "Gen Z %",
    "generation_genalpha": "Gen Alpha %",
}

income_stats = {
    "poverty_below_line": "Poverty %",
    "household_income_under_50k": "Household Income < $50k %",
    "household_income_50k_to_100k": "Household Income $50k - $100k %",
    "household_income_over_100k": "Household Income > $100k %",
    "individual_income_under_50k": "Individual Income < $50k %",
    "individual_income_50k_to_100k": "Individual Income $50k - $100k %",
    "individual_income_over_100k": "Individual Income > $100k %",
}

transportation_stats = {
    "transportation_means_car": "Commute Car %",
    "transportation_means_bike": "Commute Bike %",
    "transportation_means_walk": "Commute Walk %",
    "transportation_means_transit": "Commute Transit %",
    "transportation_means_worked_at_home": "Commute Work From Home %",
    "transportation_commute_time_under_15": "Commute Time < 15 min %",
    "transportation_commute_time_15_to_29": "Commute Time 15 - 29 min %",
    "transportation_commute_time_30_to_59": "Commute Time 30 - 59 min %",
    "transportation_commute_time_over_60": "Commute Time > 60 min %",
}

national_origin_stats = {
    "citizenship_citizen_by_birth": "Citizen by Birth %",
    "citizenship_citizen_by_naturalization": "Citizen by Naturalization %",
    "citizenship_not_citizen": "Non-citizen %",
    "birthplace_non_us": "Born outside US %",
    "birthplace_us_not_state": "Born in us outside state %",
    "birthplace_us_state": "Born in state of residence %",
    "language_english_only": "Only English at Home %",
    "language_spanish": "Spanish at Home %",
    "language_other": "Other at Home %",
}

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


density_metrics = [f"ad_{k}" for k in RADII]
sum_keys = [
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
COLUMNS_PER_JOIN = 33


@lru_cache(None)
def block_level_data():
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


@permacache(
    "population_density/stats_for_shapefile/compute_summed_shapefile_3",
    key_function=dict(sf=lambda x: x.hash_key, sum_keys=stable_hash),
)
def compute_summed_shapefile_few_keys(sf, sum_keys):
    print(sf, sum_keys)
    blocks_gdf = block_level_data()
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
    key_function=dict(sf=lambda x: x.hash_key, sum_keys=stable_hash),
)
def compute_summed_shapefile_all_keys(sf, sum_keys=sum_keys):
    print(sf)
    result = {}
    for keys in tqdm.tqdm(list(chunked(sum_keys, COLUMNS_PER_JOIN))):
        frame = compute_summed_shapefile_few_keys(sf, keys)
        for k in frame:
            result[k] = frame[k]
    return pd.DataFrame(result)


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_16",
    key_function=dict(sf=lambda x: x.hash_key, sum_keys=stable_hash),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(sf, sum_keys=sum_keys):
    sf_fr = sf.load_file()
    print(sf)
    result = compute_summed_shapefile_all_keys(sf, sum_keys).copy()
    assert (result.longname == sf_fr.longname).all()
    result["perimiter"] = sf_fr.geometry.to_crs({"proj": "cea"}).length / 1e3
    result["compactness"] = 4 * np.pi * result.area / result.perimiter**2
    for k in density_metrics:
        result[k] /= result["population"]
    result["sd"] = result["population"] / result["area"]
    for k in sf.meta:
        result[k] = sf.meta[k]
    for k in racial_demographics:
        result[k] /= result["population"]
    result["other / mixed"] = result["other"] + result["mixed"]
    del result["other"]
    del result["mixed"]
    result["housing_per_pop"] = result["total"] / result["population_18"]
    result["vacancy"] = result["vacant"] / result["total"]
    del result["vacant"]
    del result["total"]
    del result["occupied"]
    del result["population_18"]

    education_denominator = (
        result.education_no
        + result.education_high_school
        + result.education_ugrad
        + result.education_grad
    )
    result["education_high_school"] = (
        result.education_high_school + result.education_ugrad + result.education_grad
    ) / education_denominator
    result["education_ugrad"] = (
        result.education_ugrad + result.education_grad
    ) / education_denominator
    result["education_grad"] = result.education_grad / education_denominator
    del result["education_no"]

    def fractionalize(*columns):
        denominator = sum(result[c] for c in columns)
        for c in columns:
            result[c] = result[c] / denominator

    for column in (
        "education_field_stem",
        "education_field_humanities",
        "education_field_business",
    ):
        result[column] = result[column] / education_denominator
    fractionalize(
        "generation_silent",
        "generation_boomer",
        "generation_genx",
        "generation_millenial",
        "generation_genz",
        "generation_genalpha",
    )
    fractionalize(
        "household_income_under_50k",
        "household_income_50k_to_100k",
        "household_income_over_100k",
    )
    fractionalize(
        "individual_income_under_50k",
        "individual_income_50k_to_100k",
        "individual_income_over_100k",
    )

    fractionalize(
        "transportation_means_car",
        "transportation_means_bike",
        "transportation_means_walk",
        "transportation_means_transit",
        "transportation_means_worked_at_home",
        "transportation_means_other",
    )
    del result["transportation_means_other"]

    fractionalize(
        "transportation_commute_time_under_15",
        "transportation_commute_time_15_to_29",
        "transportation_commute_time_30_to_59",
        "transportation_commute_time_over_60",
    )

    fractionalize(
        "rent_1br_under_750",
        "rent_1br_750_to_1500",
        "rent_1br_over_1500",
    )
    fractionalize(
        "rent_2br_under_750",
        "rent_2br_750_to_1500",
        "rent_2br_over_1500",
    )

    fractionalize(
        "rent_burden_under_20",
        "rent_burden_20_to_40",
        "rent_burden_over_40",
    )

    fractionalize(
        "rent_or_own_rent",
        "rent_or_own_own",
    )
    del result["rent_or_own_own"]

    fractionalize(
        "year_built_1969_or_earlier",
        "year_built_1970_to_1979",
        "year_built_1980_to_1989",
        "year_built_1990_to_1999",
        "year_built_2000_to_2009",
        "year_built_2010_or_later",
    )

    fractionalize(
        "insurance_coverage_none",
        "insurance_coverage_govt",
        "insurance_coverage_private",
    )

    fractionalize(
        "poverty_above_line",
        "poverty_below_line",
    )
    del result["poverty_above_line"]

    fractionalize(
        "internet_access",
        "internet_no_access",
    )
    del result["internet_access"]

    fractionalize(
        "language_english_only",
        "language_spanish",
        "language_other",
    )

    fractionalize(
        "marriage_never_married",
        "marriage_married_not_divorced",
        "marriage_divorced",
    )

    fractionalize(
        "citizenship_citizen_by_birth",
        "citizenship_citizen_by_naturalization",
        "citizenship_not_citizen",
    )

    fractionalize(
        "birthplace_non_us",
        "birthplace_us_not_state",
        "birthplace_us_state",
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
