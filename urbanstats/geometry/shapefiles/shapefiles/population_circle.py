from urbanstats.data.circle import circle_shapefile_object, named_populations
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES


population_circles_shapefiles = {}
population_circles_usa_shapefiles = {}
population_circles_usa_to_international = {}

for population in named_populations:
    key = f"population_circle_{named_populations[population]}"
    intl = circle_shapefile_object(COUNTRIES, population, just_usa=False)
    population_circles_shapefiles[key] = intl
    us = circle_shapefile_object(COUNTRIES, population, just_usa=True)
    population_circles_usa_shapefiles["us_" + key] = us
    population_circles_usa_to_international[us.meta["type"]] = intl.meta["type"]
