from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider

ZCTAs = Shapefile(
    hash_key="census_zctas",
    path="named_region_shapefiles/cb_2018_us_zcta510_500k.zip",
    shortname_extractor=lambda x: f"{x.ZCTA5CE10}",
    longname_extractor=lambda x: f"{x.ZCTA5CE10}, USA",
    filter=lambda x: True,
    meta=dict(type="ZIP", source="Census", type_category="Small"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="ZIP",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
    ),
)
