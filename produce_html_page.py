import json

import numpy as np

from census_blocks import RADII
from stats_for_shapefile import racial_statistics, housing_stats
from election_data import vest_elections
from relationship import ordering_idx


def get_statistic_names():
    ad = {f"ad_{k}": f"PW Density (r={format_radius(k)})" for k in RADII}
    return {
        "population": "Population",
        **{"ad_1": ad["ad_1"]},
        "sd": "AW Density",
        **racial_statistics,
        **housing_stats,
        **{(elect.name, "margin"): elect.name for elect in vest_elections},
        **{k: ad[k] for k in ad if k != "ad_1"},
    }


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
    to_add = {}
    for relationship_type in relationships:
        for_this = relationships[relationship_type].get(row.longname, set())
        for_this = [x for x in for_this if x in long_to_population]
        for_this = sorted(for_this, key=lambda x: (ordering_idx[long_to_type[x]], x))
        for_this = [
            dict(longname=x, shortname=long_to_short[x], row_type=long_to_type[x])
            for x in for_this
        ]
        to_add[relationship_type] = for_this
    data["related"] = to_add

    name = create_filename(row.longname)
    with open(f"{folder}/{name}", "w") as f:
        json.dump(data, f, indent=2)
    return name


def create_filename(x):
    x = x.replace("/", " slash ")
    return f"{x}.json"


def add_ordinals(frame):
    keys = get_statistic_names()
    frame = frame.copy()
    for k in keys:
        frame[k, "ordinal"] = frame[k].rank(ascending=False)
        frame[k, "total"] = frame[k].shape[0]
    return frame


def format_radius(x):
    if x < 1:
        return f"{x * 1000:.0f}m"
    else:
        assert x == int(x)
        return f"{x:.0f}km"
