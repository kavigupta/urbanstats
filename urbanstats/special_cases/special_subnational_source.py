from abc import ABC, abstractmethod
from typing import List

import geopandas as gpd


class SpecialSubnationalSource(ABC):
    @abstractmethod
    def replace_subnational_geographies(self, data: gpd.GeoDataFrame) -> List[int]:
        pass


class USStateSpecialSubnationalSource(SpecialSubnationalSource):
    def replace_subnational_geographies(self, data: gpd.GeoDataFrame) -> List[int]:
        usa = gpd.read_file("named_region_shapefiles/cb_2022_us_state_500k.zip")
        data_usa = data[data.ISO_CC == "US"]
        postal_to_geometry = dict(zip(usa.STUSPS, usa.geometry))
        assert set(postal_to_geometry) == set(data_usa.ISO_SUB)
        data.loc[data_usa.index, "geometry"] = data_usa.ISO_SUB.apply(
            lambda x: postal_to_geometry[x]
        )
        return list(data_usa.index)


SPECIAL_SUBNATIONAL_SOURCES = [USStateSpecialSubnationalSource()]
