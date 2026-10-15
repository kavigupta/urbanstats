# we want to be pretty explicit about the parameters, so its fine if there is some duplication
# pylint: disable=duplicate-code
from attr import dataclass

from urbanstats.data.wikipedia.wikidata import query_sparlql
from urbanstats.data.wikipedia.wikidata_sourcer import WikidataSourcer
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass
class CCDWikidataSourcer(WikidataSourcer):
    def columns(self):
        return ["STATEFP", "COUSUBFP"]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, statefp, cousubfp):
        return query_sparlql("wdt:P774", f"{statefp}-{cousubfp}")


CCDs = make_shapefile(
    hash_key="census_cousub_9",
    path="named_region_shapefiles/cb_2023_us_cousub_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    cleanname_extractor=lambda x: x.NAME,
    longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
    additional_columns_computer={"geoid": lambda x: x.GEOID},
    filter=lambda x: True,
    meta=dict(type="CCD", source="Census", type_category="Census"),
    does_overlap_self=False,
    special_data_sources=[
        ("census", "county subdivision"),
        "congressional_representatives_indirect",
    ],
    universe_provider=us_domestic_provider(),
    source_countries=InCountry("USA"),
    abbreviation="CCD",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
    include_in_syau=True,
    intermediate_computation_columns=["STATEFP", "COUSUBFP"],
    wikidata_sourcer=CCDWikidataSourcer(),
)
