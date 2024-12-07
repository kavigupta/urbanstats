from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province_abbr,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.universe.universe_provider.constants import canada_domestic_provider


def load_cmas():
    data = load_canadian_shapefile(
        "named_region_shapefiles/canada/lcma000a21a_e.zip",
        COUNTRIES,
        SUBNATIONAL_REGIONS,
    ).copy()

    data["PRUID"] = data["PRUID"].apply(lambda x: [x])

    to_merge = [
        "Ottawa - Gatineau (partie du Québec / Quebec part)",
        "Ottawa - Gatineau (Ontario part / partie de l'Ontario)",
    ]

    mask = data["CMANAME"].apply(lambda x: x in to_merge)
    merge_rows = data[[x for x in mask]].copy()
    data = data[[x for x in ~mask]].copy()

    merge_row = merge_rows.dissolve()
    merge_row = merge_row.iloc[0]

    merge_row["CMANAME"] = "Ottawa - Gatineau"
    merge_row["PRUID"] = sorted([x for xs in merge_rows["PRUID"] for x in xs])

    data = data.append(merge_row)

    return data


def shortname_extractor(row):
    return row["CMANAME"] + " CMA"


def longname_extractor(row):
    sh = shortname_extractor(row)
    provinces = [pruid_to_province_abbr[x] for x in row["PRUID"]]
    provinces_render = "-".join(provinces)
    return f"{sh}, {provinces_render}, Canada"


CANADIAN_CENSUS_METROPOLITAN_AREAS = Shapefile(
    hash_key="census_cmas",
    path=load_cmas,
    shortname_extractor=shortname_extractor,
    longname_extractor=longname_extractor,
    filter=lambda x: True,
    meta=dict(
        type="Canadian CMA",
        source="StatCan",
        type_category="Census",
    ),
    universe_provider=canada_domestic_provider(),
    subset_masks={"Canada": SelfSubset()},
)
