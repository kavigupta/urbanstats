from permacache import permacache, stable_hash


@permacache(
    "urbanstats/geometry/shapefiles/longnames/shapefile_longnames",
    key_function=dict(names=stable_hash),
)
def shapefile_longnames(names):
    """Each region's longname, in row order."""
    return list(names.load().longname)
