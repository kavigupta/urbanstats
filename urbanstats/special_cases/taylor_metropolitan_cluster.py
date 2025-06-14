import geopandas as gpd
from permacache import permacache

from urbanstats.special_cases.country import subnational_regions
from urbanstats.special_cases.ghsl_urban_center import (
    attach_subnational_suffxes,
    classify_areas_by_subnational_region,
)


@permacache(
    "urbanstats/special_cases/taylor_metropolitan_cluster/load_taylor_metropolitan_clusters_post_pruning"
)
def load_taylor_metropolitan_clusters_post_pruning(min_km2=0.5):
    tmc = load_taylor_metropolitan_clusters_pre_pruning()
    area_m2 = tmc.to_crs(dict(proj="cea")).area
    tmc = tmc[area_m2 >= min_km2 * 1e6]
    return tmc


@permacache(
    "urbanstats/special_cases/taylor_metropolitan_cluster/load_taylor_metropolitan_clusters_2"
)
def load_taylor_metropolitan_clusters_pre_pruning():
    tmc = gpd.read_file(
        "named_region_shapefiles/taylor-metropolitan-clusters/output/taylor_metropolitan_clusters.shp.zip"
    )
    subn = subnational_regions()
    tmc["index_"] = tmc.index
    table = classify_areas_by_subnational_region(subn, tmc)
    table_updated = table.copy()
    for name, iso_code in [
        ("Kongdongdao Village", "CNSD"),
        ("Hei Ling Chau-Chi Ma Wan Peninsula-Cheung Chau", "CNHK"),
        ("Mangsee", "MY12"),
        ("Betio", "KIG"),
    ]:
        [idx] = tmc.index[tmc.name == name]
        table_updated.loc[idx] = [{iso_code[:2]}, {iso_code}]
    attach_subnational_suffxes(
        tmc, subn, table_updated, name_column="name", more_general_direction=True
    )
    tmc["shortname"] = (
        tmc.name
        + tmc.mid.apply(lambda x: " (" + x + ")" if x else "")
        + " Metropolitan Cluster"
    )
    tmc["longname"] = tmc.shortname + ", " + tmc.suffix
    return tmc
