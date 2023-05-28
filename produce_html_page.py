import json

import numpy as np

from census_blocks import RADII
from stats_for_shapefile import racial_statistics, housing_stats

row_template = """
<tr $class>
    <td style="width: 31%;">
        <span class="text value">$statname:</span>
    </td>
    <td style="width: 15%;">
        <span class="text value">$statval</span>
    </td>
    <td style="width: 25%;">
        <span class="text ordinal">$ordinal</span>
    </td>
    <td style="width: 17%;">
        <span class="text ordinal">$percentile</span>
    </td>
    <td style="width: 8%;">
        <span class="text ordinal">$ba_within_type</span>
    </td>
    <td style="width: 8%;">
        <span class="text ordinal">$ba_overall</span>
    </td>
</tr>
"""

link_template = """
<li class="linklistel"><a class="button $class" href="$path">$shortname</a></li>
"""


def get_statistic_names():
    ad = {f"ad_{k}": f"PW Density (r={format_radius(k)})" for k in RADII}
    return {
        "population": "Population",
        **{"ad_1": ad["ad_1"]},
        "sd": "AW Density",
        **racial_statistics,
        **housing_stats,
        **{k: ad[k] for k in ad if k != "ad_1"},
    }


def pointer_link(label, name):
    if name is None:
        return f'<span class="button">&nbsp;&nbsp;</span>'
    return f'<a class="button" href="{create_filename(name)}">{label}</a>'


def display_pointers_as_links(current, ptrs):
    prev, next = ptrs[current]
    return pointer_link("<", prev) + " " + pointer_link(">", next)


def create_page_json(
    folder,
    row,
    relationships,
    long_to_short,
    long_to_population,
    long_to_type,
    ptrs_overall,
    ptrs_within_type,
):
    statistic_names = get_statistic_names()
    data = dict(
        shortname=row.shortname,
        longname=row.longname,
        source=row.source,
        rows=[],
    )

    for stat in statistic_names:
        row_text = dict(
            statname=statistic_names[stat],
            statval=float(row[stat]),
            ordinal=0 if np.isnan(row[stat, "ordinal"]) else int(row[stat, "ordinal"]),
            total_in_class=int(row[stat, "total"]),
            row_type=row["type"],
            ba_within_type=ptrs_within_type[stat][row.longname],
            ba_overall=ptrs_overall[stat][row.longname],
        )
        data["rows"].append(row_text)
    to_add = set()
    for relationship_type in relationships:
        to_add.update(relationships[relationship_type].get(row.longname, set()))
    to_add = [x for x in to_add if x in long_to_population]
    to_add = sorted(to_add, key=lambda x: (-long_to_population[x], x))
    data["related"] = [
        dict(longname=x, shortname=long_to_short[x], row_type=long_to_type[x])
        for x in to_add
    ]

    name = create_filename(row.longname)[0:-5] + ".json"
    with open(f"{folder}/{name}", "w") as f:
        json.dump(data, f, indent=2)
    return name


def create_filename(x):
    x = x.replace("/", " slash ")
    return f"{x}.html"


def add_ordinals(frame):
    keys = get_statistic_names()
    frame = frame.copy()
    for k in keys:
        frame[k, "ordinal"] = frame[k].rank(ascending=False)
        frame[k, "total"] = frame[k].shape[0]
    return frame


def format_population(x):
    if x > 1e6:
        return f"{x / 1e6:.1f}m"
    elif x > 1e3:
        return f"{x / 1e3:.1f}k"
    else:
        return f"{x:.0f}"


def format_density(x):
    if x > 10:
        return f"{x:.0f}/km<sup>2</sup>"
    elif x > 1:
        return f"{x:.1f}/km<sup>2</sup>"
    else:
        return f"{x:.2f}/km<sup>2</sup>"


def format_statistic(name, x):
    if name == "population":
        return format_population(x)
    if "%" in get_statistic_names()[name]:
        return f"{x:.2%}"
    if name == "housing_per_pop":
        return f"{x:.3f}"
    return format_density(x)


def format_radius(x):
    if x < 1:
        return f"{x * 1000:.0f}m"
    else:
        assert x == int(x)
        return f"{x:.0f}km"


def render_percentile(pct):
    """
    Take a percentile value like 33.2 and return "33rd percentile".
    """
    if pct != pct:
        return "N/A"
    pct = round(pct)
    if pct % 10 == 1:
        suffix = "st"
    elif pct % 10 == 2:
        suffix = "nd"
    elif pct % 10 == 3:
        suffix = "rd"
    else:
        suffix = "th"
    return f"{pct}{suffix} percentile"


def pluralize(x):
    if x.endswith("y"):
        return x[:-1] + "ies"
    else:
        return x + "s"
