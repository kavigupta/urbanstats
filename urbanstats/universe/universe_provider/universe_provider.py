from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Tuple

import us

from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    province_abbr_to_province,
)
from urbanstats.special_cases.ghsl_urban_center import compute_subnational_suffixes
from urbanstats.universe.universe_list import get_universe_name_for_state


class UniverseProvider(ABC):
    """
    Represents a provider of universe data.
    """

    @abstractmethod
    def relevant_shapefiles(self):
        """
        Returns a list of shapefile keys that are relevant to this universe provider
        """

    @abstractmethod
    def universes_for_shapefile(self, names_by_key, names, table):
        """
        Returns a dictionary mapping longnames to universes for a given shapefile

        :param names_by_key: The Names of each of the relevant shapefiles
        :param names: The Names of the shapefile to compute universes for
        :param table: Its names and identifier columns
        """


@dataclass
class UrbanCenterlikeStateUniverseProvider(UniverseProvider):
    suffixes: Any  # SubnationalSuffixes, which has the subnational regions of each region
    countries: Tuple[str] = ("US", "CA")

    def relevant_shapefiles(self):
        return []

    def process_code(self, code):
        """
        Processes a code to return a universe name.
        """
        if code.startswith("US"):
            return get_universe_name_for_state(us.states.lookup(code[2:]))
        if code.startswith("CA"):
            return province_abbr_to_province[code[2:]]
        return None

    def universes_for_shapefile(self, names_by_key, names, table):
        assert self.countries == ("US", "CA"), f"Unexpected countries: {self.countries}"
        result = {}
        computed = compute_subnational_suffixes(self.suffixes, names.geometry)
        codes_by_row = computed.subnationals_ISO_CODE.loc[table.index]
        for longname, codes in zip(table.longname, codes_by_row):
            codes = [self.process_code(code) for code in codes]
            codes = [code for code in codes if code is not None]
            result[longname] = codes
        return result
