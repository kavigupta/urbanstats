from dataclasses import dataclass

from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.special_cases.country import continents
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constant_provider import (
    ConstantUniverseProvider,
)
from urbanstats.universe.universe_provider.self_provider import SelfUniverseProvider


@dataclass
class ContinentsWikidataSourcer:
    def columns(self):
        return ["longname"]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, iso):
        mapping = {
            "Africa": "Q15",
            "Antarctica": "Q51",
            "Asia": "Q48",
            "Europe": "Q46",
            "North America": "Q49",
            "Oceania": "Q55643",
            "South America": "Q18",
        }
        return mapping[iso]


CONTINENTS = make_shapefile(
    geometry_key="continents_9",
    path=continents,
    shortname_extractor=column("name_1"),
    longname_extractor=column("name_1"),
    filter=lambda x: x.name_1 != "Antarctica",
    meta=dict(type="Continent", source="OpenDataSoft", type_category="International"),
    does_overlap_self=False,
    special_data_sources=["international_gridded_data", "composed_of_counties"],
    universe_provider=CombinedUniverseProvider(
        [ConstantUniverseProvider(["world"]), SelfUniverseProvider()]
    ),
    abbreviation="CONT",
    data_credit=COUNTRIES.metadata.data_credit,
    include_in_syau=True,
    wikidata_sourcer=ContinentsWikidataSourcer(),
)
