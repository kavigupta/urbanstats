from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import canada_domestic_provider

pruid_to_province = {
    "48": "Alberta, Canada",
    "59": "British Columbia, Canada",
    "46": "Manitoba, Canada",
    "13": "New Brunswick, Canada",
    "10": "Newfoundland and Labrador, Canada",
    "61": "Northwest Territories, Canada",
    "12": "Nova Scotia, Canada",
    "62": "Nunavut, Canada",
    "35": "Ontario, Canada",
    "11": "Prince Edward Island, Canada",
    "24": "Quebec, Canada",
    "47": "Saskatchewan, Canada",
    "60": "Yukon, Canada",
}

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
    hash_key="canadian_census_divisions_1",
    path="named_region_shapefiles/canada/lcd_000a21a_e.zip",
    shortname_extractor=subdivision_name,
    longname_extractor=subdivision_longname,
    filter=lambda x: True,
    meta=dict(
        type="Census Division", source="StatCan", type_category="Canadian Subdivision"
    ),
    universe_provider=canada_domestic_provider(),
    subset_masks={"Canada": SelfSubset()},
)
