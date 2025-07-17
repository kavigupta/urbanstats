from functools import lru_cache
import json
import subprocess

from permacache import permacache, stable_hash

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


@permacache(
    "urbanstats/geometry/insets/compute_map_partition_2",
    key_function=dict(bounding_boxes=stable_hash),
    multiprocess_safe=True,
)
def compute_map_partition(frac, bounding_boxes):
    results = (
        subprocess.check_output(
            ["npm", "run", "map-partition", str(frac), json.dumps(bounding_boxes)], cwd="react"
        )
        .decode("utf-8")
        .split("\n")
    )
    assert not results[-1]
    return json.loads(results[-2])


shapefiles_by_type = {sh.meta["type"]: sh for sh in shapefiles.values()}


@permacache(
    "urbanstats/geometry/insets/load_geo",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def load_geo(name, shapefile):
    """
    Load a shapefile by name.
    """
    return shapefile.load_file().set_index("longname").loc[name].geometry


def bounding_boxes_of_components(geo):
    """
    Compute the bounding boxes of the components of a map partition.
    """
    if geo.geom_type == "MultiPolygon":
        return [g.bounds for g in geo.geoms]
    elif geo.geom_type == "Polygon":
        return [geo.bounds]
    else:
        raise ValueError(f"Unsupported geometry type: {geo.geom_type}")


def remove_subsets(boundses):
    """
    Remove bounding boxes that are subsets of others.
    """
    boundses = sorted(boundses, key=lambda b: (b[0], b[1], b[2], b[3]))
    filtered = []
    for bounds in boundses:
        if not any(
            (
                coord_less(b[0], bounds[0])
                and coord_less(b[1], bounds[1])
                and coord_less(bounds[2], b[2])
                and coord_less(bounds[3], b[3])
            )
            for b in filtered
        ):
            filtered.append(bounds)
    return filtered

def coord_less(a, b):
    """
    Check if coordinate a is less than coordinate b.
    """
    delta = b - a
    delta %= 360
    return delta < 180 # if delta is less than 180, a is less than b in the coordinate system

def compute_unified_bounding_boxes(frac, geo):
    boundses = bounding_boxes_of_components(geo)
    boundses = remove_subsets(boundses)
    indices = compute_map_partition(frac, [[(w, s), (e, n)] for (w, s, e, n) in boundses])
    unified_bounds = []
    for index_set in indices:
        if not index_set:
            continue
        bounds = [boundses[i] for i in index_set]
        unified_bounds.append(
            (
                min(b[0] for b in bounds),
                min(b[1] for b in bounds),
                max(b[2] for b in bounds),
                max(b[3] for b in bounds),
            )
        )
    return unified_bounds


def output_bounding_boxes_as_shapefile(bounding_boxes, path):
    """
    Output the bounding boxes as a GeoJSON file.
    """
    import geopandas as gpd
    from shapely.geometry import box

    geometries = [box(*bbox) for bbox in bounding_boxes]
    gdf = gpd.GeoDataFrame(geometry=geometries)
    gdf.to_file(path, driver="GeoJSON")
