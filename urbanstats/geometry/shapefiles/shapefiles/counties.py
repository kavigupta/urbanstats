from typing import Protocol

import us

from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


class _CountyRow(Protocol):
    def __getitem__(self, key: str) -> object: ...

    STATEFP: str
    COUNTYFP: str


def county_name(row: _CountyRow) -> str:
    f = row["NAMELSAD"]
    if str(f).lower().endswith("city"):
        f = str(f) + "-County"
    return str(f)


def compute_geoid(row: _CountyRow) -> str:
    return row.STATEFP + row.COUNTYFP


COUNTIES = Shapefile(
    hash_key="census_counties_7",
    path="named_region_shapefiles/cb_2022_us_county_500k.zip",
    shortname_extractor=county_name,
    longname_extractor=lambda x: county_name(x)
    + ", "
    + us.states.lookup(x["STATEFP"]).name
    + ", USA",
    additional_columns_computer={"geoid": compute_geoid},
    filter=lambda x: True,
    meta=dict(type="County", source="Census", type_category="US Subdivision"),
    does_overlap_self=False,
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="COU",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
    include_in_syau=True,
    special_data_sources=["composed_of_counties", ("census", "county")],
    metadata_columns=["geoid"],
    wikidata_sourcer=SimpleWikidataSourcer("wdt:P882", "geoid"),
)
