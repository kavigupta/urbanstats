import re
from collections import defaultdict
from functools import lru_cache

import geopandas as gpd
import numpy as np
import pandas as pd
import tqdm
from permacache import drop_if_equal, permacache, stable_hash

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles_for_stats


def skippable_edge_case(k):
    # no clue what this is
    return k == "Historical Congressional District DC-98, 103rd-117th Congress, USA"


@lru_cache(maxsize=1)
def states_for_all():
    systematics = {}
    one_offs = {
        "Freeman Island Neighborhood, Long Beach City, California, USA": "California, USA",
        "Island Chaffee Neighborhood, Long Beach City, California, USA": "California, USA",
        "Island White Neighborhood, Long Beach City, California, USA": "California, USA",
        "Bay Islands Neighborhood, San Rafael City, California, USA": "California, USA",
        "Fair Isle Neighborhood, Miami City, Florida, USA": "Florida, USA",
        "House Island Neighborhood, Portland City, Maine, USA": "Maine, USA",
        "HI-HD051, USA": "Hawaii, USA",
        "HI-SD025, USA": "Hawaii, USA",
        "OH-HD013, USA": "Ohio, USA",
        "PA-HD001, USA": "Pennsylvania, USA",
        "RI-HD075, USA": "Rhode Island, USA",
    }
    for u, u_shapefile in shapefiles_for_stats.items():
        for k, v in states_for(u_shapefile).items():
            if skippable_edge_case(k):
                continue
            if k in one_offs:
                systematics[k] = [one_offs[k]]
            else:
                systematics[k] = v
            if u_shapefile.american and not u_shapefile.tolerate_no_state:
                if len(systematics[k]) == 0:
                    print("Error on ", k, " in ", u)
                    print("shapefile: ", u_shapefile)
                    print("systematics: ", systematics[k])
                    raise ValueError
                assert len(systematics[k]) >= 1, (u, k)
    return systematics


@lru_cache(maxsize=1)
def continents_for_all():
    systematics = {}
    for _, u_shapefile in shapefiles_for_stats.items():
        for k, v in contained_in(
            u_shapefile,
            shapefiles_for_stats["continents"],
            only_american=False,
            only_nonamerican=False,
        ).items():
            if skippable_edge_case(k):
                continue
            # zip codes are north american, except for hawaii, which all start with 9
            if re.match(r"^[0-8]\d{4}, USA$", k):
                v = ["North America"]
            # Treasure island
            if k == "94130, USA":
                v = ["North America"]
            # Blake Island
            if k == "98353, USA":
                v = ["North America"]
            if k == "HI-HD051, USA":
                v = ["Oceania"]
            if k in [
                "ME-HD119, USA",
                "OH-HD013, USA",
                "Inalik ANVSA, USA",
                "Lesnoi ANVSA, USA",
            ]:
                v = ["North America"]
            if k == "Venice Urban Center, Italy":
                v = ["Europe"]
            # things in these states are in North America
            if re.match(
                r".*, (New York|Maine|Florida|Virginia|Alaska|California|Ohio|Michigan|Washington|North Carolina), USA$",
                k,
            ):
                v = ["North America"]
            if k in systematics:
                assert systematics[k] == v, (k, systematics[k], v)
            else:
                systematics[k] = v
    return systematics


@lru_cache(maxsize=1)
def non_us_countries_for_all():
    systematics = {}
    for _, u_shapefile in shapefiles_for_stats.items():
        for k, v in contained_in(
            u_shapefile,
            shapefiles_for_stats["countries"],
            only_american=False,
            only_nonamerican=True,
        ).items():
            if skippable_edge_case(k):
                continue
            if k in systematics and "USA" in k:
                v = max([v, systematics[k]], key=len)
                systematics[k] = v
            if k in systematics:
                assert systematics[k] == v, (k, systematics[k], v)
            else:
                systematics[k] = v
    return systematics


@permacache(
    "population_density/relationship/states_for_4",
    key_function=dict(sh=lambda a: a.hash_key),
)
def states_for(sh):
    print("states_for", sh.hash_key)
    return contained_in(
        sh, shapefiles_for_stats["states"], only_american=True, only_nonamerican=False
    )


@permacache(
    "population_density/relationship/contained_in_2",
    key_function=dict(
        sh=lambda a: a.hash_key,
        check_contained_in=lambda a: a.hash_key,
        only_nonamerican=drop_if_equal(False),
    ),
)
def contained_in(sh, check_contained_in, *, only_american, only_nonamerican):
    print("contained_in", sh.hash_key, check_contained_in.hash_key)
    elem = sh.load_file()
    if only_american and not sh.american or only_nonamerican and sh.american:
        return {k: [] for k in elem.longname}
    elem["idx"] = np.arange(elem.shape[0])
    over = overlays(
        check_contained_in.load_file(),
        elem,
        check_contained_in.chunk_size,
        sh.chunk_size,
        keep_geom_type=True,
    )
    area = over.area
    area_elem = elem.set_index("idx").geometry.to_crs("EPSG:2163").area
    pct = area / np.array(area_elem[over.idx])
    over = over[pct > 0.05]
    state = over.longname_1
    region = over.longname_2
    result = {k: [] for k in elem.longname}
    for st, reg in zip(state, region):
        result[reg].append(st)
    return result


def overlays(a, b, a_size, b_size, **kwargs):
    """
    Get the overlays between the two shapefiles a and b
    """
    if a_size is None and b_size is None:
        return overlay(a, b, **kwargs)

    total_frac = 1
    if a_size is not None:
        total_frac *= a_size / a.shape[0]
    if b_size is not None:
        total_frac *= b_size / b.shape[0]
    size = max(5, int(total_frac * a.shape[0]))
    results = []
    for i in tqdm.trange(0, a.shape[0], size):
        x, y = a.iloc[i : i + size], b
        for_chunk = overlay(x, y, **kwargs)
        results.append(for_chunk)
    return pd.concat(results).reset_index(drop=True)


def overlay(x, y, keep_geom_type=False):
    for_chunk = gpd.overlay(x, y, how="intersection", keep_geom_type=keep_geom_type)
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
    over = compute_overlays_with_areas(x, y)

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

    a_contains_b = sorted(a_contains_b)
    b_contains_a = sorted(b_contains_a)
    intersects = sorted(intersects)
    borders = sorted(borders)

    return a_contains_b, b_contains_a, intersects, borders


def compute_overlays_with_areas(x, y):
    a = x.load_file()
    b = y.load_file()
    over = overlays(a, b, x.chunk_size, y.chunk_size)
    a_area = dict(zip(a.longname, a.geometry.to_crs("EPSG:2163").area))
    b_area = dict(zip(b.longname, b.geometry.to_crs("EPSG:2163").area))
    over["a_area"] = over.longname_1.map(lambda x: a_area[x])
    over["b_area"] = over.longname_2.map(lambda x: b_area[x])
    return over


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
    return set(), set(), set(), borders


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
    return a_contains_b, set(), set(), set()


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
        left_cong = re.match(r".*\[(.*)\]", row.shortname_left).group(1)
        right_cong = re.match(r".*\[(.*)\]", row.shortname_right).group(1)
        if left_cong == right_cong:
            borders.add((row.longname_left, row.longname_right))
        else:
            intersects.add((row.longname_left, row.longname_right))
    return set(), set(), intersects, borders


tiers = [
    [
        "Continent",
        "1B Person Circle",
        "US 1B Person Circle",
        "500M Person Circle",
        "US 500M Person Circle",
    ],
    [
        "Country",
        "200M Person Circle",
        "US 200M Person Circle",
        "100M Person Circle",
        "US 100M Person Circle",
    ],
    [
        "State",
        "Subnational Region",
        "Native Area",
        "Native Statistical Area",
        "Judicial Circuit",
        "Media Market",
        "USDA County Type",
        "Hospital Referral Region",
        "50M Person Circle",
        "US 50M Person Circle",
    ],
    [
        "CSA",
        "MSA",
        "County",
        "Historical Congressional District",
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
        "20M Person Circle",
        "US 20M Person Circle",
        "10M Person Circle",
        "US 10M Person Circle",
        "5M Person Circle",
        "US 5M Person Circle",
    ],
    ["CCD", "City", "School District"],
    ["Neighborhood", "ZIP"],
]

type_to_type_category = {
    shapefile.meta["type"]: shapefile.meta["type_category"]
    for shapefile in shapefiles_for_stats.values()
}

type_category_order = {
    "US Subdivision": 0,
    "International": 0,
    "Census": 20,
    "Small": 30,
    "Political": 40,
    "Native": 50,
    "School": 60,
    "Oddball": 70,
    "Kavi": 80,
}

is_american = {k: v.american for k, v in shapefiles_for_stats.items()}

key_to_type = {x: sf.meta["type"] for x, sf in shapefiles_for_stats.items()}

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
    ("urban_areas", "cities"),
    ("judicial_circuits", "judicial_districts"),
]
map_relationships += [[x, x] for x in shapefiles_for_stats]

map_relationships_by_type = [[key_to_type[x] for x in y] for y in map_relationships]

tier_index_by_type = {x: -i for i, tier in enumerate(tiers) for x in tier}

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
    return relationships_for_list(long_to_type, shapefiles_for_stats)


@permacache(
    "relationship/relationships_for_list",
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

            if is_american[k1] != is_american[k2]:
                continue

            a_contains_b, b_contains_a, a_intersects_b, a_borders_b = (
                create_relationships_dispatch(shapefiles_to_use, k1, k2)
            )

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
    fn = {
        (
            "historical_congressional",
            "historical_congressional",
        ): create_relationships_historical_cd,
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
