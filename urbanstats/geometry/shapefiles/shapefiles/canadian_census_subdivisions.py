from permacache import permacache
from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.canadian_census_divisions import (
    CANADIAN_CENSUS_DIVISIONS,
    subdivision_longname,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.universe.universe_provider.constants import canada_domestic_provider

cdtype = {
    "C": "City",
    "CC": "Chartered Community",
    "CÉ": "Cité",
    "CG": "Community Government",
    "CM": "County",
    "CN": "Crown Colony",
    "COM": "Community",
    "CT": "Canton",
    "CU": "Cantons Unis",
    "CV": "City",
    "CY": "City",
    "DM": "District Municipality",
    "FD": "Fire District",
    "HAM": "Hamlet",
    "ID": "Improvement District",
    "IGD": "Indian Government District",
    "IM": "Island Municipality",
    "IRI": "Indian Reserve",
    "LGD": "Local Government District",
    "LOT": "Township and Royalty",
    "M": "Municipality",
    "MD": "Municipal District",
    "MÉ": "Municipalité",
    "MRM": "Regional Municipality",
    "MU": "Municipality",
    "NH": "Northern Hamlet",
    "NL": "Nisga'a Land",
    "NO": "Unorganized",
    "NV": "Northern Village",
    "NVL": "Nisga'a Village",
    "P": "Parish",
    "PE": "Paroisse",
    "RCR": "Rural Community",
    "RDA": "Regional District Electoral Area",
    "RG": "Region",
    "RGM": "Regional Municipality",
    "RM": "Rural Municipality",
    "RMU": "Resort Municipality",
    "RV": "Resort Village",
    "SA": "Special Area",
    "SC": "Subdivision of County Municipality",
    "SÉ": "Settlement",
    "S-É": "Indian Settlement",
    "SET": "Settlement",
    "SG": "Self-Government",
    "SM": "Specialized Municipality",
    "SNO": "Subdivision of Unorganized",
    "SV": "Summer Village",
    "T": "Town",
    "TC": "Terres réservées aux Cris",
    "TI": "Terre Inuite",
    "TK": "Terres réservées aux Naskapis",
    "TL": "Teslin Land",
    "TP": "Township",
    "TV": "Town",
    "V": "Ville",
    "VC": "Village Cri",
    "VK": "Village Naskapi",
    "VL": "Village",
    "VN": "Village Nordique",
    # Just Eeyou Istchee Baie-James
    "GR": "Municipality",
    # Just Tsawwassen Town
    "TWL": "Town",
    # Just Sliammon 1
    "TAL": "First Nation",
}


@permacache(
    "urbanstats/geometry/shapefiles/shapefiles/canadian_census_subdivisions/load_csd_shapefile",
)
def load_csd_shapefile():
    data = load_canadian_shapefile(
        "named_region_shapefiles/canada/lcsd000b21a_e.zip",
        COUNTRIES,
        SUBNATIONAL_REGIONS,
    )
    cd = CANADIAN_CENSUS_DIVISIONS.path()
    cdid_to_name = dict(zip(cd.CDUID, cd.apply(subdivision_longname, axis=1)))
    data["division_longname"] = data.CSDUID.apply(lambda x: cdid_to_name[x[:4]])
    return data


def census_subdivision_name(row):
    name = row.CSDNAME
    name = name.replace("  ", " ")
    if not name.startswith("Division"):
        name += " " + cdtype[row.CSDTYPE]
    return name


CANADIAN_CENSUS_SUBDIVISIONS = Shapefile(
    hash_key="canadian_census_subdivisions_2",
    path=load_csd_shapefile,
    shortname_extractor=census_subdivision_name,
    longname_extractor=lambda row: census_subdivision_name(row)
    + ", "
    + row.division_longname,
    filter=lambda x: True,
    meta=dict(
        type="Canadian Census Subdivision",
        source="StatCan",
        type_category="Census",
    ),
    universe_provider=canada_domestic_provider(),
    subset_masks={"Canada": SelfSubset()},
)
