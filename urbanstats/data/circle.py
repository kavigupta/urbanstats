from colorsys import hsv_to_rgb
from dataclasses import dataclass
from matplotlib import patches, pyplot as plt
import numpy as np
import tqdm.auto as tqdm
from PIL import Image

from permacache import permacache, stable_hash, drop_if_equal


class MapDataset:
    def __init__(self, map, ban):
        self.map = map
        self.ban = ban
        by_row = map.sum(1)
        self.by_row_cumul = np.cumsum(by_row)
        self.secants = compute_secants(map, np.arange(map.shape[0]))
        self.x = np.arange(map.shape[1])
        self.cumul_map = np.cumsum(map, axis=1)
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
            pop = np.zeros(self.map.shape[1])
            for yprime in range(int(np.ceil(y - r)), int(y + r + 1)):
                if yprime < 0 or yprime >= self.map.shape[0]:
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

    def binary_search(self, P, low, high=None, *, eps=0.25):
        value = (low + high) / 2 if high else low * 2
        if value > self.map.shape[0]:
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


def compute_secants(map, coord):
    return 1 / np.cos(coord / map.shape[0] * np.pi - np.pi / 2)


@permacache(
    "urbanstats/data/circle/binary_search_map_6",
    key_function=dict(
        map=stable_hash,
        ban=stable_hash,
        start_radius=drop_if_equal(1),
        high=drop_if_equal(None),
    ),
    multiprocess_safe=True,
)
def binary_search_map(map, ban, P, start_radius=1, high=None):
    dset = MapDataset(map, ban)
    return dset.binary_search(P, start_radius, high=high, eps=0.25)


@permacache(
    "urbanstats/data/circle/non_overlapping_circles_2",
    key_function=dict(map=stable_hash),
    multiprocess_safe=True,
)
def non_overlapping_circles(map, P, limit=100):
    map = np.array(map)
    ban = np.zeros(map.shape, dtype=np.int32)
    circles = []
    for _ in tqdm.trange(limit):
        bsm = binary_search_map(map, ban, P)
        if bsm[1] is None:
            break
        r, (y, x) = bsm
        circles.append((r, (y, x)))
        ys, xs = clear_location(map, r, y, x)
        ban[ys, xs] = 1
    return circles


@permacache(
    "urbanstats/data/circle/overlapping_circles_2",
    key_function=dict(map=stable_hash),
    multiprocess_safe=True,
)
def overlapping_circles(map, P, limit=100):
    map = np.array(map)
    circle_map = np.zeros(map.shape, dtype=np.int32)
    circles = []
    for i in tqdm.trange(limit):
        bsm = binary_search_map(map, ban=None, P=P)
        if bsm[1] is None:
            break
        r, (y, x) = bsm
        circles.append((r, (y, x)))
        ys, xs = clear_location(map, r, y, x)
        existing_cm = circle_map[ys, xs]
        existing_cm[existing_cm == 0] = i + 1
        circle_map[ys, xs] = existing_cm
    return circles, circle_map


@permacache(
    "urbanstats/data/circle/overlapping_circles_fast",
    key_function=dict(map=stable_hash),
    multiprocess_safe=True,
)
def overlapping_circles_fast(map, P, *, limit=100, max_radius_in_chunks=10):
    circles = []
    map = np.array(map)
    adjustment = 1
    radius = 2
    while True:
        radius, center = binary_search_map(
            map,
            ban=None,
            P=P,
            start_radius=radius / 2,
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
                "Chunked map, new size",
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


def clear_location(map, r, y, x):
    ry = r
    secy = compute_secants(map, y)
    rx = r * secy
    tl_x = max(0, int(x - rx))
    tl_y = max(0, int(y - ry))
    br_x = min(map.shape[1], int(x + rx + 1))
    br_y = min(map.shape[0], int(y + ry + 1))
    xs, ys = np.meshgrid(
        np.arange(tl_x, br_x),
        np.arange(tl_y, br_y),
    )
    mask = (xs - x) ** 2 / secy**2 + (ys - y) ** 2 < r**2
    map[ys[mask], xs[mask]] = 0
    return ys[mask], xs[mask]


def plot_circles(map, circles, *, reduce=10, **kwargs):
    plot_ghs(map, reduce)
    for r, (y, x) in circles:
        # rx = r * secy
        secy = compute_secants(map, y)
        r, x, y = (
            r / map.shape[1] * 360,
            x / map.shape[1] * 360 - 180,
            90 - y / map.shape[0] * 180,
        )
        ellipse = patches.Ellipse(
            (x, y), r * secy * 2, r * 2, fill=False, edgecolor="red", **kwargs
        )
        plt.gca().add_artist(ellipse)
    plt.xlim(-180, 180)
    plt.ylim(-90, 90)
    # turn off axis
    plt.axis("off")


def reduce_circles(circles, reduce):
    return [(r / reduce, (y // reduce, x // reduce)) for r, (y, x) in circles]


def plot_overlapping_circles(map, circles, circle_map, *, reduce=10):
    map = chunk(map, reduce)
    circles = reduce_circles(circles, reduce)
    if circle_map is None:
        circle_map = make_circle_map(map.shape, circles)
    else:
        circle_map = chunk(circle_map, reduce)
    plot_circles(map, circles, reduce=1, linewidth=0.2)
    circle_rgb = get_rgb_circles(circles, circle_map)
    plt.imshow(circle_rgb, extent=[-180, 180, -90, 90])


def get_rgb_circles(circles, circle_map):
    circle_rgb = np.zeros(circle_map.shape + (4,), dtype=np.uint8)
    hues = np.linspace(0, 1, len(circles))
    sats = np.random.rand(len(circles)) * 0.5 + 0.5
    vals = np.random.rand(len(circles)) * 0.5 + 0.5
    rgb = np.array(
        [hsv_to_rgb(hue, sat, val) for hue, sat, val in zip(hues, sats, vals)]
    )
    rgb = (rgb * 255).astype(np.uint8)
    for i, (r, (y, x)) in enumerate(circles):
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


def plot_ghs(map, reduce):
    map_reduced = chunk(map, reduce)
    perc_90 = np.percentile(map_reduced, 99.9)
    # imshow from -180 to 180, -90 to 90
    plt.imshow(map_reduced, extent=[-180, 180, -90, 90], clim=[0, perc_90], cmap="gray")


def cumulative_sum_vertically(map):
    out = np.zeros((map.shape[0] + 1, map.shape[1]), dtype=map.dtype)
    np.cumsum(map, axis=0, out=out[1:])
    return out


def cumulative_sum_horizontally(map):
    out = np.zeros((map.shape[0], map.shape[1] + 1), dtype=map.dtype)
    np.cumsum(map, axis=1, out=out[:, 1:])
    return out


@dataclass
class MapCumulativeSum:
    cumul: np.ndarray
    height: int
    width: int

    @classmethod
    def from_map(cls, map):
        return cls(
            cumulative_sum_horizontally(cumulative_sum_vertically(map)), *map.shape
        )

    def compute_range(self, y1, y2, x1, x2):
        """
        Computes sum(map[y, x % map.shape[1]] if 0 <= y < map.shape[0] else 0 for y in range(y1, y2) for x in range(x1, x2)]
        """
        y2 = np.clip(y2, 0, self.height)
        y1 = np.clip(y1, 0, self.height)
        x_cycles = ((x2 - x2 % self.width) - (x1 - x1 % self.width)) // self.width
        x1 = x1 % self.width
        x2 = x2 % self.width
        result = (
            self.cumul[y2, x2]
            - self.cumul[y2, x1]
            - self.cumul[y1, x2]
            + self.cumul[y1, x1]
        )
        result += x_cycles * (
            self.cumul[y2, -1]
            - self.cumul[y2, 0]
            - self.cumul[y1, -1]
            + self.cumul[y1, 0]
        )
        return result


def high_density_chunks(population_map, y_rad, chunk_size, min_density):
    """
    Return the chunks (yl, xl) corresponding to regions of population_map[yl*chunk_size:(yl+1) * chunk_sie, xl*chunk_size:(xl+1) * chunk_size]
       with population density at least min_density.

    The area of a pixel in population_map at index (y, x) is cos(y_rad[y])
    """
    y_rad_padded = np.pad(
        y_rad,
        (0, (-population_map.shape[0]) % chunk_size),
        mode="constant",
        constant_values=0,
    )
    area_chunk = np.cos(y_rad_padded).reshape(-1, chunk_size).sum(1) * chunk_size
    population_map_padded = chunk(population_map, chunk_size)
    return np.where(population_map_padded > area_chunk[:, None] * min_density)


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
    import shapely
    import shapely.affinity
    import shapely.geometry

    r = r_pixels / map_shape[1] * 360
    x = x_pixels / map_shape[1] * 360 - 180
    y = 90 - y_pixels / map_shape[0] * 180
    secy = 1 / np.cos(np.deg2rad(y))
    return shapely.affinity.scale(
        shapely.geometry.Point(x, y).buffer(1),
        r * secy,
        r,
    )


def to_geopandas_frame(map_shape, circles):
    import geopandas as gpd

    ellipses = []
    for r, (y, x) in tqdm.tqdm(circles):
        current = to_shapely_ellipse(map_shape, r, y, x)
        for other in ellipses:
            if current.intersects(other):
                current = current.difference(other)
        current = current.buffer(0.001)
        ellipses.append(current)
    return gpd.GeoDataFrame(dict(id=np.arange(len(circles))), geometry=ellipses)
