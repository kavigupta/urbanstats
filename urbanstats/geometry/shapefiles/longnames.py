from permacache import permacache


@permacache(
    "urbanstats/geometry/shapefiles/longnames/shapefile_longnames",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def shapefile_longnames(shapefile):
    """Each region's longname, in row order."""
    return list(shapefile.load_file().longname)
