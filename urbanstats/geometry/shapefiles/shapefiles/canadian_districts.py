from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.universe.universe_provider.constants import canada_domestic_provider

CANADIAN_DISTRICTS = Shapefile(
    hash_key="canadian_districts_2",
    path=lambda: load_canadian_shapefile(
        "named_region_shapefiles/canada/lfed000a21a_e.zip",
        COUNTRIES,
        SUBNATIONAL_REGIONS,
    ),
    shortname_extractor=lambda row: row.FEDENAME,
    longname_extractor=lambda row: row.FEDENAME
    + " (Riding), "
    + pruid_to_province[row["PRUID"]],
    filter=lambda x: True,
    meta=dict(
        type="CA Riding",
        source="StatCan",
        type_category="Political",
    ),
    universe_provider=canada_domestic_provider(),
    subset_masks={"Canada": SelfSubset()},
    abbreviation="RDNG",
)
