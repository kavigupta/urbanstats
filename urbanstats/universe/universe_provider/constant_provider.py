from dataclasses import dataclass
from typing import List

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class ConstantUniverseProvider(UniverseProvider):
    universes: List[str]

    def relevant_shapefiles(self):
        return []

    def universes_for_shapefile(self, names_by_key, names, table):
        return {longname: self.universes for longname in table.longname}
