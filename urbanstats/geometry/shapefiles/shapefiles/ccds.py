from urbanstats.data.wikipedia.county_wikipedia import search_wikidata_by_fips
from urbanstats.data.wikipedia.wikidata import query_sparlql, wikidata_to_wikipage
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def wikidata_entry(row):
    s = row.STATEFP + "-" + row.COUSUBFP
    return query_sparlql("wdt:P774", s)


CCDs = Shapefile(
    hash_key="census_cousub_8",
    path="named_region_shapefiles/cb_2022_us_cousub_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
    additional_columns_computer={
        "geoid": lambda x: x.GEOID,
        "wikidata": wikidata_entry,
        "wikipedia_page": lambda row: wikidata_to_wikipage(wikidata_entry(row)),
    },
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
)
