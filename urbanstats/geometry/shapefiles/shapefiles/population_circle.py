from urbanstats.data.circle import circle_shapefile_object, named_populations
from urbanstats.geometry.shapefiles.shapefile import EmptyShapefileError
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES

# Excluded shapefiles. These are shapefiles that have no entries.
# When you update the list of circle shapefiles, you should clear this tuple and run
# PYTHONPATH=. python scripts/population_circle_exclusion.py
excl = (
    "us_population_circle_200M_27",
    "us_population_circle_500M_27",
    "us_population_circle_1B_27",
)


def compute_circles():
    excluded = set(excl)

    pc_shapefiles = {}
    pc_usa_shapefiles = {}
    pc_usa_to_intl = {}

    for population, name in named_populations.items():
        key = f"population_circle_{name}"
        intl = circle_shapefile_object(COUNTRIES, population, just_usa=False)
        if intl.hash_key not in excluded:
            pc_shapefiles[key] = intl
        else:
            excluded.remove(intl.hash_key)
        us = circle_shapefile_object(COUNTRIES, population, just_usa=True)
        if us.hash_key not in excluded:
            pc_usa_shapefiles["us_" + key] = us
        else:
            excluded.remove(us.hash_key)
        pc_usa_to_intl[us.meta["type"]] = intl.meta["type"]
    assert not excluded, f"Shapefiles slated for exclusion not found: {excluded}"
    return pc_shapefiles, pc_usa_shapefiles, pc_usa_to_intl


(
    population_circles_shapefiles,
    population_circles_usa_shapefiles,
    population_circles_usa_to_international,
) = compute_circles()


def check_loadable():
    excluded_new = list(excl)
    for v in [
        *population_circles_shapefiles.values(),
        *population_circles_usa_shapefiles.values(),
    ]:
        try:
            v.load_file()
        except EmptyShapefileError:
            excluded_new.append(v.hash_key)
    print("Excluded set:")
    print(f"excl = {tuple(excluded_new)}")
