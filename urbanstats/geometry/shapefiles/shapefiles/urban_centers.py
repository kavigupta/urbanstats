from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import (
    UrbanCenterlikeStateUniverseProvider,
)

URBAN_CENTERS = Shapefile(
    hash_key="urban_centers_5",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    additional_columns_to_keep=["subnationals_ISO_CODE"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International City"),
    filter=lambda x: True,
    special_data_sources=["international_gridded_data"],
    universe_provider=CombinedUniverseProvider(
        [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider()]
    ),
    subset_masks={
        "USA": FilteringSubset("US Urban Center", lambda x: "USA" == x.suffix),
        "Canada": FilteringSubset("CA Urban Center", lambda x: "Canada" == x.suffix),
    },
    abbreviation="URBC",
    data_credit=dict(
        text="We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true"
        " positive, and which are named.",
        linkText="GHSL",
        link="https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php",
    ),
    include_in_syau=True,
)
