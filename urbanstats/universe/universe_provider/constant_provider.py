from dataclasses import dataclass
from typing import List

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class ConstantUniverseProvider(UniverseProvider):
    universes: List[str]

    def hash_key_details(self):
        return tuple(self.universes)

    def relevant_shapefiles(self):
        return []

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        return {longname: self.universes for longname in shapefile_table.longname}
