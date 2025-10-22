from urbanstats.geometry.shapefiles.shapefile import multiple_localized_type_names
from urbanstats.geometry.shapefiles.shapefiles.canadian_census_divisions import (
    CANADIAN_CENSUS_DIVISIONS,
)
from urbanstats.geometry.shapefiles.shapefiles.canadian_census_subdivisions import (
    CANADIAN_CENSUS_SUBDIVISIONS,
)
from urbanstats.geometry.shapefiles.shapefiles.canadian_cma import (
    CANADIAN_CENSUS_METROPOLITAN_AREAS,
)
from urbanstats.geometry.shapefiles.shapefiles.canadian_districts import (
    CANADIAN_DISTRICTS,
)
from urbanstats.geometry.shapefiles.shapefiles.canadian_population_centers import (
    CANADIAN_CENSUS_POPULATION_CENTERS,
)
from urbanstats.geometry.shapefiles.shapefiles.ccds import CCDs
from urbanstats.geometry.shapefiles.shapefiles.cities import CITIES
from urbanstats.geometry.shapefiles.shapefiles.continents import CONTINENTS
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.county_cross_cd import COUNTY_CROSS_CD
from urbanstats.geometry.shapefiles.shapefiles.csas_msas import CSAs, MSAs
from urbanstats.geometry.shapefiles.shapefiles.districts import district_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.historical_congressional import (
    HISTORICAL_CONGRESSIONALs,
)
from urbanstats.geometry.shapefiles.shapefiles.hospital import hospital_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.judicial import judicial_shapefiles
from urbanstats.geometry.shapefiles.shapefiles.media_markets import MEDIA_MARKETS
from urbanstats.geometry.shapefiles.shapefiles.metropolitan_clusters import (
    METROPOLITAN_CLUSTERS,
)
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
    **HISTORICAL_CONGRESSIONALs,
    **native_shapefiles,
    school_districts=SCHOOL_DISTRICTS,
    **judicial_shapefiles,
    county_cross_cd=COUNTY_CROSS_CD,
    usda_county_type=USDA_COUNTY_TYPE,
    **hospital_shapefiles,
    media_markets=MEDIA_MARKETS,
    # Canada
    canada_census_divisions=CANADIAN_CENSUS_DIVISIONS,
    canadian_census_subdivisions=CANADIAN_CENSUS_SUBDIVISIONS,
    canadian_population_centers=CANADIAN_CENSUS_POPULATION_CENTERS,
    candian_cmas=CANADIAN_CENSUS_METROPOLITAN_AREAS,
    canadian_districts=CANADIAN_DISTRICTS,
    # International
    continents=CONTINENTS,
    countries=COUNTRIES,
    subnational_regions=SUBNATIONAL_REGIONS,
    urban_centers=URBAN_CENTERS,
    metropolitan_clusters=METROPOLITAN_CLUSTERS,
    **population_circles_shapefiles,
)

localized_type_names = multiple_localized_type_names(shapefiles)
