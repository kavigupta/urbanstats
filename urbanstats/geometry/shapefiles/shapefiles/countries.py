from urbanstats.geometry.shapefiles.shapefile import Shapefile
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
    return iso_to_country(x.ISO_CC)


COUNTRIES = Shapefile(
    hash_key="countries_9",
    path=countries,
    shortname_extractor=extract_country_longname,
    longname_extractor=extract_country_longname,
    filter=lambda x: iso_to_country(x.ISO_CC) is not None,
    meta=dict(type="Country", source="OpenDataSoft", type_category="International"),
    american=False,
    include_in_gpw=True,
    chunk_size=1,
    universe_provider=CombinedUniverseProvider(
        [
            ConstantUniverseProvider(["world"]),
            ContainedWithinUniverseProvider(["continents"]),
            SelfUniverseProvider(),
        ]
    ),
)


def countries_usa():
    loaded_file = COUNTRIES.load_file()
    loaded_file = loaded_file[loaded_file.longname.apply(lambda x: "USA" in x)]
    return loaded_file


COUNTRY_USA = Shapefile(
    hash_key="usa_only_2",
    path=countries_usa,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    filter=lambda x: "USA" == x.longname,
    meta=dict(type="Country", source="OpenDataSoft", type_category="International"),
    american=True,
    include_in_gpw=False,
)
