from collections import defaultdict
from dataclasses import dataclass
import math
from typing import List

import pandas as pd
from permacache import permacache, stable_hash
import tqdm.auto as tqdm
import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.historical_congressional import to_year
from urbanstats.metadata.metadata_columns import (
    MetadataColumnProvider,
    MetadataColumnResult,
)


TERM_START_YEARS = [to_year(congress_number) for congress_number in range(1, 120)]


def key_for_term_start_year(term_start_year: int) -> str:
    return f"congressional_representatives_{term_start_year}"


@dataclass
class Representative:
    name: str
    wikidata_id: str
    wikipedia_page: str
    party: str


def district_shortname_to_state_and_district(shortname: str):
    # `shortname` is formatted as "ST-DD (YYYY)" for congressional districts.
    district_key = shortname.split(" ")[0]
    state_abbr, district = district_key.split("-", 1)
    return state_abbr, normalize_district(district)


def normalize_district(district):
    district = str(district).strip()
    if not district:
        return "AL"
    if district.upper() in {"AL", "AT LARGE", "AT-LARGE"}:
        return "AL"
    if district.isdigit():
        return f"{int(district):02d}"
    return district


def clean_optional_str(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return str(value)


def to_bool(v):
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() in {"true", "1", "yes"}


@permacache(
    "urbanstats/metadata/congressional_representatives/load_representatives_by_district",
    key_function=dict(version=str),
)
def load_representatives_by_district(*, version):
    representatives_url = (
        "https://raw.githubusercontent.com/kavigupta/"
        f"all-congressional-representatives/{version}/representatives.csv"
    )
    table = pd.read_csv(representatives_url)

    state_name_to_abbr = {state.name: state.abbr for state in us.states.STATES + [us.states.DC]}
    table["state_abbr"] = table["state"].map(state_name_to_abbr)
    table["district_norm"] = table["district"].map(normalize_district)
    table["term_start_year"] = table["term"].astype(int).map(to_year)

    result = defaultdict(lambda: defaultdict(list))
    for row in table.itertuples(index=False):
        if row.state_abbr is None:
            continue
        if to_bool(row.vacant):
            continue
        if isinstance(row.representative_name, float) and math.isnan(
            row.representative_name
        ):
            continue
        result[(row.state_abbr, row.district_norm)][row.term_start_year].append(
            Representative(
                name=clean_optional_str(row.representative_name),
                wikidata_id="",
                wikipedia_page=clean_optional_str(row.representative_wikipedia_page),
                party=clean_optional_str(row.party),
            )
        )

    return {
        district_key: dict(sorted(representatives_by_year.items(), key=lambda x: x[0]))
        for district_key, representatives_by_year in result.items()
    }


def representatives_for_district(
    state_abbr: str, district: str, start_year, end_year, *, representatives_csv_version
) -> List[Representative]:
    representatives = load_representatives_by_district(version=representatives_csv_version)
    district_representatives = representatives.get((state_abbr, district), {})
    return {
        year: reps
        for year, reps in district_representatives.items()
        if start_year <= year <= end_year
    }


@permacache(
    "urbanstats/metadata/congressional_representatives/compute_representatives_for_shapefile",
    key_function=dict(sf=lambda x: x.hash_key, shortnames=stable_hash, start_dates=stable_hash, end_dates=stable_hash),
)
def compute_representatives_for_shapefile(
    sf: Shapefile, shortnames, start_dates, end_dates, *, representatives_csv_version
) -> List[dict]:
    table = sf.load_file()
    if not (len(shortnames) == len(start_dates) == len(end_dates) == len(table)):
        raise ValueError(
            "Expected shortnames/start_dates/end_dates to match shapefile size"
        )
    results = []
    pbar = tqdm.tqdm(total=len(table), desc="Computing representatives for districts")
    for (_, row), shortname, start_date, end_date in zip(
        table.iterrows(), shortnames, start_dates, end_dates
    ):
        pbar.set_postfix({"current_district": row["longname"]})
        state_abbr, district = district_shortname_to_state_and_district(shortname)
        results.append(
            representatives_for_district(
                state_abbr,
                district,
                start_date,
                end_date,
                representatives_csv_version=representatives_csv_version,
            )
        )
        pbar.update(1)
    pbar.close()
    return results


class CongressionalRepresentativesMetadataProvider(MetadataColumnProvider):
    representatives_csv_version = "75d536eb0406ed3f9c4e20afa34d9f0c77948d57"
    version = f"congressional_representatives_structured_{representatives_csv_version}_v2"

    def compute_metadata_columns(self, *, shapefile, shapefile_table):
        if "congressional_representatives" not in shapefile.special_data_sources:
            return []
        representatives_by_row = compute_representatives_for_shapefile(
            shapefile,
            shapefile_table.shortname.tolist(),
            shapefile_table.start_date.tolist(),
            shapefile_table.end_date.tolist(),
            representatives_csv_version=self.representatives_csv_version,
        )
        return [
            MetadataColumnResult(
                key=key_for_term_start_year(term_start_year),
                values=[x.get(term_start_year, []) for x in representatives_by_row],
            )
            for term_start_year in TERM_START_YEARS
        ]
