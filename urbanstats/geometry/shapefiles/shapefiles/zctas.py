from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.universe.universe_provider.constants import us_domestic_provider

ZCTAs = Shapefile(
    hash_key="census_zctas",
    path="named_region_shapefiles/cb_2018_us_zcta510_500k.zip",
    shortname_extractor=lambda x: f"{x.ZCTA5CE10}",
    longname_extractor=lambda x: f"{x.ZCTA5CE10}, USA",
    filter=lambda x: True,
    meta=dict(type="ZIP", source="Census", type_category="Small"),
    universe_provider=us_domestic_provider(),
)
