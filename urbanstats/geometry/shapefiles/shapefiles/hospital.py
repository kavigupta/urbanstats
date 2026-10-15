from dataclasses import dataclass

from urbanstats.geometry.shapefiles.row_functions import RowFunction, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass(frozen=True)
class HrrCleanname(RowFunction):
    """The Dartmouth Atlas's "STATE- CITY" names, as "City STATE"."""

    inner: RowFunction

    def __call__(self, row):
        x = self.inner(row)
        state, city = [x.strip() for x in [x[: x.index("-")], x[x.index("-") + 1 :]]]
        return f"{city.title()} {state}"


data_credit = dict(
    linkText="the Dartmouth Atlas (minor errors fixed by us)",
    link="https://data.dartmouthatlas.org/supplemental/#boundaries",
)

HRRs = make_shapefile(
    hash_key="hospital_referral_regions_3",
    path="named_region_shapefiles/hrr.geojson",
    shortname_extractor=HrrCleanname(column("hrrcity")) + " HRR",
    cleanname_extractor=HrrCleanname(column("hrrcity")),
    longname_extractor=HrrCleanname(column("hrrcity")) + " HRR, USA",
    filter=lambda x: True,
    meta=dict(
        type="Hospital Referral Region",
        source="Dartmouth Atlas",
        type_category="Oddball",
    ),
    does_overlap_self=False,
    universe_provider=us_domestic_provider(),
    source_countries=InCountry("USA"),
    abbreviation="HRR",
    data_credit=data_credit,
    include_in_syau=False,
    wikidata_sourcer=None,
    special_data_sources=["congressional_representatives_indirect"],
)
HSAs = make_shapefile(
    hash_key="hospital_service_areas_2",
    path="named_region_shapefiles/HsaBdry_AK_HI_unmodified.geojson",
    shortname_extractor=HrrCleanname(column("HSANAME")) + " HSA",
    cleanname_extractor=HrrCleanname(column("HSANAME")),
    longname_extractor=HrrCleanname(column("HSANAME"))
    + " HSA, "
    + HrrCleanname(column("HRR93_NAME"))
    + " HRR, USA",
    filter=lambda x: True,
    meta=dict(
        type="Hospital Service Area",
        source="Dartmouth Atlas",
        type_category="Oddball",
    ),
    does_overlap_self=False,
    universe_provider=us_domestic_provider(),
    source_countries=InCountry("USA"),
    abbreviation="HSA",
    data_credit=data_credit,
    include_in_syau=False,
    wikidata_sourcer=None,
    special_data_sources=["congressional_representatives_indirect"],
)
hospital_shapefiles = dict(
    hospital_referral_regions=HRRs,
    hospital_service_areas=HSAs,
)
