from collections import defaultdict
from permacache import permacache
from shapefiles import shapefiles


@permacache(
    "population_density/relationship/create_relationships",
    key_function=dict(x=lambda x: x.hash_key, y=lambda y: y.hash_key),
)
def create_relationships(x, y, relationship_type):
    """
    Get the relationships between the two shapefiles x and y, using the
        given relationship type
    """
    x = x.load_file()
    y = y.load_file()
    joined = x.sjoin(y, how="inner", predicate=relationship_type)
    return sorted(zip(joined.longname_left, joined.longname_right))


def add(d, edges):
    for x, y in edges:
        d[x].add(y)


def reverse(edges):
    return [(y, x) for x, y in edges]


def full_relationships():
    contains = defaultdict(set)
    contained_by = defaultdict(set)
    borders = defaultdict(set)

    containment = set()

    containment_relationships(
        contains,
        contained_by,
        containment,
        "states",
        ["counties", "msas", "csas"],
        ["cousub", "cities", "zctas", "neighborhoods"],
    )

    containment_relationships(
        contains,
        contained_by,
        containment,
        "counties",
        ["cousub", "cities"],
        ["zctas", "neighborhoods"],
    )

    containment_relationships(
        contains,
        contained_by,
        containment,
        "csas",
        ["msas", "counties", "cities"],
        ["zctas", "neighborhoods"],
    )

    containment_relationships(
        contains,
        contained_by,
        containment,
        "msas",
        ["counties", "cities"],
        ["zctas", "neighborhoods"],
    )

    containment_relationships(
        contains,
        contained_by,
        containment,
        "cousub",
        ["cities"],
        ["neighborhoods", "zctas"],
    )

    containment_relationships(
        contains,
        contained_by,
        containment,
        "cities",
        ["neighborhoods", "counties"],
        ["zctas"],
    )

    for k1 in shapefiles:
        for k2 in shapefiles:
            if k1 > k2:
                continue
            if (k1, k2) in containment:
                continue
            if (k2, k1) in containment:
                continue
            print(k1, k2)
            edges = create_relationships(shapefiles[k1], shapefiles[k2], "intersects")
            add(borders, edges)
            add(borders, reverse(edges))
    results = dict(contains=contains, contained_by=contained_by, borders=borders)
    return {
        k: {k2: sorted(list(v2 - {k2})) for k2, v2 in v.items()}
        for k, v in results.items()
    }


def containment_relationships(
    contains, contained_by, containment, top, symmetrics, only_up
):
    for sub in symmetrics:
        print(top, sub)
        containment.add((top, sub))
        edges = create_relationships(shapefiles[top], shapefiles[sub], "intersects")
        add(contains, edges)
        add(contained_by, reverse(edges))

    for sub in only_up:
        print(top, sub)
        containment.add((top, sub))
        edges = create_relationships(shapefiles[top], shapefiles[sub], "intersects")
        add(contained_by, reverse(edges))
