from colorsys import hsv_to_rgb
from matplotlib import patches, pyplot as plt
import numpy as np
import tqdm.auto as tqdm

from permacache import permacache, stable_hash


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
    key_function=dict(map=stable_hash, ban=stable_hash),
    multiprocess_safe=True,
)
def binary_search_map(map, ban, P):
    dset = MapDataset(map, ban)
    return dset.binary_search(P, 1, eps=0.25)


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


def plot_overlapping_circles(map, circles, circle_map, *, reduce=10):
    plot_circles(map, circles, reduce=reduce, linewidth=0.2)
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
    plt.imshow(circle_rgb, extent=[-180, 180, -90, 90])


def plot_ghs(map, reduce):
    map_reduced = map.reshape(
        map.shape[0] // reduce, reduce, map.shape[1] // reduce, reduce
    ).sum((1, 3))
    perc_90 = np.percentile(map_reduced, 99.9)
    # imshow from -180 to 180, -90 to 90
    plt.imshow(map_reduced, extent=[-180, 180, -90, 90], clim=[0, perc_90], cmap="gray")
