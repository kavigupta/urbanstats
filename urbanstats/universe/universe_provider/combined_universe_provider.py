from dataclasses import dataclass
from typing import TYPE_CHECKING, Tuple

from urbanstats.universe.universe_provider.universe_provider import UniverseProvider

if TYPE_CHECKING:
    from urbanstats.geometry.shapefiles.shapefile import Shapefile, ShapefileTable


@dataclass
class CombinedUniverseProvider(UniverseProvider):
    providers: list[UniverseProvider]

    def hash_key_details(self) -> Tuple[object, ...]:
        return tuple(provider.hash_key() for provider in self.providers)

    def relevant_shapefiles(self) -> list[str]:
        return sorted(
            {
                shapefile
                for provider in self.providers
                for shapefile in provider.relevant_shapefiles()
            }
        )

    def universes_for_shapefile(
        self,
        shapefiles: dict[str, "Shapefile"],
        shapefile: "Shapefile",
        shapefile_table: "ShapefileTable",
    ) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {
            longname: [] for longname in shapefile_table.longname
        }
        for provider in self.providers:
            universes = provider.universes_for_shapefile(
                shapefiles, shapefile, shapefile_table
            )
            for longname, universe in universes.items():
                result[longname].extend(universe)
        return result
