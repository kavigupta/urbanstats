from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import valid_state
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import (
    UrbanCenterlikeStateUniverseProvider,
)


def create_urban_center_like_shapefile(**kwargs):
    return Shapefile(
        shortname_extractor=lambda x: x["shortname"],
        longname_extractor=lambda x: x["longname"],
        additional_columns_to_keep=["subnationals_ISO_CODE"],
        filter=lambda x: True,
        special_data_sources=["international_gridded_data"],
        universe_provider=CombinedUniverseProvider(
            [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider()]
        ),
        subset_masks={
            "USA": FilteringSubset(
                "US " + kwargs["meta"]["type"],
                lambda x: "USA" == x.suffix
                and all(valid_state(code[2:]) for code in x.subnationals_ISO_CODE),
            ),
            "Canada": FilteringSubset(
                "CA " + kwargs["meta"]["type"], lambda x: "Canada" == x.suffix
            ),
        },
        include_in_syau=True,
        **kwargs,
    )


URBAN_CENTERS = create_urban_center_like_shapefile(
    path=load_ghsl_urban_center,
    meta=dict(type="Urban Center", source="GHSL", type_category="International City"),
    hash_key="urban_centers_6",
    abbreviation="URBC",
    data_credit=dict(
        text="We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true"
        " positive, and which are named.",
        linkText="GHSL",
        link="https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php",
    ),
)
