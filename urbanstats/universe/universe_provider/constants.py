from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.contained_within import (
    STATE_PROVIDER,
    ContainedWithinUniverseProvider,
)
from urbanstats.universe.universe_provider.override import OverrideUniverseProvider


def us_domestic_provider(overrides=None):
    state_provider = STATE_PROVIDER
    if overrides is not None:
        state_provider = OverrideUniverseProvider(overrides, state_provider)
    return CombinedUniverseProvider(
        [ConstantUniverseProvider(["world", "North America", "USA"]), state_provider]
    )


INTERNATIONAL_PROVIDERS = [
    ConstantUniverseProvider(["world"]),
    ContainedWithinUniverseProvider(["continents", "countries"]),
]
