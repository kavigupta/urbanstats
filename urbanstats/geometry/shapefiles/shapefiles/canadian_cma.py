from dataclasses import dataclass

import pandas as pd

from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province_abbr,
)
from urbanstats.geometry.shapefiles.row_functions import RowFunction, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
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
    merge_rows = data[list(mask)].copy()
    data = data[list(~mask)].copy()

    merge_row = merge_rows.dissolve()
    merge_row = merge_row.iloc[0]

    merge_row["CMANAME"] = "Ottawa - Gatineau"
    merge_row["PRUID"] = sorted([x for xs in merge_rows["PRUID"] for x in xs])

    data = pd.concat([data, merge_row.to_frame().T], ignore_index=True)

    return data


@dataclass(frozen=True)
class ProvinceAbbreviations(RowFunction):
    """The abbreviations of the provinces whose PRUIDs inner lists, joined by "-"."""

    inner: RowFunction

    def __call__(self, row):
        return "-".join(pruid_to_province_abbr[x] for x in self.inner(row))


def canadian_census_kwargs(typ, category):
    return dict(
        filter=lambda x: True,
        meta=dict(
            type=typ,
            source="StatCan",
            type_category=category,
        ),
        does_overlap_self=False,
        universe_provider=canada_domestic_provider(),
        source_countries=InCountry("Canada"),
    )


CANADIAN_CENSUS_METROPOLITAN_AREAS = make_shapefile(
    hash_key="census_cmas_2",
    path=load_cmas,
    shortname_extractor=column("CMANAME") + " CMA",
    cleanname_extractor=column("CMANAME"),
    longname_extractor=column("CMANAME")
    + " CMA, "
    + ProvinceAbbreviations(column("PRUID"))
    + ", Canada",
    additional_columns_computer={
        "scgc": column("CMAUID"),
    },
    **canadian_census_kwargs("CA CMA", "Census"),
    abbreviation="CMA",
    data_credit=dict(
        linkText="Canadian Census",
        link="https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcma000a21a_e.zip",
    ),
    include_in_syau=True,
    wikidata_sourcer=None,
)
