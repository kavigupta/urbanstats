from dataclasses import dataclass

from urbanstats.data.wikipedia.wikidata import query_sparlql
from urbanstats.data.wikipedia.wikidata_sourcer import WikidataSourcer
from urbanstats.geometry.shapefiles.row_functions import UsState, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass
class CityWikidataSourcer(WikidataSourcer):
    version: int = 3

    def columns(self):
        return ["geoid"]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, geoid):
        dashed = query_sparlql("wdt:P774", geoid[:2] + "-" + geoid[2:])
        if dashed:
            return dashed
        return query_sparlql("wdt:P774", geoid)


CITIES = make_shapefile(
    hash_key="census_places_6",
    path="named_region_shapefiles/cb_2022_us_place_500k.zip",
    shortname_extractor=column("NAMELSAD"),
    cleanname_extractor=column("NAME"),
    longname_extractor=column("NAMELSAD") + ", " + UsState(column("STATEFP")) + ", USA",
    additional_columns_computer={"geoid": column("GEOID")},
    filter=lambda x: True,
    meta=dict(type="City", source="Census", type_category="US City"),
    does_overlap_self=False,
    special_data_sources=[
        ("census", "place"),
        "congressional_representatives_indirect",
    ],
    disambiguate_with="counties",
    universe_provider=us_domestic_provider(),
    source_countries=InCountry("USA"),
    abbreviation="CITY",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
    include_in_syau=True,
    wikidata_sourcer=CityWikidataSourcer(),
)
