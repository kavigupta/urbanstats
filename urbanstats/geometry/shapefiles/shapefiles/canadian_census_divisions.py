from dataclasses import dataclass

from urbanstats.data.wikipedia.wikidata_sourcer import CANADA_WIKIDATA_SOURCER
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.row_functions import Lookup, RowFunction, column
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


@dataclass(frozen=True)
class CensusDivisionName(RowFunction):
    """The name, followed by its type from types unless it is just "Division N"."""

    name_column: str
    type_column: str
    types: dict

    def __call__(self, row):
        name = row[self.name_column]
        name = name.replace("  ", " ")
        if not name.startswith("Division"):
            name += " " + self.types[row[self.type_column]]
        return name


CENSUS_DIVISION_LONGNAME = (
    CensusDivisionName("CDNAME", "CDTYPE", cdtype)
    + ", "
    + Lookup(column("PRUID"), pruid_to_province)
)


CANADIAN_CENSUS_DIVISIONS = make_shapefile(
    geometry_key="canadian_census_divisions_3",
    path=lambda countries, subnationals: load_canadian_shapefile(
        "named_region_shapefiles/canada/lcd_000a21a_e.zip", countries, subnationals
    ),
    path_inputs=(COUNTRIES.names, SUBNATIONAL_REGIONS.names),
    shortname_extractor=CensusDivisionName("CDNAME", "CDTYPE", cdtype),
    cleanname_extractor=(column("CDNAME")).replace("  ", " "),
    longname_extractor=CENSUS_DIVISION_LONGNAME,
    additional_columns_computer={"scgc": column("CDUID")},
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
