from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import keyed_on


@permacache(
    "urbanstats/geometry/shapefiles/longnames/shapefile_longnames",
    key_function=dict(shapefile=keyed_on("longname")),
)
def shapefile_longnames(shapefile):
    """Each region's longname, in row order."""
    return list(shapefile.load_file().longname)
