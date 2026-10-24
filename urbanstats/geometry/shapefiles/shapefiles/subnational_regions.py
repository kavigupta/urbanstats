from dataclasses import dataclass

import us

from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.row_functions import RowFunction, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import ContainedWithinCountries
from urbanstats.special_cases.country import subnational_regions
from urbanstats.special_cases.country_names import iso_to_country
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import (
    INTERNATIONAL_PROVIDERS,
    SUBNATIONAL_PROVIDERS,
)


def extract_country_longname(x):
    # print(x)
    return iso_to_country(x.ISO_CC)


@dataclass(frozen=True)
class CountryName(RowFunction):
    """The name of the country whose ISO code inner gives."""

    inner: RowFunction

    def __call__(self, row):
        return iso_to_country(self.inner(row))


def extract_state(x):
    s = us.states.lookup(x)
    if s is None:
        return None
    if s in us.STATES + [us.states.DC, us.states.PR]:
        return s
    if s in [us.states.GU, us.states.AS, us.states.VI, us.states.MP]:
        return None
    raise ValueError(f"unrecognized state {s}")


def valid_state(x):
    return extract_state(x) is not None


@dataclass(frozen=True)
class SubnationalGeoid(RowFunction):
    """The state's FIPS code, for US states, DC and Puerto Rico."""

    def __call__(self, row):
        if extract_country_longname(row) != "USA":
            return None
        st = extract_state(row.NAME)
        if st is None:
            return None
        return st.fips


@dataclass(frozen=True)
class SubnationalIso(RowFunction):
    def __call__(self, row):
        return row.ISO_CC + "-" + row.ISO_SUB if row.ISO_SUB is not None else None


SUBNATIONAL_REGIONS = make_shapefile(
    geometry_key="subnational_regions_15",
    path=subnational_regions,
    shortname_extractor=column("NAME"),
    longname_extractor=column("fullname"),
    filter=lambda x: x.COUNTRY is not None,
    additional_columns_computer={
        "geoid": SubnationalGeoid(),
        "iso": SubnationalIso(),
    },
    intermediate_computation_columns=["NAME", "ISO_CC"],
    meta=dict(type="Subnational Region", source="ESRI", type_category="US Subdivision"),
    does_overlap_self=False,
    special_data_sources=[
        "international_gridded_data",
        "composed_of_counties",
        ("census", "state"),
    ],
    universe_provider=CombinedUniverseProvider(
        [*INTERNATIONAL_PROVIDERS, *SUBNATIONAL_PROVIDERS]
    ),
    source_countries=ContainedWithinCountries(
        {"USA": "State", "Canada": "Province", "Australia": "State"}
    ),
    cross_source_borders=CrossSourceBorders(can_straddle=False),
    abbreviation="SUBN",
    data_credit=[
        dict(
            text="Countries and continents are created by merging subnational regions.",
            linkText="ESRI",
            link="https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69",
        ),
        dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        dict(
            linkText="Canadian Census",
            link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpr_000a21a_e.zip",
        ),
    ],
    include_in_syau=True,
    wikidata_sourcer=SimpleWikidataSourcer("wdt:P300", "iso"),
)
