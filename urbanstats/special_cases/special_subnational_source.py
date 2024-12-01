from abc import ABC, abstractmethod
from typing import List

import geopandas as gpd


class SpecialSubnationalSource(ABC):
    @abstractmethod
    def replace_subnational_geographies(self, data) -> List[int]:
        pass


# ['N.L.',
#  'P.E.I.',
#  'N.S.',
#  'N.B.',
#  'Que.',
#  'Ont.',
#  'Man.',
#  'Sask.',
#  'Alta.',
#  'B.C.',
#  'Y.T.',
#  'N.W.T.',
#  'Nvt.']

CANADA_EABBR_TO_ISO = {
    "N.L.": "NL",
    "P.E.I.": "PE",
    "N.S.": "NS",
    "N.B.": "NB",
    "Que.": "QC",
    "Ont.": "ON",
    "Man.": "MB",
    "Sask.": "SK",
    "Alta.": "AB",
    "B.C.": "BC",
    "Y.T.": "YT",
    "N.W.T.": "NT",
    "Nvt.": "NU",
}


class USStateSpecialSubnationalSource(SpecialSubnationalSource):
    def replace_subnational_geographies(self, data) -> List[int]:
        usa = gpd.read_file("named_region_shapefiles/cb_2022_us_state_500k.zip")
        data_usa = data[data.ISO_CC == "US"]
        postal_to_geometry = dict(zip(usa.STUSPS, usa.geometry))
        assert set(postal_to_geometry) == set(data_usa.ISO_SUB)
        data.loc[data_usa.index, "geometry"] = data_usa.ISO_SUB.apply(
            lambda x: postal_to_geometry[x]
        )
        return list(data_usa.index)


class CanadianProvinceSpecialSubnationalSource(SpecialSubnationalSource):
    def replace_subnational_geographies(self, data) -> List[int]:
        canada = gpd.read_file(
            "named_region_shapefiles/canada/lpr_000a21a_e.zip"
        ).to_crs("EPSG:4326")
        data_canada = data[data.ISO_CC == "CA"]
        canada["ISO_CAN"] = canada.PREABBR.apply(lambda x: CANADA_EABBR_TO_ISO[x])
        postal_to_geometry = dict(zip(canada.ISO_CAN, canada.geometry))
        assert set(postal_to_geometry) == set(data_canada.ISO_SUB)
        data.loc[data_canada.index, "geometry"] = data_canada.ISO_SUB.apply(
            lambda x: postal_to_geometry[x]
        )
        return list(data_canada.index)


SPECIAL_SUBNATIONAL_SOURCES = [
    USStateSpecialSubnationalSource(),
    CanadianProvinceSpecialSubnationalSource(),
]
