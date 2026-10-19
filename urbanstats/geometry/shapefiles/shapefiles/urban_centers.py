from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import ContainedWithinCountries
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import (
    UrbanCenterlikeStateUniverseProvider,
)


def create_urban_center_like_shapefile(**kwargs):
    return make_shapefile(
        shortname_extractor=column("shortname"),
        longname_extractor=column("longname"),
        cleanname_extractor=(column("shortname")).removesuffix(
            " " + kwargs["meta"]["type"]
        ),
        intermediate_computation_columns=["subnationals_ISO_CODE"],
        filter=lambda x: True,
        does_overlap_self=False,
        special_data_sources=[
            "international_gridded_data",
            "congressional_representatives_indirect",
        ],
        universe_provider=CombinedUniverseProvider(
            [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider()]
        ),
        source_countries=ContainedWithinCountries(
            {
                "USA": "US " + kwargs["meta"]["type"],
                "Canada": "CA " + kwargs["meta"]["type"],
            }
        ),
        include_in_syau=True,
        **kwargs,
    )


URBAN_CENTERS = create_urban_center_like_shapefile(
    path=load_ghsl_urban_center,
    meta=dict(type="Urban Center", source="GHSL", type_category="International City"),
    geometry_key="urban_centers_6",
    cross_source_borders=CrossSourceBorders(
        can_straddle=True,
        alternative_geography_types=["Urban Area", "CA Population Center"],
    ),
    abbreviation="URBC",
    data_credit=dict(
        text="We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true"
        " positive, and which are named.",
        linkText="GHSL",
        link="https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php",
    ),
    wikidata_sourcer=None,
)
