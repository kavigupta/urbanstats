from dataclasses import dataclass
from typing import Dict, List

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class OverrideUniverseProvider(UniverseProvider):
    overrides: Dict[str, List[str]]
    underlying: UniverseProvider

    def hash_key_details(self):
        return (
            tuple(self.overrides.items()),
            self.underlying.hash_key(),
            dict(version=2),
        )

    def relevant_shapefiles(self):
        return self.underlying.relevant_shapefiles()

    def universes_for_shapefile(self, names_by_key, names, table):
        result = self.underlying.universes_for_shapefile(names_by_key, names, table)
        result = result.copy()
        for k, v in self.overrides.items():
            assert k in result, f"Key {k} not in shapefile table"
            assert isinstance(v, list), f"Value for key {k} is not a list"
            result[k] = v
        return result
