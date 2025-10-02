import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

from ..utils import output_typescript


def get_pyplot_ramps():
    pyplot_ramps = {}
    for ramp_name in plt.colormaps():
        cat = categorize_ramp(ramp_name)
        if cat is None:
            continue

        ramp_obj = mpl.cm.get_cmap(ramp_name)
        ramp_name_disp = capitalizeEachWord(ramp_name.replace("_", " "))
        pyplot_ramps[ramp_name_disp] = dict(
            ramp=ramp_obj_to_list(ramp_obj), metadata=cat
        )

    pyplot_ramps = dict(
        sorted(
            pyplot_ramps.items(),
            key=lambda item: item[1]["metadata"]["priority"],
        )
    )

    return pyplot_ramps


def capitalizeEachWord(s):
    """
    Capitalizes the first letter of each word in a string.
    """
    return " ".join(word[0].upper() + word[1:] for word in s.split())


def categorize_ramp(ramp_name):
    """
    Return a ramp category, either a dict or None (which indicates that the ramp should be skipped).
    """
    if ramp_name.endswith("_r"):
        return None
    if ramp_name in ["flag", "prism", "hsv"]:
        # cyclic colormaps
        return None
    if ramp_name in [
        "PiYG",
        "PRGn",
        "BrBG",
        "PuOr",
        "RdGy",
        "RdBu",
        "RdYlBu",
        "RdYlGn",
        "Spectral",
        "coolwarm",
        "bwr",
        "seismic",
        "berlin",
        "managua",
        "vanimo",
    ]:
        # Diverging colormaps
        return dict(priority=10, diverging=True)
    if ramp_name in [
        "brg",
        "Blues",
        "BuGn",
        "BuPu",
        "GnBu",
        "Gray",
        "Greens",
        "Greys",
        "OrRd",
        "Oranges",
        "PuBu",
        "PuBuGn",
        "PuRd",
        "Purples",
        "RdPu",
        "Reds",
        "YlGn",
        "YlGnBu",
        "YlOrBr",
        "YlOrRd",
        "Pink",
        "Gray",
        "Rainbow",
        "Spring",
        "Summer",
        "Terrain",
        "Winter",
    ]:
        # ramps that are unnamed (name only composed of color names)
        return dict(priority=5, diverging=False)
    if ramp_name in [
        "Pastel1",
        "Pastel2",
        "Paired",
        "Accent",
        "Dark2",
        "Set1",
        "Set2",
        "Set3",
        "tab10",
        "tab20",
        "tab20b",
        "tab20c",
    ]:
        # qualitative colormaps
        return None
    return dict(priority=0, diverging=False)


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
    # pylint: disable=protected-access
    if isinstance(ramp_obj, mpl.colors.LinearSegmentedColormap):
        if callable(ramp_obj._segmentdata["red"]):
            xs = np.linspace(0, 1, 50).tolist()
        else:
            xs = sorted(
                {x for segment in ramp_obj._segmentdata.values() for x, _, _ in segment}
            )
    else:
        assert isinstance(ramp_obj, mpl.colors.ListedColormap)
        xs = np.linspace(0, 1, len(ramp_obj.colors)).tolist()
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
            np.int64
        )
    )


# vulture: ignore -- used in notebooks
def plot_ramp(y, ramp, segments=101):
    xs = np.linspace(0, 1, segments)
    colors = [interpolate_ramp(ramp, x) for x in xs]
    plt.scatter(xs, [y for _ in colors], c=colors, s=100)


def output_ramps(mapper_folder):
    with open(f"{mapper_folder}/ramps.ts", "w") as f:
        output_typescript(
            get_all_ramps(),
            f,
            "Record<string, {ramp: [number, string][], metadata: {priority: number, diverging?: boolean}}>",
        )
