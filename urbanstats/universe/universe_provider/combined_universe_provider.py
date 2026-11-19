from dataclasses import dataclass
from typing import List

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class CombinedUniverseProvider(UniverseProvider):
    providers: List[UniverseProvider]

    def relevant_shapefiles(self):
        return sorted(
            {
                shapefile
                for provider in self.providers
                for shapefile in provider.relevant_shapefiles()
            }
        )

    def universes_for_shapefile(self, names_by_key, names, table):
        result = {longname: [] for longname in table.longname}
        for provider in self.providers:
            universes = provider.universes_for_shapefile(names_by_key, names, table)
            for longname, universe in universes.items():
                result[longname].extend(universe)
        return result
