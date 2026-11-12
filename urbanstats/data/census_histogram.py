import geopandas as gpd
import numpy as np
import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.data.australia.mesh_blocks import australia_mesh_blocks_with_densities
from urbanstats.data.canada.canada_density import canada_shapefile_with_densities
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.data.gpw import produce_histogram


@permacache("urbanstats/data/census_histogram_2")
def census_histogram(geometry, year):
    table = all_densities_gpd(year)
    density_keys = [x for x in table if x.startswith("ad_")]
    return generic_histogram(geometry, table, density_keys)


@permacache("urbanstats/data/census_histogram_canada_3")
def census_histogram_canada(geometry, year):
    table = canada_shapefile_with_densities(year)
    density_keys = [x for x in table if x.startswith("canada_density")]
    return generic_histogram(geometry, table, density_keys)


@permacache("urbanstats/data/census_histogram/census_histogram_australia_2")
def census_histogram_australia(geometry):
    table = australia_mesh_blocks_with_densities()
    density_keys = [x for x in table if x.startswith("australia_density")]
    return generic_histogram(geometry, table, density_keys)


def generic_histogram(geometry, table, density_keys):
    """Each region's histogram for each density key, in row order; None for a region with no blocks."""
    s = geometry.load_rows().reset_index(drop=True)[["geometry"]]
    j = gpd.sjoin(
        s,
        gpd.GeoDataFrame(table[density_keys + ["population", "geometry"]]).to_crs(
            "epsg:4326"
        ),
    )
    rows_by_position = dict(list(j.groupby(level=0, sort=False)))
    result = []
    for position in tqdm.trange(len(s), desc=geometry.key):
        if position not in rows_by_position:
            result.append(None)
            continue
        rows = rows_by_position[position]
        popu = rows["population"]
        result.append(
            {
                k: produce_histogram(np.array(rows[k] / popu), np.array(popu))
                for k in density_keys
            }
        )
    return result
