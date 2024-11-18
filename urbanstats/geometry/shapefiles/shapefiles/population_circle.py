from urbanstats.data.circle import circle_shapefile_object, named_populations
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES

population_circles_shapefiles = {
    f"population_circle_{name}": circle_shapefile_object(COUNTRIES, population)
    for population, name in named_populations.items()
}
