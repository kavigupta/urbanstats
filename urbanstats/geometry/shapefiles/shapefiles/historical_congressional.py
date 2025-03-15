import functools
import pickle
from functools import lru_cache

import numpy as np

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.districts import load_shapefile
from urbanstats.universe.universe_provider.constants import us_domestic_provider

decades = range(1780, 2010 + 1, 10)


def to_year(congress_number):
    congress_number_zero_indexed = congress_number - 1
    year_congress_start = 1789  # 1st Congress started in 1789
    return congress_number_zero_indexed * 2 + year_congress_start


def start_of_decade(decade):
    # 1st congress started in 1789; so 1787 is the 0th,
    # 1785 is the -1st, and 1783 (the "first" congress of the decade) is the -2nd
    return (decade - 1780) // 2 - 2


def end_of_decade(decade):
    return start_of_decade(decade) + 4


@lru_cache(maxsize=None)
def all_districts():
    with open(
        "named_region_shapefiles/congressional_districts/combo/historical.pkl", "rb"
    ) as f:
        return pickle.load(f)


def filter_for_decade(decade):
    table = all_districts()
    start = start_of_decade(decade)
    end = end_of_decade(decade)
    filt = table[(table.start <= end) & (table.end >= start)]
    filt = filt.copy()
    filt.start = np.maximum(filt.start, start)
    filt.end = np.minimum(filt.end, end)
    return filt


def historical_shortname(x):
    if "start" in x:
        year = to_year(x.start)
    else:
        year = x.start_date
    district = int(x["district"])
    if district == -1:
        district = "NA"
    elif district == 0:
        district = "AL"
    else:
        district = f"{district:02d}"
    return f'{x["state"]}-{district} ({year})'


version_for_decade = {"default": 0.2}

HISTORICAL_CONGRESSIONALs = {
    f"historical_congressional_{decade}": Shapefile(
        hash_key=f"historical_congressional_{decade}_{version_for_decade.get(decade, version_for_decade['default'])}",
        path=functools.partial(filter_for_decade, decade),
        shortname_extractor=historical_shortname,
        longname_extractor=lambda x: historical_shortname(x) + ", USA",
        filter=lambda x: True,
        meta=dict(
            type=f"Congressional District ({decade}s)",
            source="UCLA",
            type_category="Political",
        ),
        abbreviation="CONG",
        universe_provider=us_domestic_provider(),
        subset_masks={"USA": SelfSubset()},
        data_credit=dict(
            text="We adapt Jeffrey B. Lewis, Brandon DeVine, and Lincoln Pritcher with Kenneth C. Martis"
            " to unclip the coastlines.",
            linkText="Explanation of unclipping, and changes",
            link="https://github.com/kavigupta/historical-congressional-unclipped",
        ),
    )
    for decade in decades
}

HISTORICAL_CONGRESSIONALs["historical_congressional_2020"] = Shapefile(
    hash_key=f"historical_congressional_2020_1",
    path=lambda: load_shapefile("cd118", only_keep="past"),
    shortname_extractor=historical_shortname,
    longname_extractor=lambda x: historical_shortname(x) + ", USA",
    filter=lambda x: True,
    meta=dict(
        type="Congressional District (2020s)",
        source="Census",
        type_category="Political",
    ),
    abbreviation="CONG",
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    data_credit=dict(
        text="2020s data is from the US Census Bureau.",
        linkText="US Census",
        link="https://www2.census.gov/geo/tiger/TIGER2020/CD/",
    ),
)
