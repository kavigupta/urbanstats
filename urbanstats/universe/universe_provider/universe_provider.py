from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Tuple

import us

from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    province_abbr_to_province,
)
from urbanstats.universe.universe_list import get_universe_name_for_state

if TYPE_CHECKING:
    from urbanstats.geometry.shapefiles.shapefile import Shapefile, ShapefileTable


class UniverseProvider(ABC):
    """
    Represents a provider of universe data.
    """

    def hash_key(self) -> tuple[str, Tuple[str, ...]]:
        """
        Returns a hash key for this provider
        """
        return (self.__class__.__name__, self.hash_key_details())

    @abstractmethod
    def hash_key_details(self) -> Tuple[str, ...]:
        """
        Returns a hash key for this provider. Does not include the class name.
        """

    @abstractmethod
    def relevant_shapefiles(self) -> list[str]:
        """
        Returns a list of shapefile keys that are relevant to this universe provider
        """

    @abstractmethod
    def universes_for_shapefile(
        self,
        shapefiles: dict[str, "Shapefile"],
        shapefile: "Shapefile",
        shapefile_table: "ShapefileTable",
    ) -> dict[str, list[str]]:
        """
        Returns a dictionary mapping longnames to universes for a given shapefile

        :param shapefiles: A dictionary of shapefiles, mapping relevant shapefile keys to shapefiles
        :param shapefile: The shapefile to compute universes for
        :param shapefile_table: The table of the shapefile
        """


@dataclass
class UrbanCenterlikeStateUniverseProvider(UniverseProvider):
    countries: Tuple[str, ...] = ("US", "CA")

    def hash_key_details(self) -> Tuple[str, ...]:
        return self.countries

    def relevant_shapefiles(self) -> list[str]:
        return []

    def process_code(self, code: str) -> str | None:
        """
        Processes a code to return a universe name.
        """
        if code.startswith("US"):
            return get_universe_name_for_state(us.states.lookup(code[2:]))
        if code.startswith("CA"):
            return province_abbr_to_province[code[2:]]
        return None

    def universes_for_shapefile(
        self,
        shapefiles: dict[str, "Shapefile"],
        shapefile: "Shapefile",
        shapefile_table: "ShapefileTable",
    ) -> dict[str, list[str]]:
        assert self.countries == ("US", "CA"), f"Unexpected countries: {self.countries}"
        result = {}
        for longname, codes in zip(
            shapefile_table.longname, shapefile_table.subnationals_ISO_CODE
        ):
            codes = [self.process_code(code) for code in codes]
            codes = [code for code in codes if code is not None]
            result[longname] = codes
        return result
