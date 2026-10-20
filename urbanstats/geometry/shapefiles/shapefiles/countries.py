from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
    CountryName,
)
from urbanstats.geometry.shapefiles.source_countries import IsCountry
from urbanstats.special_cases.country import countries
from urbanstats.special_cases.country_names import iso_to_country
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.self_provider import SelfUniverseProvider

COUNTRIES = make_shapefile(
    geometry_key="countries_12",
    path=countries,
    path_inputs=(SUBNATIONAL_REGIONS.geometry,),
    shortname_extractor=CountryName(column("ISO_CC")),
    longname_extractor=CountryName(column("ISO_CC")),
    additional_columns_computer={"iso": column("ISO_CC")},
    filter=lambda x: iso_to_country(x.ISO_CC) is not None,
    meta=dict(type="Country", source="OpenDataSoft", type_category="International"),
    does_overlap_self=False,
    special_data_sources=["international_gridded_data", "composed_of_counties"],
    universe_provider=CombinedUniverseProvider(
        [
            *INTERNATIONAL_PROVIDERS,
            SelfUniverseProvider(),
        ]
    ),
    source_countries=IsCountry({"USA": "USA", "Canada": "Canada"}),
    cross_source_borders=CrossSourceBorders(can_straddle=False),
    abbreviation="CTRY",
    data_credit=SUBNATIONAL_REGIONS.metadata.data_credit,
    include_in_syau=True,
    wikidata_sourcer=SimpleWikidataSourcer("wdt:P297", "iso"),
)
