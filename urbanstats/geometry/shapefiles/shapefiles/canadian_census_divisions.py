from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
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
    hash_key="canadian_census_divisions_3",
    path=lambda: load_canadian_shapefile(
        "named_region_shapefiles/canada/lcd_000a21a_e.zip",
        COUNTRIES,
        SUBNATIONAL_REGIONS,
    ),
    shortname_extractor=subdivision_name,
    longname_extractor=subdivision_longname,
    filter=lambda x: True,
    meta=dict(
        type="Canadian Census Division", source="StatCan", type_category="US Subdivision"
    ),
    universe_provider=canada_domestic_provider(),
    subset_masks={"Canada": SelfSubset()},
)
