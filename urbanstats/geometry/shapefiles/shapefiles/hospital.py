# pylint: disable=duplicate-code
from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def hrr_cleanname(x):
    state, city = [x.strip() for x in [x[: x.index("-")], x[x.index("-") + 1 :]]]
    return f"{city.title()} {state}"


def hrr_shortname(x, suffix="HRR"):
    return f"{hrr_cleanname(x)} {suffix}"


data_credit = dict(
    linkText="the Dartmouth Atlas (minor errors fixed by us)",
    link="https://data.dartmouthatlas.org/supplemental/#boundaries",
)

HRRs = Shapefile(
    geometry=Geometry(
        key="hospital_referral_regions_3",
        path="named_region_shapefiles/hrr.geojson",
        filter=lambda x: True,
    ),
    naming=Naming(
        shortname_extractor=lambda x: hrr_shortname(x.hrrcity),
        longname_extractor=lambda x: hrr_shortname(x.hrrcity) + ", USA",
        cleanname_extractor=lambda x: hrr_cleanname(x.hrrcity),
    ),
    metadata=Metadata(
        meta=dict(
            type="Hospital Referral Region",
            source="Dartmouth Atlas",
            type_category="Oddball",
        ),
        does_overlap_self=False,
        abbreviation="HRR",
        data_credit=data_credit,
        include_in_syau=False,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)
HSAs = Shapefile(
    geometry=Geometry(
        key="hospital_service_areas_2",
        path="named_region_shapefiles/HsaBdry_AK_HI_unmodified.geojson",
        filter=lambda x: True,
    ),
    naming=Naming(
        shortname_extractor=lambda x: hrr_shortname(x.HSANAME, "HSA"),
        longname_extractor=lambda x: hrr_shortname(x.HSANAME, "HSA")
        + ", "
        + hrr_shortname(x.HRR93_NAME)
        + ", USA",
        cleanname_extractor=lambda x: hrr_cleanname(x.HSANAME),
    ),
    metadata=Metadata(
        meta=dict(
            type="Hospital Service Area",
            source="Dartmouth Atlas",
            type_category="Oddball",
        ),
        does_overlap_self=False,
        abbreviation="HSA",
        data_credit=data_credit,
        include_in_syau=False,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)
hospital_shapefiles = dict(
    hospital_referral_regions=HRRs,
    hospital_service_areas=HSAs,
)
