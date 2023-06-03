from collections import defaultdict
from permacache import permacache
import geopandas as gpd

from shapefiles import shapefiles


@permacache(
    "population_density/relationship/create_relationships_4",
    key_function=dict(x=lambda x: x.hash_key, y=lambda y: y.hash_key),
)
def create_relationships(x, y):
    """
    Get the relationships between the two shapefiles x and y
    """
    a = x.load_file()
    b = y.load_file()
    over = gpd.overlay(a, b, how="intersection", keep_geom_type=False)
    a_area = dict(zip(a.longname, a.geometry.to_crs("EPSG:2163").area))
    b_area = dict(zip(b.longname, b.geometry.to_crs("EPSG:2163").area))
    over_area = over.geometry.to_crs("EPSG:2163").area

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
        if area_over >= area_2 * 0.9:
            contains = True
            a_contains_b.add((row.longname_1, row.longname_2))
        if area_over >= area_1 * 0.9:
            contains = True
            b_contains_a.add((row.longname_1, row.longname_2))
        if contains:
            pass
        elif area_over >= min(area_1, area_2) * 0.01:
            intersects.add((row.longname_1, row.longname_2))
        else:
            borders.add((row.longname_1, row.longname_2))

    a_contains_b = sorted(a_contains_b)
    b_contains_a = sorted(b_contains_a)
    intersects = sorted(intersects)
    borders = sorted(borders)

    return a_contains_b, b_contains_a, intersects, borders


def add(d, edges):
    for x, y in edges:
        d[x].add(y)


tiers = [
    ["states"],
    ["csas", "msas", "counties"],
    ["cousub", "cities"],
    ["neighborhoods", "zctas"],
]
tier_idx = {x: i for i, tier in enumerate(tiers) for x in tier}
ordering_idx = {
    shapefiles[x].meta["type"]: (i, j)
    for i, tier in enumerate(tiers)
    for j, x in enumerate(tier)
}


def full_relationships():
    contains, contained_by, intersects, borders = (
        defaultdict(set),
        defaultdict(set),
        defaultdict(set),
        defaultdict(set),
    )

    def add(d, edges):
        for x, y in edges:
            d[x].add(y)

    for k1 in shapefiles:
        for k2 in shapefiles:
            print(k1, k2)
            if abs(tier_idx[k1] - tier_idx[k2]) > 1:
                continue
            (
                a_contains_b,
                b_contains_a,
                a_intersects_b,
                a_borders_b,
            ) = create_relationships(shapefiles[k1], shapefiles[k2])
            add(contains, a_contains_b)
            add(contained_by, b_contains_a)
            if tier_idx[k1] == tier_idx[k2]:
                add(intersects, a_intersects_b)
                add(borders, a_borders_b)

    results = dict(
        contains=contains,
        contained_by=contained_by,
        intersects=intersects,
        borders=borders,
    )
    return {
        k: {k2: sorted(list(v2 - {k2})) for k2, v2 in v.items()}
        for k, v in results.items()
    }
