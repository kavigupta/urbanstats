from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.row_functions import Constant, Lookup, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.canadian_cma import (
    canadian_census_kwargs,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)

# the 2013 representation order, first used at the 2015 election
START_YEAR = 2015
RIDING_NAME = column("FEDENAME").replace("\x92", "'")
LONGNAME_SANS_DATE = (
    RIDING_NAME + " (Riding), " + Lookup(column("PRUID"), pruid_to_province)
)

CANADIAN_DISTRICTS = make_shapefile(
    geometry_key="canadian_districts_2",
    path=lambda countries, subnationals: load_canadian_shapefile(
        "named_region_shapefiles/canada/lfed000a21a_e.zip", countries, subnationals
    ),
    path_inputs=(COUNTRIES.geometry, SUBNATIONAL_REGIONS.geometry),
    shortname_extractor=RIDING_NAME.with_year(Constant(START_YEAR)),
    cleanname_extractor=RIDING_NAME,
    longname_extractor=(RIDING_NAME + " (Riding)").with_year(Constant(START_YEAR))
    + ", "
    + Lookup(column("PRUID"), pruid_to_province),
    longname_sans_date_extractor=LONGNAME_SANS_DATE,
    start_date=Constant(START_YEAR),
    start_date_overall=START_YEAR,
    additional_columns_computer={"scgc": column("FEDUID")},
    **canadian_census_kwargs("CA Riding", "Political"),
    abbreviation="RDNG",
    data_credit=dict(
        linkText="Canadian Census",
        link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lfed000a21a_e.zip",
    ),
    include_in_syau=True,
    wikidata_sourcer=SimpleWikidataSourcer("wdt:P4565", "scgc"),
)
