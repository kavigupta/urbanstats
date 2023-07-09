import re
from collections import defaultdict
import pandas as pd
from permacache import permacache
import geopandas as gpd
import tqdm

from shapefiles import shapefiles


def overlays(a, b, a_size, b_size):
    """
    Get the overlays between the two shapefiles a and b
    """
    if a_size is None and b_size is None:
        return overlay(a, b)

    total_frac = 1
    if a_size is not None:
        total_frac *= a_size / a.shape[0]
    if b_size is not None:
        total_frac *= b_size / b.shape[0]
    size = max(5, int(total_frac * a.shape[0]))
    results = []
    for i in tqdm.trange(0, a.shape[0], size):
        x, y = a.iloc[i : i + size], b
        for_chunk = overlay(x, y)
        results.append(for_chunk)
    return pd.concat(results).reset_index(drop=True)


def overlay(x, y):
    for_chunk = gpd.overlay(x, y, how="intersection", keep_geom_type=False)
    for_chunk["area"] = for_chunk.geometry.to_crs("EPSG:2163").area
    del for_chunk["geometry"]
    return for_chunk


@permacache(
    "population_density/relationship/create_relationships_7",
    key_function=dict(x=lambda x: x.hash_key, y=lambda y: y.hash_key),
)
def create_relationships(x, y):
    """
    Get the relationships between the two shapefiles x and y
    """
    a = x.load_file()
    b = y.load_file()
    over = overlays(a, b, x.chunk_size, y.chunk_size)
    a_area = dict(zip(a.longname, a.geometry.to_crs("EPSG:2163").area))
    b_area = dict(zip(b.longname, b.geometry.to_crs("EPSG:2163").area))
    over_area = over["area"]

    a_contains_b = set()
    b_contains_a = set()
    intersects = set()
    borders = set()
    for i in range(over.shape[0]):
        row = over.iloc[i]
        area_1 = a_area[row.longname_1]
        area_2 = b_area[row.longname_2]
        area_over = over_area[i]
        # print(row.longname_1, row.longname_2, area_over / area_1, area_over / area_2)
        contains = False
        tolerance = 0.05
        if area_over >= area_2 * (1 - tolerance):
            contains = True
            a_contains_b.add((row.longname_1, row.longname_2))
        if area_over >= area_1 * (1 - tolerance):
            contains = True
            b_contains_a.add((row.longname_1, row.longname_2))
        if contains:
            pass
        elif area_over >= min(area_1, area_2) * tolerance:
            intersects.add((row.longname_1, row.longname_2))
        else:
            borders.add((row.longname_1, row.longname_2))

    a_contains_b = sorted(a_contains_b)
    b_contains_a = sorted(b_contains_a)
    intersects = sorted(intersects)
    borders = sorted(borders)

    return a_contains_b, b_contains_a, intersects, borders


@permacache(
    "population_density/relationship/create_relationships_historical_cd_3",
    key_function=dict(x=lambda x: x.hash_key, y=lambda y: y.hash_key),
)
def create_relationships_historical_cd(x, y):
    a = x.load_file()
    b = y.load_file()
    related = gpd.sjoin(a, b)
    intersects = set()
    borders = set()
    for i in tqdm.trange(len(related)):
        row = related.iloc[i]
        left_cong = re.match(".*\[(.*)\]", row.shortname_left).group(1)
        right_cong = re.match(".*\[(.*)\]", row.shortname_right).group(1)
        if left_cong == right_cong:
            borders.add((row.longname_left, row.longname_right))
        else:
            intersects.add((row.longname_left, row.longname_right))
    return set(), set(), intersects, borders


def add(d, edges):
    for x, y in edges:
        d[x].add(y)


tiers = [
    ["states", "native_areas", "native_statistical_areas"],
    [
        "csas",
        "msas",
        "counties",
        "historical_congressional",
        "state_house",
        "state_senate",
        "congress",
        "native_subdivisions",
    ],
    ["cousub", "cities", "school_districts"],
    ["neighborhoods", "zctas"],
]

key_to_type = {x: shapefiles[x].meta["type"] for x in shapefiles}

map_relationships = [
    ("states", "counties"),
    ("native_areas", "native_subdivisions"),
    ("native_statistical_areas", "native_subdivisions"),
    ("csas", "msas"),
    ("msas", "counties"),
    ("counties", "cities"),
    ("cousub", "cities"),
    ("cities", "neighborhoods"),
    ("school_districts", "neighborhoods"),
    ("zctas", "neighborhoods"),
]
map_relationships += [[x, x] for x in shapefiles]

map_relationships_by_type = [[key_to_type[x] for x in y] for y in map_relationships]

tier_idx = {x: -i for i, tier in enumerate(tiers) for x in tier}
tier_index_by_type = {shapefiles[x].meta["type"]: tier_idx[x] for x in shapefiles}
ordering_idx = {
    shapefiles[x].meta["type"]: (i, j)
    for i, tier in enumerate(tiers)
    for j, x in enumerate(tier)
}

ordering_idx["Native Area"] = (
    ordering_idx["Native Subdivision"][0],
    ordering_idx["Native Subdivision"][1] - 0.2,
)
ordering_idx["Native Statistical Area"] = (
    ordering_idx["Native Subdivision"][0],
    ordering_idx["Native Subdivision"][1] - 0.1,
)


def full_relationships(long_to_type):
    def tier(x):
        return tier_index_by_type[long_to_type[x]]

    contains, contained_by, intersects, borders = (
        defaultdict(set),
        defaultdict(set),
        defaultdict(set),
        defaultdict(set),
    )

    def add(d, edges):
        for x, y in edges:
            if x not in long_to_type or y not in long_to_type:
                continue
            d[x].add(y)

    for k1 in shapefiles:
        for k2 in shapefiles:
            print(k1, k2)
            if k1 < k2:
                continue

            fn = {
                (
                    "historical_congressional",
                    "historical_congressional",
                ): create_relationships_historical_cd,
            }.get((k1, k2), create_relationships)
            (
                a_contains_b,
                b_contains_a,
                a_intersects_b,
                a_borders_b,
            ) = fn(shapefiles[k1], shapefiles[k2])

            add(contains, a_contains_b)
            add(contains, [(big, small) for small, big in b_contains_a])
            add(contained_by, b_contains_a)
            add(contained_by, [(big, small) for small, big in a_contains_b])
            add(intersects, a_intersects_b)
            add(intersects, [(big, small) for small, big in a_intersects_b])
            if tier_idx[k1] == tier_idx[k2]:
                add(borders, a_borders_b)
                add(borders, [(big, small) for small, big in a_borders_b])

    same_geography = defaultdict(set)
    for k in contained_by:
        for v in contained_by[k]:
            if k in contains and v in contains[k]:
                if k != v:
                    same_geography[k].add(v)
                    same_geography[v].add(k)

    # for contains, go one down at most
    for k in contains:
        contains[k] = {v for v in contains[k] if tier(v) >= tier(k) - 1}
    # for intersects, do not go down
    for k in intersects:
        intersects[k] = {v for v in intersects[k] if tier(v) >= tier(k)}

    contains = {
        k: {v for v in vs if v not in same_geography[k]} for k, vs in contains.items()
    }
    contained_by = {
        k: {v for v in vs if v not in same_geography[k]}
        for k, vs in contained_by.items()
    }

    results = dict(
        same_geography=same_geography,
        contained_by=contained_by,
        contains=contains,
        borders=borders,
        intersects=intersects,
    )
    return {
        k: {k2: sorted(list(v2 - {k2})) for k2, v2 in v.items()}
        for k, v in results.items()
    }
