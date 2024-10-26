from permacache import permacache, stable_hash

from urbanstats.statistics.collections_list import statistic_collections


@permacache(
    "population_density/stats_for_shapefile/compute_statistics_for_shapefile_24",
    key_function=dict(sf=lambda x: x.hash_key, statistic_collections=stable_hash),
    multiprocess_safe=True,
)
def compute_statistics_for_shapefile(sf, statistic_collections=statistic_collections):
    sf_fr = sf.load_file()
    print(sf)
    result = sf_fr[["shortname", "longname"]].copy()
    result["area"] = sf_fr["geometry"].to_crs({"proj": "cea"}).area / 1e6
    assert (result.longname == sf_fr.longname).all()
    for k in sf.meta:
        result[k] = sf.meta[k]

    for collection in statistic_collections:
        if collection.for_america():
            collection.compute_statistics(sf, result, sf_fr)

    return result
