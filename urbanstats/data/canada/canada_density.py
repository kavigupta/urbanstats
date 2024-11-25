from functools import lru_cache
import numpy as np
from urbanstats.data.canada.canada_blocks import load_canada_db_shapefile
from urbanstats.data.census_blocks import RADII
from urbanstats.geometry.ellipse import compute_density_for_radius


@lru_cache(None)
def canada_shapefile_with_densities(year):
    data_db = load_canada_db_shapefile(year)
    data_db = data_db.copy()
    coords = np.array([data_db.geometry.y, data_db.geometry.x]).T
    for r in RADII:
        data_db[f"canada_density_{year}_{r}"] = compute_density_for_radius(
            r, data_db.population, coords
        )
    return data_db
