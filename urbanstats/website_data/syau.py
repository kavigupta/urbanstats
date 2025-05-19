from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


def syau_regions():
    return [x.meta["type"] for x in shapefiles.values() if x.include_in_syau]
