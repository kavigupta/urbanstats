import json
import re

import numpy as np
import pandas as pd

from census_blocks import RADII
from stats_for_shapefile import (
    gpw_stats,
    racial_statistics,
    education_stats,
    generation_stats,
    industry_stats,
    occupation_stats,
    national_origin_stats,
    feature_stats,
    misc_stats,
)
from election_data import vest_elections
from relationship import ordering_idx

from urbanstats.census_2010.columns_2010 import basics_2010, cdc_columns
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.weather.to_blocks import weather_stat_names
from urbanstats.statistics.collections_list import statistic_collections


def ord_or_zero(x):
    return 0 if np.isnan(x) else int(x)


def indices(longname, typ, strict_display=False):
    from create_website import get_index_lists

    lists = get_index_lists()["index_lists"]
    result = []
    result += lists["universal"]
    is_american = longname.endswith("USA")
    if get_index_lists()["type_to_has_gpw"][typ]:
        if not strict_display or not is_american:
            result += lists["gpw"]
    # else:
    if is_american:
        result += lists["usa"]
    return sorted(result)


def create_page_json(
    folder,
    row,
    relationships,
    long_to_short,
    long_to_population,
    long_to_type,
    ordering_for_all_universes,
):
    statistic_names = internal_statistic_names()
    idxs_by_type = indices(row.longname, row.type)
    data = data_files_pb2.Article()
    data.shortname = row.shortname
    data.longname = row.longname
    data.source = row.source
    data.article_type = row.type
    data.universes.extend(row.universes)

    for idx in idxs_by_type:
        stat = statistic_names[idx]
        statrow = data.rows.add()
        statrow.statval = float(row[stat])
        for universe in row.universes:
            ordering = ordering_for_all_universes[universe]
            ordinal_by_type = ordering.ordinal_by_type[row.type].ordinals_by_stat[stat]
            ordinal_overall = ordering.overall_ordinal.ordinals_by_stat[stat]
            statrow.ordinal_by_universe.append(
                ord_or_zero(ordinal_by_type.ordinals.loc[row.longname, 0])
            )
            statrow.overall_ordinal_by_universe.append(
                ord_or_zero(ordinal_overall.ordinals.loc[row.longname, 0])
            )
            statrow.percentile_by_population_by_universe.append(
                float(ordinal_by_type.percentiles_by_population.loc[row.longname])
            )
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

ad = {f"ad_{k}": f"PW Density (r={format_radius(k)})" for k in RADII}


def statistic_internal_to_display_name():
    internal_to_display = {
        "population": "Population",
        **{"ad_1": ad["ad_1"]},
        "sd": "AW Density",
        **basics_2010()[0],
        **gpw_stats,
        "area": "Area",
        "compactness": "Compactness",
        **racial_statistics,
        **national_origin_stats,
        **education_stats,
        **generation_stats,
    }

    for statistic_collection in statistic_collections:
        internal_to_display.update(statistic_collection.name_for_each_statistic())
    internal_to_display.update(
        {
            **cdc_columns(),
            **industry_stats,
            **occupation_stats,
            **election_stats,
            **feature_stats,
            **weather_stat_names,
            **misc_stats,
            **{k: ad[k] for k in ad if k != "ad_1"},
            **basics_2010()[1],
        }
    )

    return internal_to_display


def internal_statistic_names():
    return list(statistic_internal_to_display_name())


def get_statistic_categories():
    ad = {f"ad_{k}": f"other_densities" for k in RADII}
    result = {
        "population": "main",
        **{"ad_1": "main"},
        "sd": "main",
        **{k: "2010" for k in basics_2010()[0]},
        **{
            k: "other_densities"
            if k in ("gpw_pw_density_2", "gpw_pw_density_4")
            else "main"
            for k in gpw_stats
        },
        "area": "main",
        "compactness": "main",
        **{k: "race" for k in racial_statistics},
        **{k: "national_origin" for k in national_origin_stats},
        **{k: "education" for k in education_stats},
        **{k: "generation" for k in generation_stats},
    }

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.category_for_each_statistic())

    result.update(
        {
            **{k: "health" for k in cdc_columns()},
            **{k: "industry" for k in industry_stats},
            **{k: "occupation" for k in occupation_stats},
            **{elect: "election" for elect in election_stats},
            **{k: "feature" for k in feature_stats},
            **{k: "weather" for k in weather_stat_names},
            **{k: "misc" for k in misc_stats},
            **{k: ad[k] for k in ad if k != "ad_1"},
            **{k: "2010" for k in basics_2010()[1]},
        }
    )
    return result


def get_explanation_page():
    result = {
        "population": "population",
        "sd": "density",
        **{f"ad_{k}": f"density" for k in RADII},
        **{k: "2010" for k in basics_2010()[0]},
        **{k: "gpw" for k in gpw_stats},
        "area": "geography",
        "compactness": "geography",
        **{k: "race" for k in racial_statistics},
        **{k: k.split("_")[0] for k in national_origin_stats},
        **{k: "education" for k in education_stats},
        **{k: "generation" for k in generation_stats},
    }

    for statistic_collection in statistic_collections:
        result.update(statistic_collection.explanation_page_for_each_statistic())

    result.update(
        {
            **{k: "health" for k in cdc_columns()},
            **{k: "industry_and_occupation" for k in industry_stats},
            **{k: "industry_and_occupation" for k in occupation_stats},
            **{elect: "election" for elect in election_stats},
            **{
                k: {
                    "park_percent_1km_v2": "park",
                    "within_Hospital_10": "hospital",
                    "mean_dist_Hospital_updated": "hospital",
                    "within_Public School_2": "school",
                    "mean_dist_Public School_updated": "school",
                    "within_Airport_30": "airport",
                    "mean_dist_Airport_updated": "airport",
                    "within_Active Superfund Site_10": "superfund",
                    "mean_dist_Active Superfund Site_updated": "superfund",
                }[k]
                for k in feature_stats
            },
            **{k: "weather" for k in weather_stat_names},
            **{k: k.split("_")[0] for k in misc_stats},
            **{k: "2010" for k in basics_2010()[1]},
        }
    )
    result = {k: result[k] for k in get_statistic_categories()}
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
    "health": dict(name="Health", show_checkbox=True, default=False),
    "industry": dict(name="Industry", show_checkbox=True, default=False),
    "occupation": dict(name="Occupation", show_checkbox=True, default=False),
    "election": dict(name="Election", show_checkbox=True, default=True),
    "feature": dict(name="Proximity to Features", show_checkbox=True, default=False),
    "weather": dict(name="Weather", show_checkbox=True, default=False),
    "misc": dict(name="Miscellaneous", show_checkbox=True, default=False),
    "other_densities": dict(
        name="Other Density Metrics", show_checkbox=True, default=False
    ),
    "2010": dict(name="2010 Census", show_checkbox=True, default=False),
}
