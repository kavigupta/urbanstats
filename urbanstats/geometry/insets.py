import numpy as np
import shapely
import tqdm
from permacache import permacache

from urbanstats.geometry.classify_coordinate_zone import classify_coordinate_zone
from urbanstats.geometry.read_qgis_layouts import load_qgis_layouts_and_maps
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.universe.universe_list import all_universes
from urbanstats.utils import output_typescript

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
    "Solomon Islands",
    "Tonga",
}

manual_bounds = {"world": (-168.36, -57, -168.36 + 360, 72)}


def clean_shape(geo):
    """
    Compute the tight bounding box of a geometry.
    """
    if geo.geom_type == "Polygon":
        return geo
    if geo.geom_type != "MultiPolygon":
        raise ValueError(f"Unsupported geometry type: {geo.geom_type}")
    polys = list(geo.geoms)
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
        # unravel here will return 2 values
        # pylint: disable=unbalanced-tuple-unpacking
        i, j = np.unravel_index(np.argmax(overlap_mask), overlap_mask.shape)
        return i, j, 0
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
    raise RuntimeError("not reachable")


def make_consistent(geometries, overall_geometry):
    zone_overall, _ = classify_coordinate_zone(overall_geometry)
    return [place_in_zone(geo, zone_overall) for geo in geometries]


def merge_all_boxes(bounding_boxes):
    overall = bounding_boxes[0]
    for bbox in bounding_boxes[1:]:
        overall = merge_bounding_boxes(overall, bbox)
    return overall


def iterated_merge(bounding_boxes, indices, tolerance):
    """
    Do an iteration of merging, also merging the indices.
    """
    bounding_boxes, superindices = merge_all_negative_cost(bounding_boxes, tolerance)
    indices = [
        [idx for i in superindex for idx in indices[i]] for superindex in superindices
    ]
    return bounding_boxes, indices


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


def bbox_to_inset(bbox, main_map=True, normalized_coords=None, *, name):
    """
    Convert a bounding box tuple (west, south, east, north) to an Inset dictionary.
    """
    if normalized_coords is None:
        # Default to full space for single insets
        normalized_coords = [0, 0, 1, 1]

    inset = {
        "bottomLeft": [normalized_coords[0], normalized_coords[1]],
        "topRight": [normalized_coords[2], normalized_coords[3]],
        "coordBox": list(bbox),
        "mainMap": main_map,
        "name": name,
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


clamp = lambda x: max(0, min(1, x))


def compute_normalized_coords(map_info):
    normalized_coords = [
        clamp(map_info["relative_position"][0]),
        clamp(
            1.0 - (map_info["relative_position"][1] + map_info["relative_size"][1]),
        ),
        clamp(
            map_info["relative_position"][0] + map_info["relative_size"][0],
        ),
        clamp(1.0 - map_info["relative_position"][1]),
    ]

    return normalized_coords


def compute_insets(name_to_type, swo_subnats, u):
    if u in manual_bounds:
        return create_single_inset(manual_bounds[u], name=u)
    qgis_layouts = load_qgis_layouts_and_maps()
    if u in qgis_layouts:
        layout_info = qgis_layouts[u]
        insets = []

        for map_info in layout_info["maps"]:
            if map_info["extent"]:
                bbox = map_info["extent"]
                # Fix coordinate mirroring - flip Y coordinates
                normalized_coords = compute_normalized_coords(map_info)

                inset = bbox_to_inset(
                    bbox=bbox,
                    main_map=area(normalized_coords) > 0.99,
                    normalized_coords=normalized_coords,
                    name=map_info["map_id"],
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

    raise RuntimeError(f"Multiple bounding boxes case not implemented for {u}")


def compute_all_insets(swo):
    name_to_type = dict(zip(swo.longname, swo.type))
    subnats = (
        shapefiles["subnational_regions"].load_file().set_index("longname").geometry
    )
    swo_subnats = swo[swo.type == "Subnational Region"].copy()
    swo_subnats["geometry"] = list(subnats.loc[swo_subnats.longname])
    swo_subnats["geometry"] = swo_subnats.geometry.map(clean_shape)
    result = {}
    for u in tqdm.tqdm(all_universes()):
        result[u] = compute_insets(name_to_type, swo_subnats, u)

    with open("react/src/data/insets.ts", "w") as f:
        output_typescript(result, f)
