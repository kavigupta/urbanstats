import geopandas as gpd

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle


@permacache_with_remapping_pickle(
    "urbanstats/special_cases/taylor_metropolitan_cluster/load_taylor_metropolitan_clusters_post_pruning_4"
)
def load_taylor_metropolitan_clusters_post_pruning(min_km2=0.5):
    tmc = load_taylor_metropolitan_clusters_pre_pruning()
    area_m2 = tmc.to_crs(dict(proj="cea")).area
    tmc = tmc[area_m2 >= min_km2 * 1e6]
    return tmc


def load_taylor_metropolitan_clusters_pre_pruning():
    tmc = gpd.read_file(
        "named_region_shapefiles/taylor-metropolitan-clusters/output/taylor_metropolitan_clusters.shp.zip"
    )
    bad_names = list(tmc.name[tmc.name.apply(lambda x: "?" in x)])
    assert not bad_names, bad_names
    return tmc
