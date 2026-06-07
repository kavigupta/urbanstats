from collections import Counter, defaultdict
from colorsys import hsv_to_rgb
from dataclasses import dataclass
from typing import List

import geopandas as gpd
import numpy as np
import shapely
import shapely.affinity
import shapely.geometry
import tqdm.auto as tqdm
from permacache import drop_if_equal, permacache, stable_hash
from PIL import Image

from urbanstats.data.gpw import load_full_ghs_30_arcsec
from urbanstats.data.population_overlays import (
    direct_population_overlay,
    relevant_regions,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.geometry.shapefiles.shapefiles.urban_centers import URBAN_CENTERS
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.contained_within import (
    PROVINCE_PROVIDER,
    STATE_PROVIDER,
    ContainedWithinUniverseProvider,
)
from urbanstats.utils import to_cardinal_direction


class MapDataset:
    def __init__(self, map_arr, ban):
        self.map_arr = map_arr
        self.ban = ban
        by_row = map_arr.sum(1)
        self.by_row_cumul = np.cumsum(by_row)
        self.secants = compute_secants(map_arr, np.arange(map_arr.shape[0]))
        self.x = np.arange(map_arr.shape[1])
        self.cumul_map = np.cumsum(map_arr, axis=1)
        self.cumul_ban = np.cumsum(ban, axis=1) if ban is not None else None

    def find_circle(self, r, P):
        """
        Find the first circle of radius r with population at least P. First means the lowest y coordinate,
            ties are broken by the higher population or lower x coordinate.
        """
        rover = int(np.ceil(r))
        [valid_y] = np.where(
            self.by_row_cumul[rover:] - self.by_row_cumul[:-rover] >= P
        )
        valid_y += rover
        for y in tqdm.tqdm(valid_y):
            pop = np.zeros(self.map_arr.shape[1])
            for yprime in range(int(np.ceil(y - r)), int(y + r + 1)):
                if yprime < 0 or yprime >= self.map_arr.shape[0]:
                    continue
                rxprime = (r**2 - (yprime - y) ** 2) ** 0.5 * self.secants[y]
                left_bins = np.maximum(self.x - rxprime - 1, 0).astype(np.int32)
                right_bins = np.minimum(self.x + rxprime, self.x.shape[0] - 1).astype(
                    np.int32
                )
                pop_each = (
                    self.cumul_map[yprime, right_bins]
                    - self.cumul_map[yprime, left_bins]
                )
                pop += pop_each
                if self.cumul_ban is not None:
                    ban_each = (
                        self.cumul_ban[yprime, right_bins]
                        - self.cumul_ban[yprime, left_bins]
                    )
                    pop[ban_each > 0] = -np.inf
            if pop.max() > P:
                return (y, pop.argmax())
        return None

    def binary_search(self, P, low, high=None, *, eps=0.25):
        value = (low + high) / 2 if high else low * 2
        if value > self.map_arr.shape[0]:
            return value, None
        print("value", value, "low", low, "high", high)
        coord = self.find_circle(value, P)
        print("found", coord)
        if high and high - low <= eps:
            return value, coord
        if coord is None:
            return self.binary_search(P, value, high, eps=eps)
        value, coord_2 = self.binary_search(P, low, value, eps=eps)
        if coord_2 is not None:
            return value, coord_2
        return value, coord


def compute_secants(map_arr, coord):
    return 1 / np.cos(coord / map_arr.shape[0] * np.pi - np.pi / 2)


@permacache(
    "urbanstats/data/circle/binary_search_map_6",
    key_function=dict(
        map_arr=stable_hash,
        ban=stable_hash,
        start_radius=drop_if_equal(1),
        high=drop_if_equal(None),
    ),
    multiprocess_safe=True,
)
def binary_search_map(map_arr, ban, P, start_radius=1, high=None):
    dset = MapDataset(map_arr, ban)
    return dset.binary_search(P, start_radius, high=high, eps=0.25)


@permacache(
    "urbanstats/data/circle/overlapping_circles_fast",
    key_function=dict(map=stable_hash),
    multiprocess_safe=True,
)
# This is necessary to avoid breaking the cache
# pylint: disable=redefined-builtin
def overlapping_circles_fast(map, P, *, limit=100, max_radius_in_chunks=10):
    circles = []
    map = np.array(map)
    adjustment = 1
    radius = 2
    while True:
        print("Current size", map.shape, "current radius", radius)
        radius, center = binary_search_map(
            map,
            ban=None,
            P=P,
            start_radius=radius * 0.95,
            high=max_radius_in_chunks * 2,
        )
        if center is not None:
            y, x = center
            circles.append((radius * adjustment, (y * adjustment, x * adjustment)))
            clear_location(map, radius, y, x)
            print("Found circle", circles[-1])
        while radius > max_radius_in_chunks:
            radius = radius / 2
            map = chunk(map, 2)
            adjustment *= 2
            print(
                "Chunked map_arr, new size",
                map.shape,
                "new radius",
                radius,
                "adjustment",
                adjustment,
            )
        if map.shape[0] <= 2:
            break
        if len(circles) > limit:
            break
    return circles


def make_circle_map(map_shape, circles):
    zeros_map = np.zeros(map_shape, dtype=np.int32)
    circle_map = np.zeros(map_shape, dtype=np.int32)
    for i, (r, (y, x)) in enumerate(circles):
        ys, xs = clear_location(zeros_map, r, y, x)
        untouched = circle_map[ys, xs] == 0
        ys, xs = ys[untouched], xs[untouched]
        circle_map[ys, xs] = i + 1
    return circle_map


def clear_location(map_arr, r, y, x):
    ry = r
    secy = compute_secants(map_arr, y)
    rx = r * secy
    tl_x = max(0, int(x - rx))
    tl_y = max(0, int(y - ry))
    br_x = min(map_arr.shape[1], int(x + rx + 1))
    br_y = min(map_arr.shape[0], int(y + ry + 1))
    # no idea why this is necessary
    # pylint: disable=unpacking-non-sequence
    xs, ys = np.meshgrid(
        np.arange(tl_x, br_x),
        np.arange(tl_y, br_y),
    )
    mask = (xs - x) ** 2 / secy**2 + (ys - y) ** 2 < r**2
    map_arr[ys[mask], xs[mask]] = 0
    return ys[mask], xs[mask]


def reduce_circles(circles, reduce):
    return [(r / reduce, (y // reduce, x // reduce)) for r, (y, x) in circles]


def get_rgb_circles(circles, circle_map):
    circle_rgb = np.zeros(circle_map.shape + (4,), dtype=np.uint8)
    hues = np.linspace(0, 1, len(circles))
    sats = np.random.rand(len(circles)) * 0.5 + 0.5
    vals = np.random.rand(len(circles)) * 0.5 + 0.5
    rgb = np.array(
        [hsv_to_rgb(hue, sat, val) for hue, sat, val in zip(hues, sats, vals)]
    )
    rgb = (rgb * 255).astype(np.uint8)
    for i, _ in enumerate(tqdm.tqdm(circles, desc="Stamping circles")):
        circle_rgb[circle_map == i + 1] = (*rgb[i], 100)
    return circle_rgb


def create_rgb_image(ghs, circles, reduce):
    shape = ghs.shape
    ghs_reduced = chunk(ghs, reduce)
    shape = (shape[0] // reduce, shape[1] // reduce)
    circle_map = make_circle_map(shape, reduce_circles(circles, reduce))
    rgb = get_rgb_circles(circles, circle_map)
    maximum = np.percentile(ghs_reduced, 99.9)
    ghs_reduced = np.clip(ghs_reduced / maximum * 255, 0, 255)
    no_circle_mask = rgb[:, :, -1] == 0
    ghs_no_circles = ghs_reduced[no_circle_mask]
    rgb[no_circle_mask] = ghs_no_circles[:, None]
    ghs_circles = ghs_reduced[~no_circle_mask]
    rgb[~no_circle_mask] = (
        rgb[~no_circle_mask] * 0.5 + ghs_circles[:, None] * 0.5
    ).astype(np.uint8)
    rgb[:, :, -1] = 255

    return Image.fromarray(rgb)


def chunk(population_map, chunk_size):
    population_map_padded = np.pad(
        population_map,
        (
            (0, (-population_map.shape[0]) % chunk_size),
            (0, (-population_map.shape[1]) % chunk_size),
        ),
        mode="constant",
        constant_values=0,
    )
    population_map_padded = population_map_padded.reshape(
        population_map_padded.shape[0] // chunk_size,
        chunk_size,
        population_map_padded.shape[1] // chunk_size,
        chunk_size,
    ).sum((1, 3))

    return population_map_padded


def to_shapely_ellipse(map_shape, r_pixels, y_pixels, x_pixels):
    r = r_pixels / map_shape[1] * 360
    x = x_pixels / map_shape[1] * 360 - 180
    y = 90 - y_pixels / map_shape[0] * 180
    secy = 1 / np.cos(np.deg2rad(y))
    return shapely.affinity.scale(
        shapely.geometry.Point(x, y).buffer(1),
        r * secy,
        r,
    )


def to_basic_geopandas_frame(map_shape, circles):
    ellipses = []
    for r, (y, x) in tqdm.tqdm(circles):
        current = to_shapely_ellipse(map_shape, r, y, x)
        for other in ellipses:
            if current.intersects(other):
                current = current.difference(other)
        current = current.buffer(0.001)
        ellipses.append(current)
    return gpd.GeoDataFrame(
        dict(id=np.arange(len(circles))), geometry=ellipses, crs="EPSG:4326"
    )


manual_circle_names = [
    (
        (
            46.32272728379403,
            -18.665482799483833,
            49.94393938287262,
            -15.201183867182841,
        ),
        0.1,
        "Toamasina Urban Center",
    ),
    (
        (
            43.76378415709698,
            -25.395706770492726,
            47.96954917623637,
            -21.537626562840618,
        ),
        0.1,
        "Tolagnaro Urban Center",
    ),
]


def attach_urban_centers_to_frame(frame):
    urban_center_shapefile = URBAN_CENTERS.load_file()
    urban_center_shapefile.index = urban_center_shapefile.longname
    overlays = direct_population_overlay(frame, urban_center_shapefile)

    circle_id_to_overlays = defaultdict(list)
    for circle_id, index in zip(overlays.id, overlays.index):
        circle_id_to_overlays[circle_id].append(index)
    by_circle_id, bad = compute_names_for_each_circle(
        frame, overlays, circle_id_to_overlays
    )

    assert not bad, bad

    frame["name"] = by_circle_id

    long_to_short = dict(
        zip(urban_center_shapefile.longname, urban_center_shapefile.shortname)
    )
    for _, _, manual_name in manual_circle_names:
        long_to_short[manual_name] = manual_name
    return frame, long_to_short


def compute_names_for_each_circle(frame, overlays, circle_id_to_overlays):
    used = set()
    by_circle_id = []
    bad = []
    for circle_id in tqdm.trange(len(frame)):
        #     overlays_for_id = overlays_by_id.loc[[0]]
        overlay_idxs = circle_id_to_overlays[circle_id]
        overlay_pops = overlays.population.iloc[overlay_idxs] * overlays.longname.iloc[
            overlay_idxs
        ].apply(lambda x: 1 if x in used else 2)
        overlay_order = overlay_pops.argsort()
        overlay_idxs = np.array(overlay_idxs)[overlay_order][::-1]
        if len(overlay_idxs) == 0:
            for bounds, tolerance, manual_name in manual_circle_names:
                if np.all(
                    np.abs(frame.geometry.iloc[circle_id].bounds - np.array(bounds))
                    < tolerance
                ):
                    name = manual_name
                    break
            else:
                bad.append(circle_id)
                continue
        else:
            name = overlays.longname.iloc[overlay_idxs[0]]
        used.add(name)
        by_circle_id.append(name)
    return by_circle_id, bad


def specify_duplicates(frame, long_to_short):
    duplicates = {x: y for x, y in Counter(frame.name).items() if y > 1}
    suffixes = {}
    for k in duplicates:
        rows = frame[frame.name == k]
        structure = compute_structure(rows)
        if structure is None:
            print(k)
            continue
        suffixes.update(dict(zip(rows.id, compute_names(structure, rows))))
    frame["shortname"] = frame.apply(
        lambda row: long_to_short[row["name"]].replace(" Urban Center", "")
        + (" (" + suffixes[row.id] + ")" if row.id in suffixes else ""),
        axis=1,
    )


@permacache(
    "urbanstats/data/circle/overlapping_circles_frame_8",
    key_function=dict(country_shapefile=lambda x: x.hash_key),
)
def overlapping_circles_frame(
    country_shapefile, population, suffix, max_radius_in_chunks=20
):
    print(f"population circles being computed for {suffix}")
    ghs = load_full_ghs_30_arcsec()
    circles = overlapping_circles_fast(
        ghs, population, limit=10**9, max_radius_in_chunks=max_radius_in_chunks
    )
    frame = to_basic_geopandas_frame(ghs.shape, circles)
    frame, long_to_short = attach_urban_centers_to_frame(frame)
    specify_duplicates(frame, long_to_short)
    countries = relevant_regions(country_shapefile, frame, 3, 0.9)
    frame["suffix"] = frame.id.apply(lambda x: "-".join(countries[x]))
    frame["shortname"] = frame.shortname + " " + suffix
    frame["longname"] = frame["shortname"] + ", " + frame.suffix
    frame.geometry = frame.geometry.intersection(
        shapely.geometry.box(-180, -89, 180, 89)
    )
    assert len(frame) == len(set(frame.longname))
    print(f"done with {suffix}")
    return frame


@dataclass
class constant:
    const_val: str

    def apply_to(self, *_):
        return self.const_val


@dataclass
class relative:
    to: List[int]
    prefix: str = ""

    def apply_to(self, current_idx, rows, resolution):
        """
        Compute the angle of the current_idx relative to the mean centre of the rows in the frame
        """
        mean_center = np.mean(
            [center_point_of_bbox(rows.iloc[idx].geometry) for idx in self.to], axis=0
        )
        current_center = center_point_of_bbox(rows.iloc[current_idx].geometry)
        delta = current_center - mean_center
        angle = np.arctan2(delta[1], delta[0])
        angle_revolutions = angle / (2 * np.pi)
        angle_revolutions = np.round(angle_revolutions * resolution) / resolution
        angle_revolutions = angle_revolutions % 1
        direct = to_cardinal_direction(angle_revolutions)
        if self.prefix:
            return f"{self.prefix} {direct}"
        return direct


def naive_directions_for_rows(rows):
    """
    Get the cardinal direction of each row, relative to the mean center of all rows.
    """
    resolution = 4
    while True:
        names = [
            relative(range(len(rows)), "").apply_to(i, rows, resolution)
            for i in range(len(rows))
        ]
        if len(set(names)) == len(names):
            return names
        resolution *= 2


def naive_directions_for_rows_with_names(rows, names):
    """
    Like naive_directions_for_rows, but each row already has a name.

    If the name is unique, it is kept. Otherwise, the direction is added
        If all the names are the same, we only keep the direction.
    """
    name_to_idx = defaultdict(list)
    for i, name in enumerate(names):
        name_to_idx[name].append(i)
    if len(name_to_idx) == 1:
        return naive_directions_for_rows(rows)
    names_out = names[:]
    for name, idxs in name_to_idx.items():
        if len(idxs) == 1:
            continue
        for idx, direction in zip(idxs, naive_directions_for_rows(rows.iloc[idxs])):
            names_out[idx] = f"{name} {direction}"
    return names_out


def compute_structure(rows):
    """
    Returns a map_arr from iloc to a relative object representing
        how that iloc should be named.

    The idea is that we categorize the rows into size tiers,
        where each tier is created when a circle is 2x as big
        as the smallest circle in the previous tier. Size
        is computed as the square root of the area of the bounding box.

        Also, a new tier is created if any given circle's bounding box
        contains all the circles in the previous tier.
    """
    bounding_box_sqrtareas = (
        np.array(
            [
                (row.geometry.bounds[2] - row.geometry.bounds[0])
                * (row.geometry.bounds[3] - row.geometry.bounds[1])
                for _, row in rows.iterrows()
            ]
        )
        ** 0.5
    )
    nesting_structure = tuple(get_nesting_structure(rows))
    tiers = []
    for i, sqrtarea in enumerate(bounding_box_sqrtareas):
        if (
            i == 0
            or sqrtarea > 2 * min(bounding_box_sqrtareas[tiers[-1]])
            or all((j, i) in nesting_structure for j in tiers[-1])
        ):
            tiers.append([])
        tiers[-1].append(i)
    if len(tiers) == 1:
        return {i: relative(range(len(rows))) for i in range(len(rows))}
    tier_labels = [
        "Center",
        "Outer",
        "Periphery",
        "Further Periphery",
        "Even Further Periphery",
    ]
    result = {}
    all_prev = []
    for i, tier in enumerate(tiers):
        all_prev.extend(tier)
        result.update(
            {
                j: (
                    relative(list(all_prev), tier_labels[i])
                    if len(tier) > 1
                    else constant(tier_labels[i])
                )
                for j in tier
            }
        )
    return result
    # return {i : constant(str(i)) for i in range(len(rows))}


def get_nesting_structure(geo_frame, eps=0.25):
    """
    A circle is considered ``nested'' in another if the bounding
    box of the former is contained in the latter, with some
    tolerance, a fraction of the smaller bounding box size.

    Here we return the nesting structure, that is, a set
        {(i, j) : geo_frame.iloc[i] is nested in geo_frame.iloc[j]}
    """

    geo_frame = geo_frame.reset_index(drop=True)

    nesting_structure = set()
    for i, row_i in geo_frame.iterrows():
        for j, row_j in geo_frame.iterrows():
            if i == j:
                continue
            epsx, epsy = eps * (
                row_i.geometry.bounds[2] - row_i.geometry.bounds[0]
            ), eps * (row_i.geometry.bounds[3] - row_i.geometry.bounds[1])
            if (
                row_i.geometry.bounds[0] >= row_j.geometry.bounds[0] - epsx
                and row_i.geometry.bounds[1] >= row_j.geometry.bounds[1] - epsy
                and row_i.geometry.bounds[2] <= row_j.geometry.bounds[2] + epsx
                and row_i.geometry.bounds[3] <= row_j.geometry.bounds[3] + epsy
            ):
                nesting_structure.add((i, j))
    return nesting_structure


def center_point_of_bbox(polygon):
    minx, miny, maxx, maxy = polygon.bounds
    return np.array([(minx + maxx) / 2, (miny + maxy) / 2])


def compute_names(structure, rows):
    resolution = 4
    while True:
        names = [structure[i].apply_to(i, rows, resolution) for i in range(len(rows))]
        if len(set(names)) == len(names):
            return names
        resolution *= 2


named_populations = {
    5e6: "5M",
    1e7: "10M",
    2e7: "20M",
    5e7: "50M",
    1e8: "100M",
    2e8: "200M",
    5e8: "500M",
    1e9: "1B",
}


@permacache(
    "urbanstats/data/circle/create_circle_image",
)
def create_circle_image(population):
    print("Computing circles for population", population)
    circles = overlapping_circles_fast(
        load_full_ghs_30_arcsec(), population, limit=10**9, max_radius_in_chunks=20
    )
    print("Creating image for population", population)
    out = create_rgb_image(load_full_ghs_30_arcsec(), circles, 5)
    return out


# vulture: ignore -- used in notebooks
def produce_image(population):
    name = named_populations[population]
    print("Creating image for population", name)
    out = create_circle_image(population)
    print("Saving image for population", name)
    out.save(f"outputs/population_circles/{name}.png")
    print("Done with population", name)


def circle_shapefile_object(country_shapefile, population):
    name = named_populations[population] + " Person Circle"
    version = 27
    return Shapefile(
        hash_key=f"population_circle_{named_populations[population]}_{version}",
        path=lambda: overlapping_circles_frame(
            country_shapefile, population, named_populations[population] + "PC"
        ),
        shortname_extractor=lambda x: x["shortname"],
        longname_extractor=lambda x: x["longname"],
        meta=dict(type=name, source="GHSL", type_category="Kavi"),
        filter=lambda x: True,
        does_overlap_self=False,
        special_data_sources=["international_gridded_data"],
        universe_provider=CombinedUniverseProvider(
            [
                ConstantUniverseProvider(["world"]),
                ContainedWithinUniverseProvider(["continents", "countries"]),
                STATE_PROVIDER,
                PROVINCE_PROVIDER,
            ]
        ),
        subset_masks={
            "USA": FilteringSubset(
                "US " + name, lambda x: x.longname.endswith(", USA")
            ),
            "Canada": FilteringSubset(
                "CA " + name, lambda x: x.longname.endswith(", Canada")
            ),
        },
        abbreviation=named_populations[population],
        data_credit=dict(
            text="The population circles were defined using the GHS-POP dataset,"
            " using an algorithm hand-coded for the purpose of this website",
            linkText="Detailed maps and JSON files",
            link="https://github.com/kavigupta/urbanstats/tree/main/outputs/population_circles",
        ),
        include_in_syau=False,
        wikidata_sourcer=None,
    )
