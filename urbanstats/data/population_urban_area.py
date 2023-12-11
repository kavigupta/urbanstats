from disjoint_union import DisjointUnion
from permacache import permacache, stable_hash
import shapely.geometry
import geopandas as gpd
import heapq
import numpy as np
import tqdm.auto as tqdm

from urbanstats.features.within_distance import haversine


def connected_components(array):
    """
    Finds connected components in a boolean array. Each
        cell in the array is a node in the graph, if
        it is True. Two nodes are connected if they
        are adjacent (not including diagonals).
    """

    def neighbors(i, j):
        for di, dj in [(-1, 0), (0, -1), (0, 1), (1, 0)]:
            if 0 <= i + di < array.shape[0] and 0 <= j + dj < array.shape[1]:
                yield i + di, j + dj

    to_component = np.zeros(array.shape, dtype=int)

    def dfs(i, j, component):
        stack = [(i, j)]
        while stack:
            i, j = stack.pop()
            to_component[i, j] = component
            for ni, nj in neighbors(i, j):
                if array[ni, nj] and to_component[ni, nj] == 0:
                    stack.append((ni, nj))

    component = 1
    for i in tqdm.trange(array.shape[0]):
        for j in range(array.shape[1]):
            if array[i, j] and to_component[i, j] == 0:
                dfs(i, j, component)
                component += 1

    return to_component


def render_components(density, components):
    """
    Take the array of components and render it into RGB. Each
        component is rendered as a different color.
    """

    colors = np.random.RandomState(0).randint(
        0, 256, (components.max() + 1, 3), dtype=np.uint8
    )
    colors[0] = 0
    return colors[components]


def distance(i1, j1, i2, j2, latitudes, longitudes):
    """
    Returns the distance between two points on the earth's surface.
    """

    return haversine(latitudes[i1], longitudes[j1], latitudes[i2], longitudes[j2])


def get_components_as_lists(components):
    """
    Given an array of components, returns a list of lists
        of the points in each component.
    """

    i, j = np.where(components)
    component_lists = [[] for _ in range(components.max() + 1)]
    for i, j in zip(i, j):
        component_lists[components[i, j]].append((i, j))

    return component_lists


def adjacent_components(component_array, travel_mask, starting_pts, dist_fn, dist_max):
    """
    finds the components that are reachable from the starting points
        within a certain distance.

    A point is reachable if there is some path from an element of
        starting_pts to that point, where each step in the path
        is adjacent to the previous step and is within the travel_mask.

    In this case, we do allow diagonal steps.

    The distance of a path is the sum of the distances between
        adjacent points in the path.
    """

    visited_components = set()
    visited = set()
    # use a priority queue to keep track of the points
    #   that we have visited but not yet explored.
    # the priority is the distance from the starting point.
    # the queue is implemented as a heap.
    queue = []
    for pt in starting_pts:
        queue.append((0, pt))
    heapq.heapify(queue)

    while queue:
        dist, pt = heapq.heappop(queue)
        if pt in visited:
            continue
        visited.add(pt)
        visited_components.add(component_array[pt])
        i, j = pt
        for di, dj in [
            (-1, 0),
            (0, -1),
            (0, 1),
            (1, 0),
            (-1, -1),
            (-1, 1),
            (1, -1),
            (1, 1),
        ]:
            ni, nj = i + di, j + dj
            if (
                0 <= ni < component_array.shape[0]
                and 0 <= nj < component_array.shape[1]
            ):
                if travel_mask[ni, nj]:
                    # if (ni, nj) not in starting_pts:
                    #     print(ni, nj)
                    new_dist = dist + dist_fn(i, j, ni, nj)
                    if new_dist <= dist_max:
                        heapq.heappush(queue, (new_dist, (ni, nj)))

    return visited_components


def group_components(component_array, travel_mask, dist_fn, dist_max):
    component_sets = get_components_as_lists(component_array)
    u = DisjointUnion({1})
    for i in range(2, len(component_sets)):
        u |= DisjointUnion({i})

    for i in tqdm.trange(1, len(component_sets)):
        neighbors = adjacent_components(
            component_array, travel_mask, component_sets[i], dist_fn, dist_max
        )
        for j in neighbors:
            if j > 0:
                u.union(i, j)

    map_back = [0] * len(component_sets)
    for supercomponent_idx, components in enumerate(u):
        for component_idx in components:
            map_back[component_idx] = supercomponent_idx + 1

    return np.array(map_back)[component_array]


def population_by_components(pop, component_array):
    """
    Given an array of components and an array of population,
        returns an array of the population of each component.
    """

    component_pop = np.zeros(component_array.max() + 1)
    np.add.at(component_pop, component_array.flatten(), pop.flatten())
    return component_pop


def filter_by_population(pop, component_array, min_pop):
    """
    Given an array of components and an array of population,
        returns an array of components where each component
        has at least min_pop population.
    """

    component_pop = population_by_components(pop, component_array)
    # print(component_pop)
    component_to_new = np.zeros(component_pop.shape[0], dtype=int)
    new = 1
    for i in range(1, component_pop.shape[0]):
        if component_pop[i] >= min_pop:
            component_to_new[i] = new
            new += 1
    out = component_to_new[component_array]
    # print(population_by_components(pop, out))
    return out


def pack(arr):
    w = np.where(arr)
    return arr.shape, arr.dtype, w, arr[w]


def unpack(shape, dtype, w, data):
    arr = np.zeros(shape, dtype=dtype)
    arr[w] = data
    return arr


@permacache(
    "urbanstats/data/population_urban_area/compute_urban_areas_3",
    key_function=dict(
        po=stable_hash,
        ds=stable_hash,
        pl=stable_hash,
        latitudes=stable_hash,
        longitudes=stable_hash,
    ),
)
def compute_urban_areas(
    po, ds, pl, latitudes, longitudes, *, dens_1, dens_2, max_dist, min_pop
):
    assert dens_1 >= dens_2

    dist = lambda i1, j1, i2, j2: distance(i1, j1, i2, j2, latitudes, longitudes)
    con = connected_components(ds > dens_2)
    group = group_components(con, pl < 0.5, dist, max_dist)
    group[ds < dens_1] = 0
    # return np.array(cc2)
    group = filter_by_population(po, group, min_pop)
    combined = group_components(group, np.ones_like(pl, dtype=np.bool), dist, max_dist)
    return pack(con), pack(group), pack(combined)


def filter_by_max_density(density, component_array, min_density):
    """
    Given an array of components and an array of density,
        returns an array of components where each component
        has at least min_density density at some point.
    """
    i_s, j_s = np.where(component_array)
    vs = component_array[i_s, j_s]
    to_new_component = np.zeros(vs.max() + 1, dtype=np.int32)
    new = 1
    for c in range(1, component_array.max() + 1):
        mask = vs == c
        if np.any(density[i_s[mask], j_s[mask]] >= min_density):
            to_new_component[c] = new
            new += 1
    return to_new_component[component_array]


@permacache(
    "urbanstats/data/population_urban_area/compute_urban_areas_require_denser",
    key_function=dict(
        po=stable_hash,
        ds=stable_hash,
        pl=stable_hash,
        latitudes=stable_hash,
        longitudes=stable_hash,
    ),
)
def compute_urban_areas_require_denser(
    po, ds, pl, latitudes, longitudes, *, dens_1, dens_2, max_dist, min_pop
):
    assert dens_1 >= dens_2

    dist = lambda i1, j1, i2, j2: distance(i1, j1, i2, j2, latitudes, longitudes)
    con = connected_components(ds > dens_2)
    group = group_components(con, pl < 0.5, dist, max_dist)
    max_dens = filter_by_max_density(ds, group, dens_1)
    # return np.array(cc2)
    filt = filter_by_population(po, max_dens, min_pop)
    combined = group_components(filt, np.ones_like(pl, dtype=np.bool), dist, max_dist)
    return pack(con), pack(max_dens), pack(combined)


def to_geopandas(pop, component_array, latitudes, longitudes):
    geoms = []
    pops = population_by_components(pop, component_array)[1:]
    comp = get_components_as_lists(component_array)
    for i, component in enumerate(tqdm.tqdm(comp)):
        if i == 0:
            continue
        # one cell per component, at 1/120 degree resolution
        #   (about 1 km)

        geom = []
        for i, j in component:
            # this is the top left corner of the cell
            #   (the cell is 1/120 degree by 1/120 degree)
            geom += [
                shapely.geometry.box(
                    longitudes[j],
                    latitudes[i],
                    longitudes[j] + 1 / 120,
                    latitudes[i] - 1 / 120,
                ).buffer(0.001)
            ]
        # take the union of all the cells in the component
        geom = shapely.ops.unary_union(geom)
        geoms.append(geom)

    print(len(pops), len(geoms))

    return gpd.GeoDataFrame(
        {"population": pops, "geometry": geoms, "ident": range(1, len(pops) + 1)}
    )


@permacache(
    "urbanstats/data/population_urban_area/convexify",
    key_function=dict(bitmap=stable_hash),
)
def convexify(bitmap, lam=0.5, nrays=16):
    """
    Take a 2d boolean array and return a lam-convex version of it.

    A lam-convex shape is one where for any point not in the shape,
        the fraction of rays from that point that intersect the shape
        is at most lam. This is a generalization of convexity, where
        normal convexity corresponds to lam=0.5.

    In practice, we approximate this with a finite number of rays.
    """

    dist = max(bitmap.shape)

    out = np.array(bitmap, dtype=bool)
    while True:
        done = True
        zi, zj = np.where(~out)
        for i, j in tqdm.tqdm(zip(zi, zj), total=len(zi)):
            if not slice_exists(out, dist, i, j, nrays, lam):
                out[i, j] = True
                done = False
        if done:
            break
    return out


def ray_hits(bitmap, dist, i, j, theta):
    """
    Returns 1 if the ray from (i, j) in direction theta intersects
        the shape, and 0 otherwise.
    """

    di, dj = np.sin(theta), np.cos(theta)

    locations = np.arange(0, dist, 0.5)
    is_ = (i + locations * di).astype(int)
    js_ = (j + locations * dj).astype(int)
    mask = (is_ >= 0) & (is_ < bitmap.shape[0]) & (js_ >= 0) & (js_ < bitmap.shape[1])
    is_ = is_[mask]
    js_ = js_[mask]

    return np.any(bitmap[is_, js_])


def slice_exists(bitmap, dist, i, j, nrays, lam):
    """
    Returns whether the fraction of rays from (i, j) that intersect the bitmap
    is at most lam.
    """

    # first try a few rays to see if we can get a quick answer
    sweeping_count = int(1 / (1 - lam))
    ang = find_valid_ray_if_exists(bitmap, dist, i, j, sweeping_count)
    if ang is True:
        return True
    if ang is False:
        return False

    line = int(nrays * lam)

    non_intersecting_rays = 0
    for theta in np.arange(
        ang - np.pi * 2 / sweeping_count,
        ang + np.pi * 2 / sweeping_count,
        np.pi * 2 / nrays,
    ):
        intersect = ray_hits(bitmap, dist, i, j, theta)
        non_intersecting_rays += not intersect
    return non_intersecting_rays > nrays - line


def find_valid_ray_if_exists(bitmap, dist, i, j, sweep_count):
    """
    Consider the set of discrete rays with angle 2pi / sweep_count * k
        for k in range(sweep_count).

    Returns
        True if there are two such rays that do not intersect the bitmap
        False if all such rays intersect the bitmap
        the angle of a ray that does not intersect the bitmap otherwise
    """

    # 0 = unset, 1 = intersect, 2 = does not intersect
    does_intersect = np.zeros(sweep_count, dtype=np.uint8)

    angles = np.linspace(0, 2 * np.pi, sweep_count + 1)[:-1]

    def operate(k):
        k = k % sweep_count
        if does_intersect[k] != 0:
            return does_intersect[k] == 1
        intersect = ray_hits(bitmap, dist, i, j, angles[k])
        if intersect:
            does_intersect[k] = 1
        else:
            does_intersect[k] = 2
        return intersect

    for k in np.random.RandomState(0).choice(sweep_count, sweep_count, replace=False):
        if operate(k):
            continue
        if not operate(k - 1):
            return True
        if not operate(k + 1):
            return True
        return angles[k]
    return False
