import geopandas as gpd
import numpy as np
import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.data.gpw import produce_histogram


@permacache(
    "urbanstats/data/census_histogram", key_function=dict(shap=lambda x: x.hash_key)
)
def census_histogram(shap, year):
    table = all_densities_gpd(year)
    density_keys = [x for x in table if x.startswith("ad_")]
    return generic_histogram(shap, table, density_keys)


def generic_histogram(shap, table, density_keys):
    s = shap.load_file()
    if shap.chunk_size:
        result = {}
        for i in range(0, len(s), shap.chunk_size):
            result.update(
                generic_histogram_direct(
                    f"{shap.hash_key} {i}-{i+shap.chunk_size}",
                    s.iloc[i : i + shap.chunk_size],
                    table,
                    density_keys,
                )
            )
        return result
    return generic_histogram_direct(shap.hash_key, s, table, density_keys)


def generic_histogram_direct(desc, s, table, density_keys):
    j = gpd.sjoin(
        s,
        gpd.GeoDataFrame(table[density_keys + ["population", "geometry"]]).to_crs(
            "epsg:4326"
        ),
    )
    j = j.set_index("longname")
    include_names = set(j.index)
    result = {}
    for longname in tqdm.tqdm(s.longname, desc=desc):
        if longname not in include_names:
            continue
        result[longname] = {}
        for k in density_keys:
            popu = j.loc[longname, "population"]
            hist_census = produce_histogram(
                np.array(j.loc[longname, k] / popu), np.array(popu)
            )
            result[longname][k] = hist_census
    return result
