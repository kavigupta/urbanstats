from dataclasses import dataclass

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class SelfUniverseProvider(UniverseProvider):
    def hash_key_details(self):
        return ()

    def relevant_shapefiles(self):
        return []

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        return {longname: [longname] for longname in shapefile_table.longname}
