import json
import shlex
import subprocess
from functools import lru_cache

import geopandas as gpd
import numpy as np
import shapely
import tqdm
from permacache import permacache, stable_hash
from shapely.geometry import box

from urbanstats.geometry.classify_coordinate_zone import classify_coordinate_zone
from urbanstats.geometry.read_qgis_layouts import load_qgis_layouts_and_maps
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles

# Load QGIS layouts at module level
qgis_layouts = load_qgis_layouts_and_maps()


def clean_shape(geo):
    """
    Compute the tight bounding box of a geometry.
    """
    if geo.geom_type == "MultiPolygon":
        polys = [g for g in geo.geoms]
        area_each = [p.area for p in polys]
        indices_ordered = sorted(
            range(len(area_each)), key=lambda i: area_each[i], reverse=True
        )
        result = []
        area_so_far = 0
        total_area = sum(area_each)
        for i in indices_ordered:
            result.append(polys[i])
            area_so_far += area_each[i]
            if area_so_far > total_area * 0.95:
                break
        return shapely.MultiPolygon(result)

    elif geo.geom_type == "Polygon":
        return geo
    else:
        raise ValueError(f"Unsupported geometry type: {geo.geom_type}")


# @permacache(
#     "urbanstats/geometry/insets/compute_map_partition_2",
#     key_function=dict(bounding_boxes=stable_hash),
#     multiprocess_safe=True,
# )
def compute_map_partition(bounding_boxes):
    cmd = ["npm", "run", "map-partition", json.dumps(bounding_boxes)]
    print(" ".join(shlex.quote(arg) for arg in cmd))
    results = subprocess.check_output(cmd, cwd="react").decode("utf-8").split("\n")
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
    return (
        delta < 180
    )  # if delta is less than 180, a is less than b in the coordinate system


def compute_unified_bounding_boxes(boundses):
    indices = compute_map_partition([[(w, s), (e, n)] for (w, s, e, n) in boundses])
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
    gdf = gpd.GeoDataFrame(dict(name=range(len(geometries))), geometry=geometries)
    gdf.to_file(path, driver="GeoJSON")


def bounding_box_area(bbox):
    """
    Compute the area of a bounding box.
    """
    return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])


def merge_bounding_boxes(a, b):
    """
    Merge bounding boxes into a single bounding box.
    """
    return np.array(
        [
            np.minimum(a[0], b[0]),
            np.minimum(a[1], b[1]),
            np.maximum(a[2], b[2]),
            np.maximum(a[3], b[3]),
        ]
    )


def merge_cost(box_a, box_b):
    return (
        bounding_box_area(merge_bounding_boxes(box_a, box_b))
        - bounding_box_area(box_a)
        - bounding_box_area(box_b)
    ) / bounding_box_area(merge_bounding_boxes(box_a, box_b))


def do_overlap(box_a, box_b):
    """
    Check if two bounding boxes overlap.
    """
    return (
        (box_a[0] < box_b[2])
        & (box_a[2] > box_b[0])
        & (box_a[1] < box_b[3])
        & (box_a[3] > box_b[1])
    )


def best_merge(bounding_boxes):
    bounding_boxes = np.array(bounding_boxes).T
    bounding_boxes_a, bounding_boxes_b = (
        bounding_boxes[:, None, :],
        bounding_boxes[:, :, None],
    )
    overlap_mask = do_overlap(bounding_boxes_a, bounding_boxes_b)
    overlap_mask[np.diag_indices_from(overlap_mask)] = False
    if overlap_mask.any():
        return np.unravel_index(np.argmax(overlap_mask), overlap_mask.shape) + (0,)
    merged_bounding_boxes = merge_bounding_boxes(bounding_boxes_a, bounding_boxes_b)
    area_merged = bounding_box_area(merged_bounding_boxes)
    area_each = bounding_box_area(bounding_boxes)
    area_a = area_each[:, None]
    area_b = area_each[None, :]
    cost = (area_merged - area_a - area_b) / area_merged
    cost[np.diag_indices_from(cost)] = np.inf  # ignore self-merges
    result = np.unravel_index(np.argmin(cost), cost.shape)
    return result[0], result[1], cost[result[0], result[1]]


def merge_all_negative_cost(bounding_boxes, tolerance=0.1):
    """
    Merge bounding boxes until no more negative cost merges are possible.
    """
    indices_each = [[i] for i in range(len(bounding_boxes))]
    bounding_boxes = bounding_boxes[:]
    while len(bounding_boxes) > 1:
        i, j, cost = best_merge(bounding_boxes)
        if cost < tolerance:
            bounding_boxes[i] = merge_bounding_boxes(
                bounding_boxes[i], bounding_boxes[j]
            )
            indices_each[i].extend(indices_each[j])
            del bounding_boxes[j]
            del indices_each[j]
        else:
            break
    return bounding_boxes, indices_each


def subset(zone_a, zone_b):
    return set(zone_a).issubset(set(zone_b))


def place_in_zone(geo, target_zone):
    """
    Check if a geometry is placed in a specific coordinate zone.
    """
    zone, geo = classify_coordinate_zone(geo)
    if subset(zone, target_zone):
        return geo
    if min(target_zone) > min(zone):
        geo = shapely.affinity.translate(geo, xoff=+360)
        zone, geo = classify_coordinate_zone(geo)
        assert subset(zone, target_zone)
        return geo
    if max(target_zone) < max(zone):
        geo = shapely.affinity.translate(geo, xoff=-360)
        zone, geo = classify_coordinate_zone(geo)
        assert subset(zone, target_zone)
        return geo
    assert not "reachable"


def make_consistent(geometries, overall_geometry):
    zone_overall, _ = classify_coordinate_zone(overall_geometry)
    return [place_in_zone(geo, zone_overall) for geo in geometries]


def size_increase_all(bounding_boxes):
    """
    Compute the size increase of all bounding boxes.
    """
    overall = merge_all_boxes(bounding_boxes)
    original_area = sum(bounding_box_area(bbox) for bbox in bounding_boxes)
    overall_area = bounding_box_area(overall)
    return (overall_area - original_area) / original_area


def merge_all_boxes(bounding_boxes):
    overall = bounding_boxes[0]
    for bbox in bounding_boxes[1:]:
        overall = merge_bounding_boxes(overall, bbox)
    return overall


# def should_merge_into_just_one_box(bounding_boxes):
#     areas_each = [bounding_box_area(bbox) for bbox in bounding_boxes]
#     # print(areas_each)
#     if max(areas_each) / min(areas_each) < 2:
#         return True
#     # if size_increase_all(bounding_boxes) < 0.5:
#     #     return True
#     return False


def merge_largest_if_too_similar_in_size(bounding_boxes, indices_each, tolerance=2 / 3):
    """
    Merge the largest bounding box with the smallest if they are too similar in size.
    """
    if len(bounding_boxes) < 2:
        return bounding_boxes, indices_each
    areas_each = [bounding_box_area(bbox) for bbox in bounding_boxes]
    print("Areas each:", areas_each)
    largest_idx, second_largest_idx = np.argsort(areas_each)[::-1][:2]
    print("Highest areas:", areas_each[largest_idx], areas_each[second_largest_idx])
    ratio = areas_each[largest_idx] / sum(areas_each)
    print("Ratio:", ratio, "Tolerance:", tolerance)
    if ratio > tolerance:
        return bounding_boxes, indices_each
    print("starting indices", indices_each)
    merged_box = merge_bounding_boxes(
        bounding_boxes[largest_idx], bounding_boxes[second_largest_idx]
    )
    merged_indices = indices_each[largest_idx] + indices_each[second_largest_idx]
    bounding_boxes = [
        bbox
        for i, bbox in enumerate(bounding_boxes)
        if i not in (largest_idx, second_largest_idx)
    ]
    indices_each = [
        idx
        for i, idx in enumerate(indices_each)
        if i not in (largest_idx, second_largest_idx)
    ]
    bounding_boxes.append(merged_box)
    indices_each.append(merged_indices)
    print("ending indices", indices_each)
    return bounding_boxes, indices_each


def iterated_merge(bounding_boxes, indices, tolerance):
    """
    Do an iteration of merging, also merging the indices.
    """
    bounding_boxes, superindices = merge_all_negative_cost(bounding_boxes, tolerance)
    indices = [
        [idx for i in superindex for idx in indices[i]] for superindex in superindices
    ]
    return bounding_boxes, indices


def perform_merges(bounding_boxes, tolerance):
    count = len(bounding_boxes)
    merged_boxes = bounding_boxes[:]
    indices_each = [[i] for i in range(len(bounding_boxes))]
    while True:
        merged_boxes, indices_each = iterated_merge(
            merged_boxes, indices_each, tolerance
        )
        merged_boxes, indices_each = merge_largest_if_too_similar_in_size(
            merged_boxes, indices_each
        )
        if len(merged_boxes) == count:
            break
        count = len(merged_boxes)
    return merged_boxes, indices_each


def automatically_compute_insets(name_to_type, swo_subnats, u):
    geo = load_geo(u, shapefiles_by_type[name_to_type[u]])

    filt_table = (
        swo_subnats[swo_subnats.universes.apply(lambda x: u in x)]
        .set_index("longname")
        .copy()
    )
    filt_table[
        "priority"
    ] = (
        filt_table.best_population_estimate
    )  # * filt_table.geometry.map(lambda x: x.area) ** 0.5
    sorted_fracs = (filt_table.priority / filt_table.priority.sum()).sort_values()
    filt_table = filt_table.loc[np.cumsum(sorted_fracs) > 0.001]

    filt_table["geometry"] = make_consistent(filt_table.geometry, geo)
    bounds_each = [x.bounds for x in filt_table.geometry]
    merged_boxes, indices_each = merge_all_negative_cost(bounds_each, tolerance=0.25)
    population_each = [
        filt_table.best_population_estimate.iloc[i].sum() for i in indices_each
    ]
    return dict(
        bounding_boxes=merged_boxes,
        indices_each=indices_each,
        geometries=filt_table.geometry,
        table=filt_table,
        population_each=population_each,
    )


single_map = {
    "Cape Verde",
    "Comoros",
    "East Timor",
    "Kiribati",
    "State of Palestine",
    "Trinidad and Tobago",
    "Tuvalu",
    "Vanuatu",
    "Micronesia",
}


def webMercatorAspectRatio(bbox):
    """
    Calculate the aspect ratio of a bounding box in Web Mercator projection.

    Coordinates start in WGS 84 (EPSG:4326) and are converted to Web Mercator (EPSG:3857).
    """

    # Create a GeoDataFrame with the bounding box
    gdf = gpd.GeoDataFrame(
        geometry=[box(bbox[0], bbox[1], bbox[2], bbox[3])], crs="EPSG:4326"  # WGS 84
    )
    gdf = gdf.to_crs("EPSG:3857")  # Convert to Web Mercator
    # Get the bounds in Web Mercator
    web_bbox = gdf.total_bounds  # (minx, miny, maxx, maxy)
    width = web_bbox[2] - web_bbox[0]
    height = web_bbox[3] - web_bbox[1]
    return width / height


def bbox_to_inset(
    bbox, main_map=True, normalized_coords=None, *, name, aspectRatio=None
):
    """
    Convert a bounding box tuple (west, south, east, north) to an Inset dictionary.
    """
    if normalized_coords is None:
        # Default to full space for single insets
        normalized_coords = [0, 0, 1, 1]

    if aspectRatio is None:
        aspectRatio = webMercatorAspectRatio(bbox)

    inset = {
        "bottomLeft": [normalized_coords[0], normalized_coords[1]],
        "topRight": [normalized_coords[2], normalized_coords[3]],
        "coordBox": list(bbox),
        "mainMap": main_map,
        "name": name,
        "aspectRatio": aspectRatio,
    }

    return inset


def create_single_inset(bbox, *, name):
    """
    Create a single Inset from a bounding box, marked as main map.
    Single insets span the full normalized space [0,0] to [1,1].
    """
    return [
        bbox_to_inset(bbox, main_map=True, normalized_coords=[0, 0, 1, 1], name=name)
    ]


def area(coords):
    """
    Calculate the area of a rectangle defined by normalized coordinates.
    """
    return (coords[2] - coords[0]) * (coords[3] - coords[1])


def compute_insets(name_to_type, swo_subnats, u):
    clamp = lambda x: max(0, min(1, x))
    if u in qgis_layouts:
        layout_info = qgis_layouts[u]
        insets = []

        for map_info in layout_info["maps"]:
            if map_info["extent"]:
                bbox = map_info["extent"]
                # Fix coordinate mirroring - flip Y coordinates
                normalized_coords = [
                    clamp(map_info["relative_position"][0]),
                    clamp(
                        1.0
                        - (
                            map_info["relative_position"][1]
                            + map_info["relative_size"][1]
                        ),
                    ),
                    clamp(
                        map_info["relative_position"][0] + map_info["relative_size"][0],
                    ),
                    clamp(1.0 - map_info["relative_position"][1]),
                ]

                inset = bbox_to_inset(
                    bbox=bbox,
                    main_map=area(normalized_coords) > 0.99,
                    normalized_coords=normalized_coords,
                    name=map_info["map_id"],
                    aspectRatio=map_info["aspect_ratio"],
                )
                insets.append(inset)

        insets.sort(key=lambda x: x["mainMap"], reverse=True)

        return insets

    result = automatically_compute_insets(name_to_type, swo_subnats, u)

    if len(result["bounding_boxes"]) == 1:
        return create_single_inset(result["bounding_boxes"][0], name=u)

    if u in single_map:
        merged_bbox = merge_all_boxes(result["bounding_boxes"])
        return create_single_inset(merged_bbox, name=u)

    print(u)

    print(f"Multiple bounding boxes case not implemented for {u}")
    return None
