from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Identifiers,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import ContainedWithinCountries
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import (
    UrbanCenterlikeStateUniverseProvider,
)


# pylint: disable-next=too-many-arguments
def create_urban_center_like_shapefile(
    *,
    key,
    path,
    meta,
    cross_source_borders,
    abbreviation,
    data_credit,
    wikidata_sourcer
):
    return Shapefile(
        geometry=Geometry(key=key, path=path, filter=lambda x: True),
        identifiers=Identifiers(
            intermediate_computation_columns=["subnationals_ISO_CODE"]
        ),
        naming=Naming(
            shortname_extractor=lambda x: x["shortname"],
            longname_extractor=lambda x: x["longname"],
            cleanname_extractor=lambda x: x["shortname"].removesuffix(
                " " + meta["type"]
            ),
        ),
        metadata=Metadata(
            meta=meta,
            does_overlap_self=False,
            abbreviation=abbreviation,
            data_credit=data_credit,
            include_in_syau=True,
            wikidata_sourcer=wikidata_sourcer,
        ),
        universe_provider=CombinedUniverseProvider(
            [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider()]
        ),
        special_data_sources=[
            "international_gridded_data",
            "congressional_representatives_indirect",
        ],
        source_countries=ContainedWithinCountries(
            {
                "USA": "US " + meta["type"],
                "Canada": "CA " + meta["type"],
            }
        ),
        cross_source_borders=cross_source_borders,
    )


URBAN_CENTERS = create_urban_center_like_shapefile(
    path=load_ghsl_urban_center,
    meta=dict(type="Urban Center", source="GHSL", type_category="International City"),
    key="urban_centers_6",
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
