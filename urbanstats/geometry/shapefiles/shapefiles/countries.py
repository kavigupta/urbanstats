from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.special_cases.country import countries
from urbanstats.special_cases.country_names import iso_to_country
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.contained_within import (
    ContainedWithinUniverseProvider,
)
from urbanstats.universe.universe_provider.self_provider import SelfUniverseProvider


def extract_country_longname(x):
    # print(x)
    return iso_to_country(x.ISO_CC)


COUNTRIES = Shapefile(
    hash_key="countries_10",
    path=countries,
    shortname_extractor=extract_country_longname,
    longname_extractor=extract_country_longname,
    filter=lambda x: iso_to_country(x.ISO_CC) is not None,
    meta=dict(type="Country", source="OpenDataSoft", type_category="International"),
    special_data_sources=["international_gridded_data"],
    chunk_size=1,
    universe_provider=CombinedUniverseProvider(
        [
            ConstantUniverseProvider(["world"]),
            ContainedWithinUniverseProvider(["continents"]),
            SelfUniverseProvider(),
        ]
    ),
    subset_masks={
        "USA": FilteringSubset("USA", lambda x: extract_country_longname(x) == "USA"),
        "Canada": FilteringSubset("Canada", lambda x: extract_country_longname(x) == "Canada"),
    },
)
