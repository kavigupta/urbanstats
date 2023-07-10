import json
import re

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
            percentile_by_population=float(row[stat, "percentile_by_population"]),
            row_type=row["type"],
            ba_within_type=ptrs_within_type[stat][row.longname],
            ba_overall=ptrs_overall[stat][row.longname],
        )
        data["rows"].append(row_text)
    to_add = {}
    for relationship_type in relationships:
        for_this = relationships[relationship_type].get(row.longname, set())
        for_this = [x for x in for_this if x in long_to_population]
        for_this = sorted(
            for_this, key=lambda x: order_key_for_relatioships(x, long_to_type[x])
        )
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


def order_key_for_relatioships(longname, typ):
    processed_longname = longname
    if typ == "Historical Congressional District":
        parsed = re.match(r".*[^\d](\d+)[^\d]*Congress", longname)
        end_congress = int(parsed.group(1))
        processed_longname = -end_congress, longname
    return ordering_idx[typ], processed_longname


def create_filename(x):
    x = x.replace("/", " slash ")
    return f"{x}.json"


def compute_ordinals_and_percentiles(
    frame, key_column, population_column, stable_sort_column
):
    key_column = frame[key_column]
    population_column = frame[population_column]
    stable_sort_column = frame[stable_sort_column]
    # ordering: ordinal - 1 -> index
    ordering = sorted(
        frame.index,
        key=lambda i: (
            float("inf") if np.isnan(key_column[i]) else -key_column[i],
            stable_sort_column[i],
        ),
    )
    # ordinals: index -> ordinal
    ordinals = {ind: i + 1 for i, ind in enumerate(ordering)}
    total_pop = population_column.sum()
    # arranged_pop: ordinal - 1 -> population
    arranged_pop = np.array(population_column[ordering])
    # cum_pop: ordinal - 1 -> population of all prior
    cum_pop = np.cumsum(arranged_pop)
    # percentiles_by_population: index -> percentile
    percentiles_by_population = {
        i: 1 - cum_pop[ordinals[i] - 1] / total_pop for i in frame.index
    }
    return ordinals, percentiles_by_population


def add_ordinals(frame):
    keys = get_statistic_names()
    assert len(set(keys)) == len(keys)
    frame = frame.copy()
    frame = frame.reset_index(drop=True)
    for k in keys:
        ordinals, percentiles_by_population = compute_ordinals_and_percentiles(
            frame, k, "population", "longname"
        )
        frame[k, "ordinal"] = [ordinals[i] for i in frame.index]
        frame[k, "total"] = frame[k].shape[0]
        frame[k, "percentile_by_population"] = [
            percentiles_by_population[i] for i in frame.index
        ]
    return frame


def format_radius(x):
    if x < 1:
        return f"{x * 1000:.0f}m"
    else:
        assert x == int(x)
        return f"{x:.0f}km"
