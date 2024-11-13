from urbanstats.geometry.shapefiles.shapefiles.urban_centers import (
    UrbanCenterStateUniverseProvider,
)
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.contained_within import (
    ContainedWithinUniverseProvider,
)


INTERNATIONAL_PROVIDER = CombinedUniverseProvider(
    [
        ConstantUniverseProvider(["world"]),
        ContainedWithinUniverseProvider(["continents", "countries"]),
        UrbanCenterStateUniverseProvider(),
    ]
)
