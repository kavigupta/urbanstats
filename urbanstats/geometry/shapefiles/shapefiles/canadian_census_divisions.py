from urbanstats.data.wikipedia.wikidata_sourcer import CANADA_WIKIDATA_SOURCER
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
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


CANADIAN_CENSUS_DIVISIONS = make_shapefile(
    hash_key="canadian_census_divisions_3",
    path=lambda: load_canadian_shapefile(
        "named_region_shapefiles/canada/lcd_000a21a_e.zip",
        COUNTRIES,
        SUBNATIONAL_REGIONS,
    ),
    shortname_extractor=subdivision_name,
    cleanname_extractor=lambda row: row.CDNAME.replace("  ", " "),
    longname_extractor=subdivision_longname,
    additional_columns_computer={"scgc": lambda row: row.CDUID},
    filter=lambda x: True,
    meta=dict(
        type="CA Census Division", source="StatCan", type_category="US Subdivision"
    ),
    does_overlap_self=False,
    universe_provider=canada_domestic_provider(),
    source_countries=InCountry("Canada"),
    abbreviation="CDIV",
    data_credit=dict(
        linkText="Canadian Census",
        link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcd_000b21a_e.zip",
    ),
    include_in_syau=True,
    wikidata_sourcer=CANADA_WIKIDATA_SOURCER,
)
