from dataclasses import dataclass
from typing import TYPE_CHECKING, Dict, List

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider

if TYPE_CHECKING:
    from urbanstats.geometry.shapefiles.shapefile import Shapefile, ShapefileTable


@dataclass
class OverrideUniverseProvider(UniverseProvider):
    overrides: Dict[str, List[str]]
    underlying: UniverseProvider

    def hash_key_details(self) -> tuple[object, ...]:
        return (
            tuple(self.overrides.items()),
            self.underlying.hash_key(),
            dict(version=2),
        )

    def relevant_shapefiles(self) -> list[str]:
        return self.underlying.relevant_shapefiles()

    def universes_for_shapefile(
        self,
        shapefiles: dict[str, "Shapefile"],
        shapefile: "Shapefile",
        shapefile_table: "ShapefileTable",
    ) -> dict[str, list[str]]:
        result = self.underlying.universes_for_shapefile(
            shapefiles, shapefile, shapefile_table
        )
        result = result.copy()
        for k, v in self.overrides.items():
            assert k in result, f"Key {k} not in shapefile table"
            assert isinstance(v, list), f"Value for key {k} is not a list"
            result[k] = v
        return result
