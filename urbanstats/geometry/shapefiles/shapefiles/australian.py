from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import australia_domestic_provider

PROCESSED = "named_region_shapefiles/australia/data/processed"

# ABS includes rows for people it cannot place, e.g. "No usual address (NSW)"
NOT_PLACES = (
    "Not in any",
    "No usual address",
    "Migratory",
    "Outside Australia",
    "Remainder of State/Territory",
)

# SUAs and postcodes can span states, so their layers have no state column
LAYERS_WITHOUT_STATE = ("SUA", "POA")


# Wikidata's "Australian Statistical Geography 2021 ID" is the layer's code with its name in front,
# e.g. LGA31000. It only covers some layers.
ASGS_2021_ID = SimpleWikidataSourcer("wdt:P10112", "asgs_id")


def abs_shapefile(
    *,
    layer,
    name_column,
    kind,
    type_name,
    type_category,
    abbreviation,
    version,
    in_wikidata=False,
    include_in_syau=False,
    gridded_data=False,
):
    """`kind` is what the region is called after its name, e.g. "LGA" in "Brisbane LGA"."""
    # pylint: disable=too-many-arguments
    shortname = column(name_column) + f" {kind}"
    state = "" if layer in LAYERS_WITHOUT_STATE else ", " + column("STE_NAME21")

    return make_shapefile(
        geometry_key=f"australian_{layer.lower()}_{version}",
        path=f"{PROCESSED}/{layer}_2021_AUST_SHP.zip",
        shortname_extractor=shortname,
        cleanname_extractor=column(name_column),
        longname_extractor=shortname + state + ", Australia",
        additional_columns_computer=(
            {"asgs_id": layer + column(f"{layer}_CODE21")} if in_wikidata else {}
        ),
        filter=lambda row: not row[name_column].startswith(NOT_PLACES),
        meta=dict(type=type_name, source="ABS", type_category=type_category),
        does_overlap_self=False,
        special_data_sources=["international_gridded_data"] if gridded_data else [],
        universe_provider=australia_domestic_provider(),
        source_countries=InCountry("Australia"),
        abbreviation=abbreviation,
        data_credit=dict(
            linkText="Australian Bureau of Statistics",
            link="https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files",  # pylint: disable=line-too-long
        ),
        include_in_syau=include_in_syau,
        wikidata_sourcer=ASGS_2021_ID if in_wikidata else None,
    )


AUSTRALIAN_LGAS = abs_shapefile(
    layer="LGA",
    name_column="LGA_NAME21",
    kind="LGA",
    type_name="AU LGA",
    type_category="US Subdivision",
    abbreviation="AULG",
    version=2,
    in_wikidata=True,
    include_in_syau=True,
    gridded_data=True,
)
AUSTRALIAN_SA2S = abs_shapefile(
    layer="SA2",
    name_column="SA2_NAME21",
    kind="SA2",
    type_name="AU SA2",
    type_category="Census",
    abbreviation="AUS2",
    version=1,
)
AUSTRALIAN_SUAS = abs_shapefile(
    layer="SUA",
    name_column="SUA_NAME21",
    kind="SUA",
    type_name="AU Significant Urban Area",
    type_category="International City",
    abbreviation="AUSU",
    version=2,
    include_in_syau=True,
    gridded_data=True,
)
AUSTRALIAN_UCLS = abs_shapefile(
    layer="UCL",
    name_column="UCL_NAME21",
    kind="UCL",
    type_name="AU UCL",
    type_category="International City",
    abbreviation="AUUC",
    version=3,
    in_wikidata=True,
    include_in_syau=True,
)
AUSTRALIAN_SALS = abs_shapefile(
    layer="SAL",
    name_column="SAL_NAME21",
    kind="Suburb",
    type_name="AU Suburb",
    type_category="International City",
    abbreviation="AUSB",
    version=2,
    in_wikidata=True,
    include_in_syau=True,
)
AUSTRALIAN_POSTCODES = abs_shapefile(
    layer="POA",
    name_column="POA_NAME21",
    kind="Postcode",
    type_name="AU Postcode",
    type_category="Small",
    abbreviation="AUPC",
    version=1,
)
AUSTRALIAN_FEDERAL_ELECTORATES = abs_shapefile(
    layer="CED",
    name_column="CED_NAME21",
    kind="Division",
    type_name="AU Federal Electorate",
    type_category="Political",
    abbreviation="AUFE",
    version=2,
    in_wikidata=True,
    include_in_syau=True,
    gridded_data=True,
)
AUSTRALIAN_STATE_LOWER_HOUSE_DISTRICTS = abs_shapefile(
    layer="SEDL",
    name_column="SED_NAME21",
    kind="District",
    type_name="AU State Lower House District",
    type_category="Political",
    abbreviation="AUSD",
    version=1,
    gridded_data=True,
)
AUSTRALIAN_STATE_UPPER_HOUSE_REGIONS = abs_shapefile(
    layer="SEDU",
    name_column="SED_NAME21",
    kind="Region",
    type_name="AU State Upper House Region",
    type_category="Political",
    abbreviation="AUSR",
    version=1,
    gridded_data=True,
)
