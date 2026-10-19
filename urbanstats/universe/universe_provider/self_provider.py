from dataclasses import dataclass

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class SelfUniverseProvider(UniverseProvider):
    def relevant_shapefiles(self):
        return []

    def universes_for_shapefile(self, names_by_key, names, table):
        return {longname: [longname] for longname in table.longname}
