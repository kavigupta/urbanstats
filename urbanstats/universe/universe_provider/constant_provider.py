from dataclasses import dataclass
from typing import TYPE_CHECKING, List

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider

if TYPE_CHECKING:
    from urbanstats.geometry.shapefiles.shapefile import Shapefile, ShapefileTable


@dataclass
class ConstantUniverseProvider(UniverseProvider):
    universes: List[str]

    def hash_key_details(self) -> tuple[str, ...]:
        return tuple(self.universes)

    def relevant_shapefiles(self) -> list[str]:
        return []

    def universes_for_shapefile(
        self,
        shapefiles: dict[str, "Shapefile"],
        shapefile: "Shapefile",
        shapefile_table: "ShapefileTable",
    ) -> dict[str, list[str]]:
        return {longname: self.universes for longname in shapefile_table.longname}
