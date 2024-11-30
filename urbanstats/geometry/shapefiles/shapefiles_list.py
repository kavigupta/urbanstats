from urbanstats.geometry.shapefiles.shapefile import (
    multiple_localized_type_names,
    subset_mask_key,
)
from urbanstats.geometry.shapefiles.shapefiles.canadian_census_divisions import (
    CANADIAN_CENSUS_DIVISIONS,
)
from urbanstats.geometry.shapefiles.shapefiles.ccds import CCDs
from urbanstats.geometry.shapefiles.shapefiles.cities import CITIES
from urbanstats.geometry.shapefiles.shapefiles.continents import CONTINENTS
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
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
)
from urbanstats.geometry.shapefiles.shapefiles.school_districts import SCHOOL_DISTRICTS
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.shapefiles.urban_areas import URBAN_AREAS
from urbanstats.geometry.shapefiles.shapefiles.urban_centers import URBAN_CENTERS
from urbanstats.geometry.shapefiles.shapefiles.usda_county_type import USDA_COUNTY_TYPE
from urbanstats.geometry.shapefiles.shapefiles.zctas import ZCTAs

shapefiles = dict(
    # US
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
    # Canada
    canada_census_divisions=CANADIAN_CENSUS_DIVISIONS,
    # International
    continents=CONTINENTS,
    countries=COUNTRIES,
    subnational_regions=SUBNATIONAL_REGIONS,
    urban_centers=URBAN_CENTERS,
    **population_circles_shapefiles,
)

localized_type_names = multiple_localized_type_names(shapefiles)
unlocalization_map = {
    localized: (unlocalized, subset)
    for subset, localization_map in localized_type_names.items()
    for unlocalized, localized in localization_map.items()
}


def filter_table_for_type(table, typ):
    unlocalized_typ, subset = unlocalization_map.get(typ, (typ, None))
    table = table[table["type"] == unlocalized_typ]
    if subset is not None:
        table = table[table[subset_mask_key(subset)]]
    return table


def load_file_for_type(typ):
    if typ not in unlocalization_map:
        unlocalized_typ = typ
    else:
        unlocalized_typ, _ = unlocalization_map[typ]
    [loaded_shapefile] = [
        x for x in shapefiles.values() if x.meta["type"] == unlocalized_typ
    ]
    loaded_file = loaded_shapefile.load_file()
    loaded_file["type"] = loaded_shapefile.meta["type"]
    return filter_table_for_type(loaded_file, typ)
