from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Tuple

import us

from urbanstats.universe.universe_list import get_universe_name_for_state
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    province_abbr_to_province,
)


class UniverseProvider(ABC):
    """
    Represents a provider of universe data.
    """

    def hash_key(self):
        """
        Returns a hash key for this provider
        """
        return (self.__class__.__name__, self.hash_key_details())

    @abstractmethod
    def hash_key_details(self):
        """
        Returns a hash key for this provider. Does not include the class name.
        """

    @abstractmethod
    def relevant_shapefiles(self):
        """
        Returns a list of shapefile keys that are relevant to this universe provider
        """

    @abstractmethod
    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        """
        Returns a dictionary mapping longnames to universes for a given shapefile

        :param shapefiles: A dictionary of shapefiles, mapping relevant shapefile keys to shapefiles
        :param shapefile: The shapefile to compute universes for
        :param shapefile_table: The table of the shapefile
        """


@dataclass
class UrbanCenterlikeStateUniverseProvider(UniverseProvider):
    countries: Tuple[str] = ("US", "CA")

    def hash_key_details(self):
        return self.countries

    def relevant_shapefiles(self):
        return []

    def process_code(self, code):
        """
        Processes a code to return a universe name.
        """
        if code.startswith("US"):
            return get_universe_name_for_state(us.states.lookup(code[2:]))
        elif code.startswith("CA"):
            return province_abbr_to_province[code[2:]]
        else:
            return None

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        assert self.countries == ("US",), f"Unexpected countries: {self.countries}"
        result = {}
        for longname, codes in zip(
            shapefile_table.longname, shapefile_table.subnationals_ISO_CODE
        ):
            codes = [self.process_code(code) for code in codes]
            codes = [code for code in codes if code is not None]
            result[longname] = codes
        return result
