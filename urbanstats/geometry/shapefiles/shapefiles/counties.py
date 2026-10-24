from dataclasses import dataclass

from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.row_functions import RowFunction, UsState, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass(frozen=True)
class CountyName(RowFunction):
    """NAMELSAD, with independent cities' names, like "Baltimore city", ending in -County."""

    def __call__(self, row):
        f = row["NAMELSAD"]
        if f.lower().endswith("city"):
            f = f + "-County"
        return f


COUNTIES = make_shapefile(
    geometry_key="census_counties_7",
    path="named_region_shapefiles/cb_2022_us_county_500k.zip",
    shortname_extractor=CountyName(),
    cleanname_extractor=column("NAME"),
    longname_extractor=CountyName() + ", " + UsState(column("STATEFP")) + ", USA",
    additional_columns_computer={"geoid": column("STATEFP") + column("COUNTYFP")},
    filter=lambda x: True,
    meta=dict(type="County", source="Census", type_category="US Subdivision"),
    does_overlap_self=False,
    universe_provider=us_domestic_provider(),
    source_countries=InCountry("USA"),
    abbreviation="COU",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
    include_in_syau=True,
    special_data_sources=[
        "composed_of_counties",
        ("census", "county"),
        "congressional_representatives_indirect",
    ],
    wikidata_sourcer=SimpleWikidataSourcer("wdt:P882", "geoid"),
)
