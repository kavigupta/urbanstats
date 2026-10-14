from urbanstats.data.wikipedia.wikidata_sourcer import CANADA_WIKIDATA_SOURCER
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Identifiers,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import canada_domestic_provider

cdtype = {
    "CDR": "CDR",
    "CT": "County",
    "CTY": "County",
    "DIS": "District",
    "DM": "District municipality",
    "MRC": "CRM",
    "RD": "Regional district",
    "REG": "Region",
    "RM": "Regional municipality",
    "TÉ": "Territory",
    "TER": "Territory",
    "UC": "United counties",
}


def subdivision_name(row):
    name = row.CDNAME
    name = name.replace("  ", " ")
    if not name.startswith("Division"):
        name += " " + cdtype[row.CDTYPE]
    return name


def subdivision_longname(row):
    return subdivision_name(row) + ", " + pruid_to_province[row["PRUID"]]


CANADIAN_CENSUS_DIVISIONS = Shapefile(
    geometry=Geometry(
        key="canadian_census_divisions_3",
        path=lambda: load_canadian_shapefile(
            "named_region_shapefiles/canada/lcd_000a21a_e.zip",
            COUNTRIES,
            SUBNATIONAL_REGIONS,
        ),
        filter=lambda x: True,
    ),
    identifiers=Identifiers(
        additional_columns_computer={"scgc": lambda row: row.CDUID},
    ),
    naming=Naming(
        shortname_extractor=subdivision_name,
        longname_extractor=subdivision_longname,
        cleanname_extractor=lambda row: row.CDNAME.replace("  ", " "),
    ),
    metadata=Metadata(
        meta=dict(
            type="CA Census Division", source="StatCan", type_category="US Subdivision"
        ),
        does_overlap_self=False,
        abbreviation="CDIV",
        data_credit=dict(
            linkText="Canadian Census",
            link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcd_000b21a_e.zip",
        ),
        include_in_syau=True,
        wikidata_sourcer=CANADA_WIKIDATA_SOURCER,
    ),
    universe_provider=canada_domestic_provider(),
    source_countries=InCountry("Canada"),
)
