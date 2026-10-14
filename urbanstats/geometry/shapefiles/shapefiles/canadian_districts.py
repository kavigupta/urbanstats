from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Identifiers,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.shapefiles.canadian_cma import (
    canadian_census_metadata,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import canada_domestic_provider

CANADIAN_DISTRICTS = Shapefile(
    geometry=Geometry(
        key="canadian_districts_2",
        path=lambda: load_canadian_shapefile(
            "named_region_shapefiles/canada/lfed000a21a_e.zip",
            COUNTRIES,
            SUBNATIONAL_REGIONS,
        ),
        filter=lambda x: True,
    ),
    identifiers=Identifiers(
        additional_columns_computer={"scgc": lambda row: row.FEDUID}
    ),
    naming=Naming(
        shortname_extractor=lambda row: row.FEDENAME,
        longname_extractor=lambda row: row.FEDENAME
        + " (Riding), "
        + pruid_to_province[row["PRUID"]],
    ),
    metadata=canadian_census_metadata(
        "CA Riding",
        "Political",
        abbreviation="RDNG",
        data_credit=dict(
            linkText="Canadian Census",
            link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lfed000a21a_e.zip",
        ),
        include_in_syau=True,
        wikidata_sourcer=SimpleWikidataSourcer("wdt:P4565", "scgc"),
    ),
    universe_provider=canada_domestic_provider(),
    source_countries=InCountry("Canada"),
)
