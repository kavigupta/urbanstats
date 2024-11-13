from dataclasses import dataclass
from typing import List

from urbanstats.geometry.shapefile_geometry import overlays
from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class CombinedUniverseProvider(UniverseProvider):
    providers: List[UniverseProvider]

    def hash_key_details(self):
        return tuple(provider.hash_key() for provider in self.providers)

    def relevant_shapefiles(self):
        return sorted(
            {
                shapefile
                for provider in self.providers
                for shapefile in provider.relevant_shapefiles()
            }
        )

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        result = {longname: [] for longname in shapefile_table.longname}
        for provider in self.providers:
            universes = provider.universes_for_shapefile(
                shapefiles, shapefile, shapefile_table
            )
            for longname, universe in universes.items():
                result[longname].extend(universe)
        return result
