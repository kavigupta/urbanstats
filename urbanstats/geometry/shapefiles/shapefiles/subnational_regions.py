import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.special_cases.country import subnational_regions
from urbanstats.special_cases.country_names import iso_to_country
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.contained_within import (
    PROVINCE_PROVIDER,
    STATE_PROVIDER,
)


def extract_country_longname(x):
    # print(x)
    return iso_to_country(x.ISO_CC)


def valid_state(x):
    s = us.states.lookup(x.NAME)
    if s is None:
        return False
    if s in us.STATES + [us.states.DC, us.states.PR]:
        return True
    if s in [us.states.GU, us.states.AS, us.states.VI, us.states.MP]:
        return False
    raise ValueError(f"unrecognized state {s}")


SUBNATIONAL_REGIONS = Shapefile(
    hash_key="subnational_regions_15",
    path=subnational_regions,
    shortname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: x["fullname"],
    filter=lambda x: x.COUNTRY is not None,
    meta=dict(type="Subnational Region", source="ESRI", type_category="US Subdivision"),
    special_data_sources=["international_gridded_data"],
    universe_provider=CombinedUniverseProvider(
        [*INTERNATIONAL_PROVIDERS, STATE_PROVIDER, PROVINCE_PROVIDER]
    ),
    subset_masks={
        "USA": FilteringSubset(
            "State", lambda x: extract_country_longname(x) == "USA" and valid_state(x)
        ),
        "Canada": FilteringSubset(
            "Province", lambda x: extract_country_longname(x) == "Canada"
        ),
    },
    abbreviation="SUBN",
    data_credit=[
        dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        dict(
            linkText="Canadian Census",
            link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpr_000a21a_e.zip",
        ),
        dict(
            linkText="ESRI",
            link="https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69",
        ),
    ],
)
