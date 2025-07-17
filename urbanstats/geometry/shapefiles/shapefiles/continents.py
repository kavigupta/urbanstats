from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.special_cases.country import continents
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.self_provider import SelfUniverseProvider

CONTINENTS = Shapefile(
    hash_key="continents_9",
    path=continents,
    shortname_extractor=lambda x: x.name_1,
    longname_extractor=lambda x: x.name_1,
    filter=lambda x: x.name_1 != "Antarctica",
    meta=dict(type="Continent", source="OpenDataSoft", type_category="International"),
    does_overlap_self=False,
    special_data_sources=["international_gridded_data"],
    chunk_size=1,
    universe_provider=CombinedUniverseProvider(
        [ConstantUniverseProvider(["world"]), SelfUniverseProvider()]
    ),
    abbreviation="CONT",
    data_credit=COUNTRIES.data_credit,
    include_in_syau=True,
)
