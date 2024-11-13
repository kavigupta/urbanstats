from dataclasses import dataclass
from typing import Tuple

import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_list import get_universe_name_for_state
from urbanstats.universe.universe_provider import INTERNATIONAL_PROVIDER
from urbanstats.universe.universe_provider.contained_within import us_domestic_provider
from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class UrbanCenterStateUniverseProvider(UniverseProvider):
    countries: Tuple[str] = ("US",)

    def hash_key_details(self):
        return self.countries

    def relevant_shapefiles(self):
        return []

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        assert self.countries == ("US",), f"Unexpected countries: {self.countries}"
        result = {}
        for longname, codes in zip(
            shapefile_table.longname, shapefile_table.subnationals_ISO_CODE
        ):
            codes = [code[2:] for code in codes if code.startswith("US")]
            codes = [
                get_universe_name_for_state(us.states.lookup(code)) for code in codes
            ]
            result[longname] = codes
        return result


URBAN_CENTERS = Shapefile(
    hash_key="urban_centers_4",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    additional_columns_to_keep=["subnationals_ISO_CODE"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International"),
    filter=lambda x: True,
    american=False,
    include_in_gpw=True,
    universe_provider=INTERNATIONAL_PROVIDER,
)
URBAN_CENTERS_USA = Shapefile(
    hash_key="us_urban_centers_5",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International"),
    filter=lambda x: "USA" == x.suffix,
    american=True,
    include_in_gpw=False,
    universe_provider=us_domestic_provider(),
)
