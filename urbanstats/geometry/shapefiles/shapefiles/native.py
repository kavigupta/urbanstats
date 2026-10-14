# we want to be pretty explicit about the parameters, so its fine if there is some duplication
# pylint: disable=duplicate-code
import geopandas as gpd
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Identifiers,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def is_native_statistical_area(row):
    x = ce_to_name()[row.AIANNHCE]
    return "OTSA" in x or "SDTSA" in x or "ANVSA" in x or "TDSA" in x


NATIVE_AREAS = Shapefile(
    geometry=Geometry(
        key="native_areas_2",
        path="named_region_shapefiles/cb_2022_us_aiannh_500k.zip",
        filter=lambda x: not is_native_statistical_area(x),
    ),
    identifiers=Identifiers(
        additional_columns_computer={"geoid": lambda x: x.GEOID},
    ),
    naming=Naming(
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD}, USA",
        cleanname_extractor=lambda x: x.NAME,
    ),
    metadata=Metadata(
        meta=dict(type="Native Area", source="Census", type_category="Native"),
        does_overlap_self=False,
        abbreviation="NAAR",
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        include_in_syau=True,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)
NATIVE_STATISTICAL_AREAS = Shapefile(
    geometry=Geometry(
        key="native_statistical_areas",
        path="named_region_shapefiles/cb_2022_us_aiannh_500k.zip",
        filter=is_native_statistical_area,
    ),
    identifiers=Identifiers(
        additional_columns_computer={"geoid": lambda x: x.GEOID},
    ),
    naming=Naming(
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD}, USA",
        cleanname_extractor=lambda x: x.NAME,
    ),
    metadata=Metadata(
        meta=dict(
            type="Native Statistical Area", source="Census", type_category="Native"
        ),
        does_overlap_self=False,
        abbreviation="NASA",
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        include_in_syau=True,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)
NATIVE_SUBDIVISIONS = Shapefile(
    geometry=Geometry(
        key="native_subdivisions_2",
        path="named_region_shapefiles/cb_2022_us_aitsn_500k.zip",
        filter=lambda x: True,
    ),
    identifiers=Identifiers(
        additional_columns_computer={"geoid": lambda x: x.GEOID},
    ),
    naming=Naming(
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD}, {ce_to_name()[x.AIANNHCE]}, USA",
        cleanname_extractor=lambda x: x.NAME,
    ),
    metadata=Metadata(
        meta=dict(type="Native Subdivision", source="Census", type_category="Native"),
        does_overlap_self=False,
        abbreviation="NASD",
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        include_in_syau=True,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)


@permacache("population_density/ce_to_name")
def ce_to_name():
    table = gpd.read_file("named_region_shapefiles/cb_2022_us_aiannh_500k.zip")
    return dict(zip(table.AIANNHCE, table.NAMELSAD))


native_shapefiles = dict(
    native_areas=NATIVE_AREAS,
    native_statistical_areas=NATIVE_STATISTICAL_AREAS,
    native_subdivisions=NATIVE_SUBDIVISIONS,
)
