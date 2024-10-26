import tqdm.auto as tqdm
import geopandas as gpd
import numpy as np
from permacache import permacache
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.data.gpw import produce_histogram


@permacache(
    "urbanstats/data/census_histogram", key_function=dict(shap=lambda x: x.hash_key)
)
def census_histogram(shap, year):
    s = shap.load_file()
    if shap.chunk_size:
        result = {}
        for i in range(0, len(s), shap.chunk_size):
            result.update(
                census_histogram_direct(
                    f"{shap.hash_key} {i}-{i+shap.chunk_size}",
                    year,
                    s.iloc[i : i + shap.chunk_size],
                )
            )
        return result
    return census_histogram_direct(shap.hash_key, year, s)


def census_histogram_direct(desc, year, s):
    dens = all_densities_gpd(year)
    j = gpd.sjoin(
        s,
        gpd.GeoDataFrame(
            dens[[x for x in dens if x.startswith("ad_")] + ["population", "geometry"]]
        ).to_crs("epsg:4326"),
    )
    j = j.set_index("longname")
    include_names = set(j.index)
    result = {}
    for longname in tqdm.tqdm(s.longname, desc=desc):
        if longname not in include_names:
            continue
        result[longname] = {}
        for k in [x for x in dens if x.startswith("ad_")]:
            popu = j.loc[longname, "population"]
            hist_census = produce_histogram(
                np.array(j.loc[longname, k] / popu), np.array(popu)
            )
            result[longname][k] = hist_census
    return result
