import us

from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def county_name(row):
    f = row["NAMELSAD"]
    if f.lower().endswith("city"):
        f = f + "-County"
    return f


def compute_geoid(row):
    return row.STATEFP + row.COUNTYFP


COUNTIES = make_shapefile(
    hash_key="census_counties_7",
    path="named_region_shapefiles/cb_2022_us_county_500k.zip",
    shortname_extractor=county_name,
    cleanname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: county_name(x)
    + ", "
    + us.states.lookup(x["STATEFP"]).name
    + ", USA",
    additional_columns_computer={"geoid": compute_geoid},
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
