from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.universe.universe_provider.constants import us_domestic_provider

CCDs = Shapefile(
    hash_key="census_cousub_8",
    path="named_region_shapefiles/cb_2022_us_cousub_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
    filter=lambda x: True,
    meta=dict(type="CCD", source="Census", type_category="Census"),
    universe_provider=us_domestic_provider(),
)
