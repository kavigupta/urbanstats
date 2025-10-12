from attr import dataclass

from urbanstats.data.wikipedia.wikidata import query_sparlql
from urbanstats.data.wikipedia.wikidata_sourcer import WikidataSourcer
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass
class CCDWikidataSourcer(WikidataSourcer):
    def columns(self):
        return ["STATEFP", "COUSUBFP"]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, statefp, cousubfp):
        return query_sparlql("wdt:P774", f"{statefp}-{cousubfp}")


CCDs = Shapefile(
    hash_key="census_cousub_8",
    path="named_region_shapefiles/cb_2022_us_cousub_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
    additional_columns_computer={"geoid": lambda x: x.GEOID},
    filter=lambda x: True,
    meta=dict(type="CCD", source="Census", type_category="Census"),
    does_overlap_self=False,
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="CCD",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
    include_in_syau=True,
    metadata_columns=["geoid"],
    additional_columns_to_keep=["STATEFP", "COUSUBFP"],
    wikidata_sourcer=CCDWikidataSourcer(),
)
