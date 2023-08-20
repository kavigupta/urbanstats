import json
import re

import numpy as np
import pandas as pd

from census_blocks import RADII
from stats_for_shapefile import (
    racial_statistics,
    housing_stats,
    education_stats,
    generation_stats,
    income_stats,
    transportation_stats,
    national_origin_stats,
    feature_stats,
    misc_stats,
)
from election_data import vest_elections
from relationship import ordering_idx

from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip


def create_page_json(
    folder,
    row,
    relationships,
    long_to_short,
    long_to_population,
    long_to_type,
):
    statistic_names = get_statistic_names()
    data = data_files_pb2.Article()
    data.shortname = row.shortname
    data.longname = row.longname
    data.source = row.source
    data.article_type = row.type

    for stat in statistic_names:
        statrow = data.rows.add()
        statrow.statval = float(row[stat])
        statrow.ordinal = (
            0 if np.isnan(row[stat, "ordinal"]) else int(row[stat, "ordinal"])
        )
        statrow.overall_ordinal = (
            0
            if np.isnan(row[stat, "overall_ordinal"])
            else int(row[stat, "overall_ordinal"])
        )
        statrow.percentile_by_population = float(row[stat, "percentile_by_population"])
    for relationship_type in relationships:
        for_this = relationships[relationship_type].get(row.longname, set())
        for_this = [x for x in for_this if x in long_to_population]
        for_this = sorted(
            for_this, key=lambda x: order_key_for_relatioships(x, long_to_type[x])
        )
        # add to map with key relationship_type
        related_buttons = data.related.add()
        related_buttons.relationship_type = relationship_type
        for x in for_this:
            related_button = related_buttons.buttons.add()
            related_button.longname = x
            related_button.shortname = long_to_short[x]
            related_button.row_type = long_to_type[x]

    name = create_filename(row.longname, "gz")
    write_gzip(data, f"{folder}/{name}")
    return name


def order_key_for_relatioships(longname, typ):
    processed_longname = longname
    if typ == "Historical Congressional District":
        parsed = re.match(r".*[^\d](\d+)[^\d]*Congress", longname)
        end_congress = int(parsed.group(1))
        processed_longname = -end_congress, longname
    return ordering_idx[typ], processed_longname


def create_filename(x, ext):
    x = x.replace("/", " slash ")
    return f"{x}." + ext


def compute_ordinals_and_percentiles(
    frame, key_column, population_column, stable_sort_column, *, just_ordinal
):
    key_column_name = key_column
    ordering = (
        frame[[stable_sort_column, key_column_name]]
        .fillna(-float("inf"))
        .sort_values(stable_sort_column)
        .sort_values(key_column_name, ascending=False, kind="stable")
        .index
    )
    # ordinals: index -> ordinal
    ordinals = np.array(
        pd.Series(np.arange(1, frame.shape[0] + 1), index=ordering)[frame.index]
    )
    if just_ordinal:
        return ordinals, None
    total_pop = frame[population_column].sum()
    # arranged_pop: ordinal - 1 -> population
    arranged_pop = np.array(frame[population_column][ordering])
    # cum_pop: ordinal - 1 -> population of all prior
    cum_pop = np.cumsum(arranged_pop)
    # percentiles_by_population: index -> percentile
    percentiles_by_population = 1 - cum_pop[ordinals - 1] / total_pop
    return ordinals, percentiles_by_population


def add_ordinals(frame, *, overall_ordinal):
    keys = get_statistic_names()
    assert len(set(keys)) == len(keys)
    frame = frame.copy()
    frame = frame.reset_index(drop=True)
    for k in keys:
        ordinals, percentiles_by_population = compute_ordinals_and_percentiles(
            frame, k, "population", "longname", just_ordinal=overall_ordinal
        )
        frame[k, "overall_ordinal" if overall_ordinal else "ordinal"] = ordinals
        if overall_ordinal:
            continue
        frame[k, "total"] = frame[k].shape[0]
        frame[k, "percentile_by_population"] = percentiles_by_population
    return frame


def format_radius(x):
    if x < 1:
        return f"{x * 1000:.0f}m"
    else:
        assert x == int(x)
        return f"{x:.0f}km"


election_stats = {
    **{(elect.name, "margin"): elect.name for elect in vest_elections},
    ("2016-2020 Swing", "margin"): "2016-2020 Swing",
}


def get_statistic_names():
    ad = {f"ad_{k}": f"PW Density (r={format_radius(k)})" for k in RADII}
    return {
        "population": "Population",
        **{"ad_1": ad["ad_1"]},
        "sd": "AW Density",
        "area": "Area",
        "compactness": "Compactness",
        **racial_statistics,
        **national_origin_stats,
        **education_stats,
        **generation_stats,
        **income_stats,
        **housing_stats,
        **transportation_stats,
        **election_stats,
        **feature_stats,
        **misc_stats,
        **{k: ad[k] for k in ad if k != "ad_1"},
    }


def get_statistic_categories():
    ad = {f"ad_{k}": f"other_densities" for k in RADII}
    result = {
        "population": "main",
        **{"ad_1": "main"},
        "sd": "main",
        "area": "main",
        "compactness": "main",
        **{k: "race" for k in racial_statistics},
        **{k: "national_origin" for k in national_origin_stats},
        **{k: "education" for k in education_stats},
        **{k: "generation" for k in generation_stats},
        **{k: "income" for k in income_stats},
        **{k: "housing" for k in housing_stats},
        **{k: "transportation" for k in transportation_stats},
        **{elect: "election" for elect in election_stats},
        **{k: "feature" for k in feature_stats},
        **{k: "misc" for k in misc_stats},
        **{k: ad[k] for k in ad if k != "ad_1"},
    }
    return result


category_metadata = {
    "main": dict(name="Main", show_checkbox=False, default=True),
    "race": dict(name="Race", show_checkbox=True, default=True),
    "national_origin": dict(name="National Origin", show_checkbox=True, default=False),
    "education": dict(name="Education", show_checkbox=True, default=False),
    "generation": dict(name="Generation", show_checkbox=True, default=False),
    "income": dict(name="Income", show_checkbox=True, default=False),
    "housing": dict(name="Housing", show_checkbox=True, default=False),
    "transportation": dict(name="Transportation", show_checkbox=True, default=False),
    "election": dict(name="Election", show_checkbox=True, default=True),
    "feature": dict(name="Proximity to Features", show_checkbox=True, default=False),
    "misc": dict(name="Miscellaneous", show_checkbox=True, default=False),
    "other_densities": dict(
        name="Other Density Metrics", show_checkbox=True, default=False
    ),
}
