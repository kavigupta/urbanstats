import us
from urbanstats.geometry.shapefiles.shapefile import Shapefile, SubsetSpecification
from urbanstats.geometry.shapefiles.shapefiles.countries import extract_country_longname
from urbanstats.special_cases.country import subnational_regions
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.contained_within import STATE_PROVIDER


def valid_state(x):
    s = us.states.lookup(x.NAME)
    if s is None:
        return False
    if s in us.STATES + [us.states.DC, us.states.PR]:
        return True
    if s in [us.states.GU, us.states.AS]:
        return False
    raise ValueError(f"unrecognized state {s}")


SUBNATIONAL_REGIONS = Shapefile(
    hash_key="subnational_regions_12",
    path=subnational_regions,
    shortname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: x["fullname"],
    filter=lambda x: x.COUNTRY is not None,
    meta=dict(type="Subnational Region", source="ESRI", type_category="US Subdivision"),
    american=False,
    include_in_gpw=True,
    universe_provider=CombinedUniverseProvider(
        [*INTERNATIONAL_PROVIDERS, STATE_PROVIDER]
    ),
    subset_masks={
        "USA": SubsetSpecification(
            "State", lambda x: extract_country_longname(x) == "USA" and valid_state(x)
        )
    },
)
