from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.row_functions import Lookup, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.canadian_cma import (
    canadian_census_kwargs,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)

CANADIAN_DISTRICTS = make_shapefile(
    geometry_key="canadian_districts_2",
    path=lambda countries, subnationals: load_canadian_shapefile(
        "named_region_shapefiles/canada/lfed000a21a_e.zip", countries, subnationals
    ),
    path_inputs=(COUNTRIES.names, SUBNATIONAL_REGIONS.names),
    shortname_extractor=column("FEDENAME"),
    longname_extractor=column("FEDENAME")
    + " (Riding), "
    + Lookup(column("PRUID"), pruid_to_province),
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
