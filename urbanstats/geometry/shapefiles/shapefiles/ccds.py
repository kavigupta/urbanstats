# we want to be pretty explicit about the parameters, so its fine if there is some duplication
# pylint: disable=duplicate-code
from attr import dataclass

from urbanstats.data.wikipedia.wikidata import query_sparlql
from urbanstats.data.wikipedia.wikidata_sourcer import WikidataSourcer
from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Identifiers,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass
class CCDWikidataSourcer(WikidataSourcer):
    def columns(self):
        return ["STATEFP", "COUSUBFP"]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, statefp, cousubfp):
        return query_sparlql("wdt:P774", f"{statefp}-{cousubfp}")


CCDs = Shapefile(
    geometry=Geometry(
        key="census_cousub_9",
        path="named_region_shapefiles/cb_2023_us_cousub_500k.zip",
        filter=lambda x: True,
    ),
    identifiers=Identifiers(
        additional_columns_computer={"geoid": lambda x: x.GEOID},
        intermediate_computation_columns=["STATEFP", "COUSUBFP"],
    ),
    naming=Naming(
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
        cleanname_extractor=lambda x: x.NAME,
    ),
    metadata=Metadata(
        meta=dict(type="CCD", source="Census", type_category="Census"),
        does_overlap_self=False,
        abbreviation="CCD",
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
        ),
        include_in_syau=True,
        wikidata_sourcer=CCDWikidataSourcer(),
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=[
        ("census", "county subdivision"),
        "congressional_representatives_indirect",
    ],
    source_countries=InCountry("USA"),
)
