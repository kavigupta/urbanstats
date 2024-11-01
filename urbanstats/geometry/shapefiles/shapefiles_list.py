from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.ccds import CCDs
from urbanstats.geometry.shapefiles.shapefiles.cities import CITIES
from urbanstats.geometry.shapefiles.shapefiles.continents import CONTINENTS
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES, COUNTRY_USA
from urbanstats.geometry.shapefiles.shapefiles.county_cross_cd import COUNTY_CROSS_CD
from urbanstats.geometry.shapefiles.shapefiles.csas import CSAs
from urbanstats.geometry.shapefiles.shapefiles.districts import district_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.historical_congressional import (
    HISTORICAL_CONGRESSIONAL,
)
from urbanstats.geometry.shapefiles.shapefiles.hospital import hospital_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.judicial import judicial_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.media_markets import MEDIA_MARKETS
from urbanstats.geometry.shapefiles.shapefiles.msas import MSAs
from urbanstats.geometry.shapefiles.shapefiles.native import native_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.neighborhoods import NEIGHBORHOODS
from urbanstats.geometry.shapefiles.shapefiles.population_circle import (
    population_circles_shapefiles,
    population_circles_usa_shapefiles,
    population_circles_usa_to_international,
)
from urbanstats.geometry.shapefiles.shapefiles.school_districts import SCHOOL_DISTRICTS
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    STATES_USA,
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.shapefiles.urban_areas import URBAN_AREAS
from urbanstats.geometry.shapefiles.shapefiles.urban_centers import URBAN_CENTERS
from urbanstats.geometry.shapefiles.shapefiles.usda_county_type import USDA_COUNTY_TYPE
from urbanstats.geometry.shapefiles.shapefiles.zctas import ZCTAs
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center

shapefiles = dict(
    counties=COUNTIES,
    msas=MSAs,
    csas=CSAs,
    urban_areas=URBAN_AREAS,
    zctas=ZCTAs,
    cousub=CCDs,
    cities=CITIES,
    neighborhoods=NEIGHBORHOODS,
    **district_shapefiles,
    historical_congressional=HISTORICAL_CONGRESSIONAL,
    **native_shapefiles,
    school_districts=SCHOOL_DISTRICTS,
    **judicial_shapefiles,
    county_cross_cd=COUNTY_CROSS_CD,
    usda_county_type=USDA_COUNTY_TYPE,
    **hospital_shapefiles,
    media_markets=MEDIA_MARKETS,
    continents=CONTINENTS,
    countries=COUNTRIES,
    subnational_regions=SUBNATIONAL_REGIONS,
    urban_centers=URBAN_CENTERS,
    **population_circles_shapefiles,
)

URBAN_CENTERS_USA = Shapefile(
    hash_key="us_urban_centers_4",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International"),
    filter=lambda x: "USA" == x.suffix,
    american=True,
    include_in_gpw=False,
)

shapefiles_for_stats = dict(
    **shapefiles,
    usa_only=COUNTRY_USA,
    states=STATES_USA,
    us_urban_centers=URBAN_CENTERS_USA,
    **population_circles_usa_shapefiles,
)

american_to_international = {
    "USA": "Country",
    "State": "Subnational Region",
    "US Urban Center": "Urban Center",
    **population_circles_usa_to_international,
}


def filter_table_for_type(table, typ):
    is_internationalized = typ in american_to_international
    if is_internationalized:
        typ = american_to_international[typ]
    table = table[table.type == typ]
    if is_internationalized:
        table = table[table.longname.apply(lambda x: x.endswith(", USA"))]
    return table


def load_file_for_type(typ):
    is_internationalized = typ in american_to_international
    if is_internationalized:
        typ = american_to_international[typ]
    [loaded_file] = [x for x in shapefiles.values() if x.meta["type"] == typ]
    loaded_file = loaded_file.load_file()
    if is_internationalized:
        loaded_file = loaded_file[loaded_file.longname.apply(lambda x: x.endswith(", USA"))]
    return loaded_file
