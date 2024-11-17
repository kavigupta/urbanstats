from urbanstats.data.circle import circle_shapefile_object, named_populations
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES


def compute_circles():
    pc_shapefiles = {}
    pc_usa_to_intl = {}

    for population, name in named_populations.items():
        key = f"population_circle_{name}"
        intl = circle_shapefile_object(COUNTRIES, population, just_usa=False)
        pc_shapefiles[key] = intl
        pc_usa_to_intl["US " + intl.meta["type"]] = intl.meta["type"]
    return pc_shapefiles, pc_usa_to_intl


(
    population_circles_shapefiles,
    population_circles_usa_to_international,
) = compute_circles()
