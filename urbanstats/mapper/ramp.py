import json
import os

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np


def get_pyplot_ramps():
    pyplot_ramps = {}
    for ramp_name in plt.colormaps():
        if ramp_name.endswith("_r"):
            continue
        if ramp_name in ["flag", "prism"]:
            # cyclic colormaps
            continue
        ramp_obj = mpl.cm.get_cmap(ramp_name)
        if isinstance(ramp_obj, mpl.colors.ListedColormap):
            continue
        assert isinstance(ramp_obj, mpl.colors.LinearSegmentedColormap)
        ramp_name = ramp_name[0].upper() + ramp_name[1:]
        pyplot_ramps[ramp_name] = ramp_obj_to_list(ramp_obj)

    pyplot_ramps = {
        k: v for k, v in sorted(pyplot_ramps.items(), key=lambda x: x[0].lower())
    }
    return pyplot_ramps


def get_all_ramps():
    all_ramps = {}
    all_ramps.update(get_pyplot_ramps())
    return all_ramps


def ramp_obj_to_list(ramp_obj):
    """
    Converts a matplotlib colormap object to a list of tuples of the form
    (float, (int, int, int, int))

    The float is the position in the colormap, and the tuple is the RGBA value
    at that position.
    """
    assert isinstance(ramp_obj, mpl.colors.LinearSegmentedColormap)

    if callable(ramp_obj._segmentdata["red"]) or len(ramp_obj._segmentdata["red"]) < 10:
        xs = np.linspace(0, 1, 50).tolist()
    else:
        xs = sorted(
            {x for segment in ramp_obj._segmentdata.values() for x, _, _ in segment}
        )
    # pylint: disable=consider-using-f-string
    return [
        (x, "#%02x%02x%02x" % tuple(int(255 * y) for y in ramp_obj(x))[:-1]) for x in xs
    ]


def interpolate_ramp(ramp, relative_pos):
    positions_each = np.array([x for x, _ in ramp])
    relative_pos = (
        relative_pos * (positions_each[-1] - positions_each[0]) + positions_each[0]
    )
    i = np.searchsorted(positions_each, relative_pos)
    if i == 0:
        return ramp[0][1]
    if i == len(ramp):
        return ramp[-1][1]
    x1, y1 = ramp[i - 1]
    x2, y2 = ramp[i]
    y1, y2 = np.array(
        [[int(y[1:][a:b], 16) for a, b in [(0, 2), (2, 4), (4, 6)]] for y in [y1, y2]]
    )
    # pylint: disable=consider-using-f-string
    return "#%02x%02x%02x" % tuple(
        ((y1 * (x2 - relative_pos) + y2 * (relative_pos - x1)) / (x2 - x1)).astype(
            np.int
        )
    )


def plot_ramp(y, ramp, segments=101):
    xs = np.linspace(0, 1, segments)
    colors = [interpolate_ramp(ramp, x) for x in xs]
    plt.scatter(xs, [y for _ in colors], c=colors, s=100)


def output_ramps():
    mapper_folder = "react/src/data/mapper"
    try:
        os.makedirs(mapper_folder)
    except FileExistsError:
        pass
    with open(f"{mapper_folder}/ramps.json", "w") as f:
        json.dump(get_all_ramps(), f)
