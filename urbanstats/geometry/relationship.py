from collections import defaultdict

import geopandas as gpd
import numpy as np
import tqdm
from permacache import permacache, stable_hash

from urbanstats.geometry.shapefile_geometry import overlays
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.website_data.table import shapefile_without_ordinals


@permacache(
    "population_density/relationship/create_relationships_8",
    key_function=dict(x=lambda x: x.hash_key, y=lambda y: y.hash_key),
)
def create_relationships(x, y):
    """
    Get the relationships between the two shapefiles x and y
    """
    table_a, table_b, over = compute_overlays_with_areas(x, y)

    a_contains_b = set()
    b_contains_a = set()
    intersects = set()
    borders = set()
    for i in range(over.shape[0]):
        row = over.iloc[i]
        area_over = over.area[i]
        contains = False
        tolerance = 0.05
        if area_over >= row.b_area * (1 - tolerance):
            contains = True
            a_contains_b.add((row.longname_1, row.longname_2))
        if area_over >= row.a_area * (1 - tolerance):
            contains = True
            b_contains_a.add((row.longname_1, row.longname_2))
        if contains:
            pass
        elif area_over >= min(row.a_area, row.b_area) * tolerance:
            intersects.add((row.longname_1, row.longname_2))
        else:
            borders.add((row.longname_1, row.longname_2))

    return [
        sorted(filter_temporal_overlaps(table_a, table_b, items))
        for items in [a_contains_b, b_contains_a, intersects, borders]
    ]


def compute_overlays_with_areas(x, y):
    a = x.load_file()
    b = y.load_file()
    over = overlays(a, b, x.chunk_size, y.chunk_size)
    a_area = dict(zip(a.longname, a.geometry.to_crs("EPSG:2163").area))
    b_area = dict(zip(b.longname, b.geometry.to_crs("EPSG:2163").area))
    over["a_area"] = over.longname_1.map(lambda x: a_area[x])
    over["b_area"] = over.longname_2.map(lambda x: b_area[x])
    return a, b, over


def temporal_ranges_overlap(start_a, end_a, start_b, end_b):
    start_a, end_a, start_b, end_b = (
        np.min(start_a),
        np.max(end_a),
        np.min(start_b),
        np.max(end_b),
    )
    if start_a <= end_a < start_b <= end_b:
        return False
    if start_b <= end_b < start_a <= end_a:
        return False
    return True


def filter_temporal_overlaps(a, b, items):
    assert isinstance(items, set)
    a = a.set_index("longname")
    b = b.set_index("longname")
    results = set()
    for x, y in items:
        start_a, end_a = a.loc[x].start_date, a.loc[x].end_date
        start_b, end_b = b.loc[y].start_date, b.loc[y].end_date
        if temporal_ranges_overlap(start_a, end_a, start_b, end_b):
            results.add((x, y))
    return results


@permacache(
    "population_density/relationship/create_overlays_only_borders_2",
    key_function=dict(a=lambda x: x.hash_key, b=lambda y: y.hash_key),
)
def create_overlays_only_borders(a, b):
    """
    Get the relationships between the two shapefiles x and y

    Since we only care about borders, we can just use sjoin
    """

    a = a.load_file()
    b = b.load_file()
    related = gpd.sjoin(a, b)
    borders = set()
    for i in tqdm.trange(len(related)):
        row = related.iloc[i]
        left = row.longname_left
        right = row.longname_right
        if left != right:
            borders.add((left, right))
    return set(), set(), set(), filter_temporal_overlaps(a, b, borders)


@permacache(
    "population_density/relationship/create_relationships_countries_subnationals_2",
    key_function=dict(a=lambda x: x.hash_key, b=lambda y: y.hash_key),
)
def create_relationships_countries_subnationals(a, b):
    """
    Get the relationships between the two shapefiles x and y

    Since we only care about borders, we can just use sjoin
    """

    assert a.meta["type"] == "Country"
    assert b.meta["type"] == "Subnational Region"

    a = a.load_file()
    b = b.load_file()

    long_a = list(a.longname)
    long_b = list(b.longname)

    a_contains_b = set()
    for i in tqdm.trange(len(a)):
        for j in range(len(b)):
            la, lb = long_a[i], long_b[j]
            if lb.endswith(", " + la):
                a_contains_b.add((la, lb))
    return filter_temporal_overlaps(a, b, a_contains_b), set(), set(), set()


tiers = [
    [
        "Continent",
        "1B Person Circle",
        "500M Person Circle",
    ],
    [
        "Country",
        "200M Person Circle",
        "100M Person Circle",
    ],
    [
        "Subnational Region",
        "Native Area",
        "Native Statistical Area",
        "Judicial Circuit",
        "Media Market",
        "USDA County Type",
        "Hospital Referral Region",
        "50M Person Circle",
    ],
    [
        "CSA",
        "MSA",
        "County",
        "Congressional District (1780s)",
        "Congressional District (1790s)",
        "Congressional District (1800s)",
        "Congressional District (1810s)",
        "Congressional District (1820s)",
        "Congressional District (1830s)",
        "Congressional District (1840s)",
        "Congressional District (1850s)",
        "Congressional District (1860s)",
        "Congressional District (1870s)",
        "Congressional District (1880s)",
        "Congressional District (1890s)",
        "Congressional District (1900s)",
        "Congressional District (1910s)",
        "Congressional District (1920s)",
        "Congressional District (1930s)",
        "Congressional District (1940s)",
        "Congressional District (1950s)",
        "Congressional District (1960s)",
        "Congressional District (1970s)",
        "Congressional District (1980s)",
        "Congressional District (1990s)",
        "Congressional District (2000s)",
        "Congressional District (2010s)",
        "Congressional District (2020s)",
        "State House District",
        "State Senate District",
        "Congressional District",
        "Native Subdivision",
        "Urban Area",
        "Judicial District",
        "County Cross CD",
        "Hospital Service Area",
        "Urban Center",
        "Urban Center",
        "Metropolitan Cluster",
        "20M Person Circle",
        "10M Person Circle",
        "5M Person Circle",
        "CA CMA",
        "CA Census Division",
        "CA Riding",
        "CA Population Center",
    ],
    ["CCD", "City", "School District", "CA Census Subdivision"],
    ["Neighborhood", "ZIP"],
]

type_to_type_category = {
    shapefile.meta["type"]: shapefile.meta["type_category"]
    for shapefile in shapefiles.values()
}

type_category_order = {
    "US Subdivision": 0,
    "International": 0,
    "International City": 0,
    "US City": 10,
    "Census": 20,
    "Small": 30,
    "Political": 40,
    "Native": 50,
    "School": 60,
    "Oddball": 70,
    "Kavi": 80,
}

key_to_type = {x: sf.meta["type"] for x, sf in shapefiles.items()}

map_relationships = [
    ("subnational_regions", "counties"),
    ("native_areas", "native_subdivisions"),
    ("native_statistical_areas", "native_subdivisions"),
    ("csas", "msas"),
    ("msas", "counties"),
    ("counties", "cities"),
    ("cousub", "cities"),
    ("cities", "neighborhoods"),
    ("school_districts", "neighborhoods"),
    ("zctas", "neighborhoods"),
    ("urban_areas", "cities"),
    ("judicial_circuits", "judicial_districts"),
]
map_relationships += [[x, x] for x in shapefiles]

map_relationships_by_type = [[key_to_type[x] for x in y] for y in map_relationships]

tier_index_by_type = {x: -i for i, tier in enumerate(tiers) for x in tier}

missing = {x.meta["type"] for x in shapefiles.values()} - set(tier_index_by_type)

assert not missing, missing

ordering_idx = {
    x: (type_category_order[type_to_type_category[x]], i, j)
    for i, tier in enumerate(tiers)
    for j, x in enumerate(tier)
}

ordering_idx = {
    x: i
    for i, x in enumerate(
        [x for x, _ in sorted(ordering_idx.items(), key=lambda x: x[1])]
    )
}


def can_contain(x, y):
    """
    True iff y should show up on x's contains list. Only go down by 1 tier
    """
    return tier_index_by_type[y] >= tier_index_by_type[x] - 1


def can_intersect(x, y):
    """
    True iff y should show up on x's intersects list. Do not go down
    """
    return tier_index_by_type[y] >= tier_index_by_type[x]


def can_border(x, y):
    """
    True iff y should show up on x's borders list. Only objects of the same tier
    """
    return tier_index_by_type[x] == tier_index_by_type[y]


def full_relationships(long_to_type):
    return {
        rt: {k: by_rt_k for k, by_rt_k in by_rt.items() if by_rt_k}
        for rt, by_rt in relationships_for_list(long_to_type, shapefiles).items()
    }


@permacache(
    "relationship/relationships_for_list_2",
    key_function=dict(
        long_to_type=stable_hash,
        shapefiles_to_use=lambda shapefiles_to_use: stable_hash(
            {k: v.hash_key for k, v in shapefiles_to_use.items()}
        ),
    ),
)
def relationships_for_list(long_to_type, shapefiles_to_use):
    contains, contained_by, intersects, borders = compute_all_relationships(
        long_to_type, shapefiles_to_use
    )

    same_geography = defaultdict(set)
    for k in contained_by:
        for v in contained_by[k]:
            if k in contains and v in contains[k]:
                if k != v:
                    same_geography[k].add(v)
                    same_geography[v].add(k)

    for k in contains:
        contains[k] = {
            v for v in contains[k] if can_contain(long_to_type[k], long_to_type[v])
        }
    # for intersects, do not go down
    for k in intersects:
        intersects[k] = {
            v for v in intersects[k] if can_intersect(long_to_type[k], long_to_type[v])
        }

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


def compute_all_relationships(long_to_type, shapefiles_to_use):
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

    for k1 in shapefiles_to_use:
        for k2 in shapefiles_to_use:
            print(k1, k2)
            if k1 < k2:
                continue

            (
                a_contains_b,
                b_contains_a,
                a_intersects_b,
                a_borders_b,
            ) = create_relationships_dispatch(shapefiles_to_use, k1, k2)

            add(contains, a_contains_b)
            add(contains, [(big, small) for small, big in b_contains_a])
            add(contained_by, b_contains_a)
            add(contained_by, [(big, small) for small, big in a_contains_b])
            add(intersects, a_intersects_b)
            add(intersects, [(big, small) for small, big in a_intersects_b])
            if can_border(
                shapefiles_to_use[k1].meta["type"],
                shapefiles_to_use[k2].meta["type"],
            ):
                add(borders, a_borders_b)
                add(borders, [(big, small) for small, big in a_borders_b])
    return contains, contained_by, intersects, borders


def create_relationships_dispatch(shapefiles_to_use, k1, k2):
    if not temporal_ranges_overlap(
        shapefiles_to_use[k1].start_date_overall,
        shapefiles_to_use[k1].end_date_overall,
        shapefiles_to_use[k2].start_date_overall,
        shapefiles_to_use[k2].end_date_overall,
    ):
        return set(), set(), set(), set()
    fn = {
        ("countries", "countries"): create_overlays_only_borders,
        (
            "countries",
            "subnational_regions",
        ): create_relationships_countries_subnationals,
        (
            "subnational_regions",
            "countries",
        ): lambda x, y: create_relationships_countries_subnationals(y, x),
    }.get((k1, k2), create_relationships)
    (
        a_contains_b,
        b_contains_a,
        a_intersects_b,
        a_borders_b,
    ) = fn(shapefiles_to_use[k1], shapefiles_to_use[k2])

    return a_contains_b, b_contains_a, a_intersects_b, a_borders_b


def populate_caches():
    table = shapefile_without_ordinals()
    long_to_type = dict(zip(table.longname, table.type))
    full_relationships(long_to_type)


if __name__ == "__main__":
    populate_caches()
