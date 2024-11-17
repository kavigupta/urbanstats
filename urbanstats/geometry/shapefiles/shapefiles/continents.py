from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.country import continents
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.self_provider import SelfUniverseProvider

CONTINENTS = Shapefile(
    hash_key="continents_3",
    path=continents,
    shortname_extractor=lambda x: x.name_1,
    longname_extractor=lambda x: x.name_1,
    filter=lambda x: True,
    meta=dict(type="Continent", source="OpenDataSoft", type_category="International"),
    include_in_gpw=True,
    chunk_size=1,
    universe_provider=CombinedUniverseProvider(
        [ConstantUniverseProvider(["world"]), SelfUniverseProvider()]
    ),
)
