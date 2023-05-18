from collections import Counter

import attr
import pandas as pd
from census_blocks import RADII, all_densities_gpd, racial_demographics, housing_units
import geopandas as gpd

from permacache import permacache

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

    def load_file(self):
        if isinstance(self.path, list):
            s = gpd.GeoDataFrame(pd.concat([gpd.read_file(p) for p in self.path]))
            s = s.reset_index(drop=True)
        else:
            s = gpd.read_file(self.path)
        s = s[s.apply(self.filter, axis=1)]
        s = gpd.GeoDataFrame(
            dict(
                shortname=s.apply(self.shortname_extractor, axis=1),
                longname=s.apply(self.longname_extractor, axis=1),
            ),
            geometry=s.geometry,
        )
        if self.drop_dup:
            duplicates = {k : v for k, v in Counter(s.longname).items() if v > 1}
            s = s[s.longname.apply(lambda x: x not in duplicates)]

        s = s.to_crs("EPSG:4326")
        return s


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_4",
    key_function=dict(sf=lambda x: x.hash_key),
)
def compute_statistics_for_shapefile(sf):
    blocks_gdf = all_densities_gpd()
    s = sf.load_file()
    area = s["geometry"].to_crs({"proj": "cea"}).area / 1e6
    density_metrics = [f"ad_{k}" for k in RADII]
    sum_keys = [
        "population",
        "population_18",
        *racial_demographics,
        *housing_units,
        *density_metrics,
    ]
    joined = s.sjoin(blocks_gdf, how="inner", predicate="intersects")
    grouped_stats = pd.DataFrame(joined[sum_keys]).groupby(joined.index).sum()
    for k in density_metrics:
        grouped_stats[k] /= grouped_stats["population"]
    result = pd.concat(
        [s[["longname", "shortname"]], grouped_stats, pd.DataFrame(dict(area=area))],
        axis=1,
    )
    result["sd"] = result["population"] / result["area"]
    del result["area"]
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
    return result
