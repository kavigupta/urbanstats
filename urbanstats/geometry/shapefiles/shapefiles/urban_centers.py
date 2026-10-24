import attr

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


def create_urban_center_like_shapefile(
    *, name_column, more_general_direction, overrides, **kwargs
):
    # the names are computed among all the regions, so they're added once the geometry exists
    shapefile = make_shapefile(
        shortname_extractor=None,
        longname_extractor=None,
        universe_provider=None,
        filter=lambda x: True,
        does_overlap_self=False,
        special_data_sources=[
            "international_gridded_data",
            "congressional_representatives_indirect",
        ],
        source_countries=ContainedWithinCountries(
            {
                "USA": "US " + kwargs["meta"]["type"],
                "Canada": "CA " + kwargs["meta"]["type"],
                "Australia": "AU " + kwargs["meta"]["type"],
            }
        ),
        include_in_syau=True,
        **kwargs,
    )
    suffixes = SubnationalSuffixes(
        regions=shapefile.geometry,
        subnationals=SUBNATIONAL_REGIONS.geometry,
        name_column=name_column,
        more_general_direction=more_general_direction,
        overrides=overrides,
    )

    def name(part):
        return SubnationalSuffixedName(suffixes, kwargs["meta"]["type"], part)

    return attr.evolve(
        shapefile,
        naming=attr.evolve(
            shapefile.naming,
            shortname_extractor=name("shortname"),
            longname_extractor=name("longname"),
            cleanname_extractor=name("cleanname"),
        ),
        universe_provider=CombinedUniverseProvider(
            [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider(suffixes)]
        ),
    )


URBAN_CENTERS = create_urban_center_like_shapefile(
    path=load_ghsl_urban_centers,
    name_column="UC_NM_MN",
    more_general_direction=False,
    overrides=(("Venice", "IT34"),),
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
