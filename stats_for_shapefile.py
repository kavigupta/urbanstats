import attr
import pandas as pd
from census_blocks import RADII, all_densities_gpd
import geopandas as gpd

from permacache import permacache


@attr.s
class Shapefile:
    hash_key = attr.ib()
    path = attr.ib()
    shortname_extractor = attr.ib()
    longname_extractor = attr.ib()
    filter = attr.ib()
    meta = attr.ib()

    def load_file(self):
        s = gpd.read_file(self.path)
        s = s[s.apply(self.filter, axis=1)]
        s = gpd.GeoDataFrame(
            dict(
                shortname=s.apply(self.shortname_extractor, axis=1),
                longname=s.apply(self.longname_extractor, axis=1),
            ),
            geometry=s.geometry,
        )
        s = s.to_crs("EPSG:4326")
        return s


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile",
    key_function=dict(sf=lambda x: x.hash_key),
)
def compute_statistics_for_shapefile(sf):
    blocks_gdf = all_densities_gpd()
    s = sf.load_file()
    area = s["geometry"].to_crs({"proj": "cea"}).area / 1e6
    density_metrics = [f"ad_{k}" for k in RADII]
    sum_keys = ["population", *density_metrics]
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
    return result
