from permacache import permacache, stable_hash

from urbanstats.data.wikipedia.wikidata_sourcer import CANADA_WIKIDATA_SOURCER
from urbanstats.geometry.shapefiles.load_canada_shapefile import load_canadian_shapefile
from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefile import join_layers, make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.canadian_census_divisions import (
    CANADIAN_CENSUS_DIVISIONS,
    CensusDivisionName,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
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
    key_function=dict(
        countries=stable_hash,
        subnationals=stable_hash,
        division_names=stable_hash,
        division_identified=stable_hash,
    ),
)
def load_csd_shapefile(countries, subnationals, division_names, division_identified):
    data = load_canadian_shapefile(
        "named_region_shapefiles/canada/lcsd000b21a_e.zip", countries, subnationals
    )
    cd = join_layers(division_names, division_identified)
    cdid_to_name = dict(zip(cd.scgc, cd.longname))
    data["division_longname"] = data.CSDUID.apply(lambda x: cdid_to_name[x[:4]])
    return data


CANADIAN_CENSUS_SUBDIVISIONS = make_shapefile(
    geometry_key="canadian_census_subdivisions_3",
    path=load_csd_shapefile,
    path_inputs=(
        COUNTRIES.names,
        SUBNATIONAL_REGIONS.names,
        CANADIAN_CENSUS_DIVISIONS.names,
        CANADIAN_CENSUS_DIVISIONS.identified,
    ),
    shortname_extractor=CensusDivisionName("CSDNAME", "CSDTYPE", cdtype),
    cleanname_extractor=(column("CSDNAME")).replace("  ", " "),
    longname_extractor=CensusDivisionName("CSDNAME", "CSDTYPE", cdtype)
    + ", "
    + column("division_longname"),
    additional_columns_computer={"scgc": column("CSDUID")},
    filter=lambda x: True,
    meta=dict(
        type="CA Census Subdivision",
        source="StatCan",
        type_category="Census",
    ),
    does_overlap_self=False,
    universe_provider=canada_domestic_provider(),
    source_countries=InCountry("Canada"),
    abbreviation="CSUB",
    data_credit=dict(
        linkText="Canadian Census",
        link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000a21a_e.zip",
    ),
    include_in_syau=True,
    wikidata_sourcer=CANADA_WIKIDATA_SOURCER,
)
