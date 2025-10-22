import geopandas as gpd
import numpy as np
import shapely
import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.data.census_blocks import load_raw_census

from .all_counties import get_all_counties


@permacache("urbanstats/geometry/historical_counties/compute_suos/current_suos_7")
def current_suos():
    data = get_all_counties()
    return compute_suos(data)


def coordinates_blocks(extra_geographies):
    _, population, *_, coordinates = load_raw_census()
    population = population[:, 0]
    pt = extra_geographies.representative_point()
    coordinates = np.concatenate([coordinates, np.array([pt.y, pt.x]).T])
    population = np.concatenate([population, np.zeros(len(pt), dtype=int)])
    blocks = gpd.GeoDataFrame(
        dict(
            geometry=gpd.points_from_xy(coordinates[:, 1], coordinates[:, 0]),
            population=population,
        ),
        crs="epsg:4326",
    )
    return coordinates, blocks


def join_blocks_to_data(blocks, data):
    joined = gpd.sjoin(data[["geometry"]], blocks)
    missing = set(data.index) - set(joined.index)
    assert not missing, missing
    idx_data = np.array(joined.index)
    idx_blocks = np.array(joined.index_right)
    return idx_data, idx_blocks


def compute_suos(data):
    coordinates, blocks, set_per_block = aggregate_blocks(data)
    suo_idx_to_subset = sorted(set(set_per_block))
    representative_point, populations = compute_suo_representative(
        coordinates, set_per_block, suo_idx_to_subset, blocks.population
    )
    suos_per_datum = [[] for _ in range(len(data))]
    for i, suo in enumerate(suo_idx_to_subset):
        for county in suo:
            suos_per_datum[county].append(i)

    return (
        suos_per_datum,
        np.array(representative_point),
        populations,
        suo_idx_to_subset,
    )


def aggregate_blocks(data):
    coordinates, blocks = coordinates_blocks(data)
    idx_data, idx_blocks = join_blocks_to_data(blocks, data)
    set_per_block = [[] for _ in tqdm.trange(len(blocks))]
    for idxd, idxb in zip(idx_data, tqdm.tqdm(idx_blocks)):
        set_per_block[idxb].append(idxd)
    set_per_block = [tuple(sorted(x)) for x in tqdm.tqdm(set_per_block)]
    mask = np.array([len(x) > 0 for x in set_per_block])
    coordinates = coordinates[mask]
    blocks = blocks[mask].reset_index(drop=True)
    set_per_block = [x for i, x in enumerate(set_per_block) if mask[i]]
    return coordinates, blocks, set_per_block


def compute_suo_representative(
    coordinates, set_per_block, suo_idx_to_subset, population
):
    subset_to_suo_idx = {k: i for i, k in enumerate(suo_idx_to_subset)}
    coordinates_each = [[] for _ in suo_idx_to_subset]
    populations_each = np.zeros(len(suo_idx_to_subset), dtype=int)
    for i, subset in enumerate(tqdm.tqdm(set_per_block)):
        coordinates_each[subset_to_suo_idx[subset]].append(i)
        populations_each[subset_to_suo_idx[subset]] += population[i]
    representative_point_each = []
    for ce in coordinates_each:
        ce = np.array(ce)
        c = coordinates[ce]
        c = c[np.abs(c - c.mean(0)).sum(1).argmin()]
        representative_point_each.append(c)
    return np.array(representative_point_each), populations_each


def compute_intersection(geometries, precomputed, elements):
    if elements in precomputed:
        return precomputed[elements]
    precomputed[elements] = compute_intersection_direct(
        geometries, precomputed, elements
    )
    return precomputed[elements]


def compute_intersection_direct(geometries, precomputed, elements):
    assert len(elements) > 0, "Elements list is empty"
    if len(elements) == 1:
        return geometries[elements[0]]
    relevant_subsets = [x for x in precomputed if all(y in elements for y in x)]
    subset = elements[:-1] if not relevant_subsets else max(relevant_subsets, key=len)
    remaining = tuple(x for x in elements if x not in subset)
    return shapely.intersection(
        compute_intersection(geometries, precomputed, subset),
        compute_intersection(geometries, precomputed, remaining),
    )


@permacache(
    "urbanstats/geometry/historical_counties/compute_suos/compute_suo_geometry_6"
)
def compute_suo_geometry():
    data = get_all_counties().copy()
    _, _, _, suos = current_suos()
    fixed_geo = data.geometry.buffer(0)
    by_subset = {}
    geometry_per_suo = [
        compute_intersection(fixed_geo, by_subset, tuple(suo))
        for suo in tqdm.tqdm(suos)
    ]
    geometry_per_suo = [clean_up_geometry(g) for g in geometry_per_suo]
    return geometry_per_suo


def clean_up_geometry(geom):
    if isinstance(geom, (shapely.geometry.MultiPolygon, shapely.geometry.Polygon)):
        return geom
    if isinstance(geom, shapely.geometry.GeometryCollection):
        polygons = []
        for g in geom.geoms:
            if isinstance(g, shapely.geometry.Polygon):
                polygons.append(g)
            elif isinstance(g, shapely.geometry.MultiPolygon):
                polygons.extend(list(g.geoms))
            else:
                assert isinstance(
                    g, (shapely.geometry.LineString, shapely.geometry.Point)
                ), type(g)
        assert polygons, "no polygons found"
        return shapely.geometry.MultiPolygon(polygons)
    raise ValueError(f"unexpected geometry type {type(geom)}")


if __name__ == "__main__":
    from sys import argv

    compute_suo_geometry().to_file(argv[1])
