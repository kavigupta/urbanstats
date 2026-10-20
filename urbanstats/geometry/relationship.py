from collections import defaultdict

import numpy as np
from permacache import permacache, stable_hash

from urbanstats.geometry.relationship_equirectangular import compute_relationships
from urbanstats.geometry.shapefiles.longnames import shapefile_longnames
from urbanstats.geometry.shapefiles.shapefile import join_layers
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.website_data.table import shapefile_without_ordinals

# relationships are computed over land, whose mask is built from the subnational regions
LAND_SOURCE = shapefiles["subnational_regions"].geometry


@permacache(
    "population_density/relationship/create_relationships_15",
    key_function=dict(
        x_names=stable_hash,
        x_dates=stable_hash,
        y_names=stable_hash,
        y_dates=stable_hash,
    ),
)
def create_relationships(
    x_names, x_dates, y_names, y_dates, *, land_source, check_temporal=True
):
    """
    Get the relationships between the regions of shapefiles x and y.
    Delegates to relationship_equirectangular.compute_relationships.
    """
    rels = compute_relationships(x_names.geometry, y_names.geometry, land_source)
    names_x, names_y = shapefile_longnames(x_names), shapefile_longnames(y_names)
    rels = {
        kind: {(names_x[i], names_y[j]) for i, j in pairs}
        for kind, pairs in rels.items()
    }
    a = join_layers(x_names, x_dates)
    b = join_layers(y_names, y_dates)
    a_contains_b = rels["a_contains_b"] | rels["same_geography"]
    b_contains_a = rels["a_contained_by_b"] | rels["same_geography"]
    intersects = rels["intersects"]
    borders = rels["borders"]
    return [
        sorted(filter_temporal_overlaps(a, b, s) if check_temporal else s)
        for s in [a_contains_b, b_contains_a, intersects, borders]
    ]


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
    shapefile.metadata.meta["type"]: shapefile.metadata.meta["type_category"]
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

key_to_type = {x: sf.metadata.meta["type"] for x, sf in shapefiles.items()}

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

missing = {x.metadata.meta["type"] for x in shapefiles.values()} - set(
    tier_index_by_type
)

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
        for rt, by_rt in relationships_for_list(
            long_to_type,
            {k: sf.names for k, sf in shapefiles.items()},
            {k: sf.dates for k, sf in shapefiles.items()},
            {k: sf.metadata.meta["type"] for k, sf in shapefiles.items()},
        ).items()
    }


@permacache(
    "relationship/relationships_for_list_3",
    key_function=dict(
        long_to_type=stable_hash,
        names_by_key=stable_hash,
        dates_by_key=stable_hash,
        type_by_key=stable_hash,
    ),
)
def relationships_for_list(long_to_type, names_by_key, dates_by_key, type_by_key):
    contains, contained_by, intersects, borders = compute_all_relationships(
        long_to_type, names_by_key, dates_by_key, type_by_key
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


def compute_all_relationships(long_to_type, names_by_key, dates_by_key, type_by_key):
    # pylint: disable=too-many-locals
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

    pairs = [(k1, k2) for k1 in names_by_key for k2 in names_by_key if k1 >= k2]

    for i, (k1, k2) in enumerate(pairs):
        print(f"{i}/{len(pairs)}: {k1} and {k2}")
        (
            a_contains_b,
            b_contains_a,
            a_intersects_b,
            a_borders_b,
        ) = create_relationships_dispatch(names_by_key, dates_by_key, k1, k2)

        add(contains, a_contains_b)
        add(contains, [(big, small) for small, big in b_contains_a])
        add(contained_by, b_contains_a)
        add(contained_by, [(big, small) for small, big in a_contains_b])
        add(intersects, a_intersects_b)
        add(intersects, [(big, small) for small, big in a_intersects_b])
        if can_border(type_by_key[k1], type_by_key[k2]):
            add(borders, a_borders_b)
            add(borders, [(big, small) for small, big in a_borders_b])
    return contains, contained_by, intersects, borders


def flip(edges):
    return [(y, x) for (x, y) in edges]


def create_relationships_dispatch(
    names_by_key, dates_by_key, k1, k2, check_temporal=True
):
    if k1 < k2:
        a_contains_b, b_contains_a, a_intersects_b, a_borders_b = create_relationships(
            names_by_key[k2],
            dates_by_key[k2],
            names_by_key[k1],
            dates_by_key[k1],
            land_source=LAND_SOURCE,
            check_temporal=check_temporal,
        )
        return (
            flip(b_contains_a),
            flip(a_contains_b),
            flip(a_intersects_b),
            flip(a_borders_b),
        )
    t1, t2 = dates_by_key[k1].temporal, dates_by_key[k2].temporal
    if check_temporal and not temporal_ranges_overlap(
        t1.start_date_overall,
        t1.end_date_overall,
        t2.start_date_overall,
        t2.end_date_overall,
    ):
        return set(), set(), set(), set()
    (
        a_contains_b,
        b_contains_a,
        a_intersects_b,
        a_borders_b,
    ) = create_relationships(
        names_by_key[k1],
        dates_by_key[k1],
        names_by_key[k2],
        dates_by_key[k2],
        land_source=LAND_SOURCE,
        check_temporal=check_temporal,
    )

    return a_contains_b, b_contains_a, a_intersects_b, a_borders_b


def populate_caches():
    table = shapefile_without_ordinals()
    long_to_type = dict(zip(table.longname, table.type))
    full_relationships(long_to_type)


if __name__ == "__main__":
    populate_caches()
