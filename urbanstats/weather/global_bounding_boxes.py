from permacache import permacache

chunk = 360 * 4

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from urbanstats.data.gpw import (
    lat_from_row_idx,
    load_full_ghs_30_arcsec,
    lon_from_col_idx,
)


def produce_all_bounding_boxes():
    mask = load_full_ghs_30_arcsec() > 0
    rows, cols = mask.shape
    for i in range(0, rows, chunk):
        for j in range(0, cols, chunk):
            if mask[i : i + chunk, j : j + chunk].any():
                yield coords(i, j, mask, resolution=120)


def coords(i, j, mask, resolution):
    i, j, i_end, j_end = clip(i, j, i + chunk, j + chunk, mask)
    lon_min = lon_from_col_idx(j, resolution)
    lon_max = lon_from_col_idx(j_end, resolution)
    lat_max = lat_from_row_idx(i, resolution)
    lat_min = lat_from_row_idx(i_end, resolution)
    return (lon_min, lat_min, lon_max, lat_max)


def clip(i, j, i_end, j_end, mask):
    """
    Clip the given start and end to values where mask[x,y] is True
    """
    if mask.all():
        return i, j, i_end, j_end
    mask_piece = mask[i:i_end, j:j_end]
    row_any = mask_piece.any(axis=1)
    col_any = mask_piece.any(axis=0)
    if not row_any.all():
        i = i + row_any.argmax()
        i_end = i_end - row_any[::-1].argmax()
    if not col_any.all():
        j = j + col_any.argmax()
        j_end = j_end - col_any[::-1].argmax()
    return i, j, i_end, j_end


@permacache("urbanstats/weather/global_bounding_boxes_5", multiprocess_safe=True)
def global_bounding_boxes():
    return list(produce_all_bounding_boxes())


def plot_bounding_boxes():
    _, ax = plt.subplots(figsize=(10, 5))
    for box in global_bounding_boxes():
        lon_min, lat_min, lon_max, lat_max = box
        ax.add_patch(
            Rectangle(
                (lon_min, lat_min),
                lon_max - lon_min,
                lat_max - lat_min,
                fill="red",
                alpha=0.5,
                edgecolor="black",
            )
        )
    plt.xlim(-180, 180)
    plt.ylim(-90, 90)
    # turn off the axes
    ax.axis("off")
    plt.show()
