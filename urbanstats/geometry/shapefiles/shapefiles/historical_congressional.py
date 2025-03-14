from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def render_ordinal(x):
    if x % 100 in {11, 12, 13}:
        return f"{x}th"
    if x % 10 == 1:
        return f"{x}st"
    if x % 10 == 2:
        return f"{x}nd"
    if x % 10 == 3:
        return f"{x}rd"
    return f"{x}th"


def render_start_and_end(row):
    start, end = row.start, row.end
    if start == end:
        return f"{render_ordinal(start)}"
    return f"{render_ordinal(start)}-{render_ordinal(end)}"


HISTORICAL_CONGRESSIONAL = Shapefile(
    hash_key="historical_congressional_5",
    path="named_region_shapefiles/congressional_districts/combo/historical.pkl",
    shortname_extractor=lambda x: f'{x["state"]}-{int(x["district"]):02d} [{render_start_and_end(x)} Congress]',
    longname_extractor=lambda x: "Historical Congressional District"
    + f" {x['state']}-{x['district']}, {render_start_and_end(x)} Congress, USA",
    filter=lambda x: True,
    meta=dict(
        type="Historical Congressional District",
        source="Census",
        type_category="Political",
    ),
    chunk_size=100,
    universe_provider=us_domestic_provider(),
    abbreviation="CONG",
    subset_masks={"USA": SelfSubset()},
    data_credit=dict(
        text="We adapt Jeffrey B. Lewis, Brandon DeVine, and Lincoln Pritcher with Kenneth C. Martis"
        " to unclip the coastlines.",
        linkText="Explanation of unclipping, and changes",
        link="https://github.com/kavigupta/historical-congressional-unclipped",
    ),
)
