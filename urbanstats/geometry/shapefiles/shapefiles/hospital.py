from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def hrr_shortname(x, suffix="HRR"):
    state, city = [x.strip() for x in [x[: x.index("-")], x[x.index("-") + 1 :]]]
    return f"{city.title()} {state} {suffix}"


data_credit = dict(
    linkText="the Dartmouth Atlas (minor errors fixed by us)",
    link="https://data.dartmouthatlas.org/supplemental/#boundaries",
)

HRRs = Shapefile(
    hash_key="hospital_referral_regions_3",
    path="named_region_shapefiles/hrr.geojson",
    shortname_extractor=lambda x: hrr_shortname(x.hrrcity),
    longname_extractor=lambda x: hrr_shortname(x.hrrcity) + ", USA",
    filter=lambda x: True,
    meta=dict(
        type="Hospital Referral Region",
        source="Dartmouth Atlas",
        type_category="Oddball",
    ),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="HRR",
    data_credit=data_credit,
)
HSAs = Shapefile(
    hash_key="hospital_service_areas_2",
    path="named_region_shapefiles/HsaBdry_AK_HI_unmodified.geojson",
    shortname_extractor=lambda x: hrr_shortname(x.HSANAME, "HSA"),
    longname_extractor=lambda x: hrr_shortname(x.HSANAME, "HSA")
    + ", "
    + hrr_shortname(x.HRR93_NAME)
    + ", USA",
    filter=lambda x: True,
    meta=dict(
        type="Hospital Service Area",
        source="Dartmouth Atlas",
        type_category="Oddball",
    ),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="HSA",
    data_credit=data_credit,
)
hospital_shapefiles = dict(
    hospital_referral_regions=HRRs,
    hospital_service_areas=HSAs,
)
