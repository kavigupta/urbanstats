import re
from dataclasses import dataclass

from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.row_functions import RowFunction, column
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

STATES = ("NSW", "Vic.", "Qld", "SA", "WA", "Tas.", "NT", "ACT", "OT")

# other names of the place, e.g. Gunbalanya (Oenpelli)
ALTERNATIVE_NAMES = (
    "Keeling",
    "Oenpelli",
    "Nguiu",
    "Darnley",
    "Yam",
    "Murray",
    "Ernabella",
    "Fregon",
    "La Grange",
    "One Arm Point",
    "Ltyentye Purte",
    "Beswick",
    "Finke",
    "Docker River",
    "Daly River",
    "Palumpa",
    "Mungoorbada",
    "Kintore",
)


def parse_abs_name(name, layer):
    """
    The name without the parenthesized parts our longnames make redundant, and whether it is marked
    as a Locality.
    """
    has_state = layer not in LAYERS_WITHOUT_STATE
    is_locality = False
    kept = []
    for piece in re.split(r"( \([^)]*\))", name):
        match = re.fullmatch(r" \((.*)\)", piece)
        if match is None:
            kept.append(piece)
            continue
        part = match.group(1)
        region, _, state = part.rpartition(" - ")
        if part in STATES:
            # repeats in another state, e.g. Ashfield (NSW)
            assert has_state, name
        elif region and state in STATES:
            # repeats in the same state, e.g. Enmore (Inner West - NSW)
            assert has_state, name
            kept.append(f" ({region})")
        elif part == "L":
            # a Locality, a UCL with 200 to 999 people
            assert layer == "UCL", name
            is_locality = True
        elif part.endswith(" Part"):
            # a UCL split by a state border, e.g. Albury - Wodonga (Albury Part)
            assert layer == "UCL", name
            kept.append(piece)
        elif part in ALTERNATIVE_NAMES:
            kept.append(piece)
        elif part in ("North", "South", "East", "West"):
            # e.g. Perth (North) - Highgate
            assert layer == "SA2", name
            kept.append(piece)
        else:
            raise ValueError(f"Unrecognized parenthesized part in ABS name {name!r}")
    return "".join(kept), is_locality


@dataclass(frozen=True)
class AbsName(RowFunction):
    inner: RowFunction
    layer: str

    def __call__(self, row):
        return parse_abs_name(self.inner(row), self.layer)[0]


@dataclass(frozen=True)
class UclKind(RowFunction):
    inner: RowFunction

    def __call__(self, row):
        _, is_locality = parse_abs_name(self.inner(row), "UCL")
        return "Locality [UCL]" if is_locality else "Urban Centre [UCL]"


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
    """
    `kind` is what the region is called after its name, e.g. "LGA" in "Brisbane LGA", or None, or a
    RowFunction if it varies by region.
    """
    # pylint: disable=too-many-arguments
    name = AbsName(column(name_column), layer)
    shortname = name
    if kind is not None:
        shortname = shortname + " " + kind

    state = "" if layer in LAYERS_WITHOUT_STATE else ", " + column("STE_NAME21")

    return make_shapefile(
        geometry_key=f"australian_{layer.lower()}_{version}",
        path=f"{PROCESSED}/{layer}_2021_AUST_SHP.zip",
        shortname_extractor=shortname,
        cleanname_extractor=name,
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
    abbreviation="LGA",
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
    type_category="Census",
    abbreviation="SUA",
    version=2,
    include_in_syau=True,
    gridded_data=True,
)
AUSTRALIAN_UCLS = abs_shapefile(
    layer="UCL",
    name_column="UCL_NAME21",
    kind=UclKind(column("UCL_NAME21")),
    type_name="AU UCL",
    type_category="Census",
    abbreviation="UCL",
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
    abbreviation="NBHD",
    version=2,
    in_wikidata=True,
    include_in_syau=True,
)
AUSTRALIAN_POSTCODES = abs_shapefile(
    layer="POA",
    name_column="POA_NAME21",
    kind=None,
    type_name="AU Postcode",
    type_category="Small",
    abbreviation="ZIP",
    version=2,
)
AUSTRALIAN_FEDERAL_ELECTORATES = abs_shapefile(
    layer="CED",
    name_column="CED_NAME21",
    kind="Division",
    type_name="AU Federal Electorate",
    type_category="Political",
    abbreviation="FDIV",
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
    abbreviation="STHD",
    version=1,
    gridded_data=True,
)
AUSTRALIAN_STATE_UPPER_HOUSE_REGIONS = abs_shapefile(
    layer="SEDU",
    name_column="SED_NAME21",
    kind="Region",
    type_name="AU State Upper House Region",
    type_category="Political",
    abbreviation="STSD",
    version=1,
    gridded_data=True,
)
