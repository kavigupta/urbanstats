from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import valid_state
from urbanstats.geometry.shapefiles.source_countries import ByRow, source_countries_from
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center
from urbanstats.universe.universe_provider.combined_universe_provider import (
    CombinedUniverseProvider,
)
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import (
    UrbanCenterlikeStateUniverseProvider,
)


def urban_center_source_countries(row):
    """
    The suffix lists the countries of the subnational regions the region overlaps. US regions also
    have to lie only in states, not e.g. Puerto Rico.
    """
    us_codes = [code for code in row.subnationals_ISO_CODE if code.startswith("US")]
    if not all(valid_state(code[2:]) for code in us_codes):
        return None
    return source_countries_from(row.suffix.split("-"))


def create_urban_center_like_shapefile(**kwargs):
    return Shapefile(
        shortname_extractor=lambda x: x["shortname"],
        longname_extractor=lambda x: x["longname"],
        cleanname_extractor=lambda x: x["shortname"].removesuffix(
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
        source_countries=ByRow(
            {
                "USA": "US " + kwargs["meta"]["type"],
                "Canada": "CA " + kwargs["meta"]["type"],
            },
            urban_center_source_countries,
        ),
        include_in_syau=True,
        **kwargs,
    )


URBAN_CENTERS = create_urban_center_like_shapefile(
    path=load_ghsl_urban_center,
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
