from dataclasses import dataclass
from typing import Tuple

import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_list import get_universe_name_for_state
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
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
    hash_key="urban_centers_5",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    additional_columns_to_keep=["subnationals_ISO_CODE"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International"),
    filter=lambda x: True,
    special_data_sources=["international_gridded_data"],
    universe_provider=CombinedUniverseProvider(
        [*INTERNATIONAL_PROVIDERS, UrbanCenterStateUniverseProvider()]
    ),
    subset_masks={
        "USA": FilteringSubset("US Urban Center", lambda x: "USA" == x.suffix),
        "Canada": FilteringSubset("CA Urban Center", lambda x: "Canada" == x.suffix),
    },
)
