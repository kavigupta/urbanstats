from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.source_countries import ContainedWithinCountries
from urbanstats.special_cases.ghsl_urban_center import (
    SubnationalSuffixedName,
    SubnationalSuffixes,
    load_ghsl_urban_centers,
)
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import (
    UrbanCenterlikeStateUniverseProvider,
)


def create_urban_center_like_shapefile(*, suffixes, **kwargs):
    def name(part):
        return SubnationalSuffixedName(suffixes, kwargs["meta"]["type"], part)

    return make_shapefile(
        shortname_extractor=name("shortname"),
        longname_extractor=name("longname"),
        cleanname_extractor=name("cleanname"),
        filter=lambda x: True,
        does_overlap_self=False,
        special_data_sources=[
            "international_gridded_data",
            "congressional_representatives_indirect",
        ],
        universe_provider=CombinedUniverseProvider(
            [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider(suffixes)]
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
    path=load_ghsl_urban_centers,
    suffixes=SubnationalSuffixes(
        SUBNATIONAL_REGIONS.geometry,
        name_column="UC_NM_MN",
        more_general_direction=False,
        overrides=(("Venice", "IT34"),),
    ),
    meta=dict(type="Urban Center", source="GHSL", type_category="International City"),
    hash_key="urban_centers_6",
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
