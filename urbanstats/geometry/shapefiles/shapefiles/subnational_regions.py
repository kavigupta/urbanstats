from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.country import subnational_regions
from urbanstats.universe.universe_provider.constants import (
    INTERNATIONAL_PROVIDER,
    us_domestic_provider,
)

SUBNATIONAL_REGIONS = Shapefile(
    hash_key="subnational_regions_10",
    path=subnational_regions,
    shortname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: x["fullname"],
    filter=lambda x: x.COUNTRY is not None,
    meta=dict(type="Subnational Region", source="ESRI", type_category="US Subdivision"),
    american=False,
    include_in_gpw=True,
    universe_provider=INTERNATIONAL_PROVIDER,
)
STATES_USA = Shapefile(
    hash_key="census_states_3",
    path="named_region_shapefiles/cb_2022_us_state_500k.zip",
    shortname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: x["NAME"] + ", USA",
    filter=lambda x: True,
    meta=dict(type="State", source="Census", type_category="US Subdivision"),
    universe_provider=us_domestic_provider(),
)
