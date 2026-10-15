import geopandas as gpd
import numpy as np
import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.data.canada.canada_density import canada_shapefile_with_densities
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.data.gpw import produce_histogram


@permacache(
    "urbanstats/data/census_histogram_2", key_function=dict(shap=lambda x: x.hash_key)
)
def census_histogram(shap, year):
    table = all_densities_gpd(year)
    density_keys = [x for x in table if x.startswith("ad_")]
    return generic_histogram(shap, table, density_keys)


@permacache(
    "urbanstats/data/census_histogram_canada_3",
    key_function=dict(shap=lambda x: x.hash_key),
)
def census_histogram_canada(shap, year):
    table = canada_shapefile_with_densities(year)
    density_keys = [x for x in table if x.startswith("canada_density")]
    return generic_histogram(shap, table, density_keys)


def generic_histogram(shap, table, density_keys):
    return generic_histogram_direct(
        shap.hash_key, shap.load_file(), table, density_keys
    )


def generic_histogram_direct(desc, s, table, density_keys):
    j = gpd.sjoin(
        s,
        gpd.GeoDataFrame(table[density_keys + ["population", "geometry"]]).to_crs(
            "epsg:4326"
        ),
    )
    rows_by_name = dict(list(j.groupby("longname", sort=False)))
    result = {}
    for longname in tqdm.tqdm(s.longname, desc=desc):
        if longname not in rows_by_name:
            continue
        rows = rows_by_name[longname]
        result[longname] = {}
        for k in density_keys:
            popu = rows["population"]
            hist_census = produce_histogram(np.array(rows[k] / popu), np.array(popu))
            result[longname][k] = hist_census
    return result
