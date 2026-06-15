from dataclasses import dataclass

from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.contained_within import (
    PROVINCE_PROVIDER,
    STATE_PROVIDER,
    ContainedWithinUniverseProvider,
)
from urbanstats.universe.universe_provider.override import OverrideUniverseProvider
from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class USContinentProvider(UniverseProvider):
    state_provider: UniverseProvider

    def hash_key_details(self):
        return self.state_provider.hash_key()

    def relevant_shapefiles(self):
        return sorted(
            set(
                self.state_provider.relevant_shapefiles()
                + ["subnational_regions", "continents"]
            )
        )

    def _derive_continents(self, ours_to_state, shapefiles):
        state_to_continent = ContainedWithinUniverseProvider(
            ["continents"]
        ).universes_for_shapefile(
            shapefiles,
            shapefiles["subnational_regions"],
            shapefiles["subnational_regions"].load_file(),
        )
        return {
            longname: sorted(
                {
                    continent
                    for state in states
                    for continent in state_to_continent[state]
                }
            )
            for longname, states in ours_to_state.items()
        }

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        ours_to_state = self.state_provider.universes_for_shapefile(
            shapefiles, shapefile, shapefile_table
        )
        return self._derive_continents(ours_to_state, shapefiles)

    def containing_universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        ours_to_state = self.state_provider.containing_universes_for_shapefile(
            shapefiles, shapefile, shapefile_table
        )
        return self._derive_continents(ours_to_state, shapefiles)


def us_domestic_provider(overrides=None):
    state_provider = STATE_PROVIDER
    if overrides is not None:
        state_provider = OverrideUniverseProvider(overrides, state_provider)
    return CombinedUniverseProvider(
        [
            ConstantUniverseProvider(["world"]),
            USContinentProvider(state_provider),
            ConstantUniverseProvider(["USA"]),
            state_provider,
        ]
    )


def canada_domestic_provider(overrides=None):
    province_provider = PROVINCE_PROVIDER
    if overrides is not None:
        province_provider = OverrideUniverseProvider(overrides, province_provider)
    return CombinedUniverseProvider(
        [
            ConstantUniverseProvider(["world", "North America", "Canada"]),
            province_provider,
        ]
    )


INTERNATIONAL_PROVIDERS = [
    ConstantUniverseProvider(["world"]),
    ContainedWithinUniverseProvider(["continents", "countries"]),
]
